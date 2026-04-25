import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { SquareMousePointer, Search, X } from "lucide-react";
import type { DocEntry, DocRef } from "../doc/build-doc-index";
import type {
  MainToGraph,
  GraphToMain,
  PropTypesMap,
} from "../inspector/channel";
import { RFM_CHANNEL } from "../inspector/channel";
import type { RfmRoute } from "../inspector/types";
import {
  buildUnifiedTree,
  flattenUnifiedEntries,
  UnifiedTreeView,
} from "../inspector/UnifiedTreeView";
import { FullGraph, ROUTE_PREFIX } from "./FullGraph";
import { WorkspaceDetail } from "./WorkspaceDetail";
import { getActiveRoutesForPath } from "./workspace-detail-model";
import inspectorCss from "../inspector/inspector.compiled.css?raw";
import type { RfmServerComponent } from "../inspector/types";

const STATIC_PREFIX = "static:";
const RFM_STATIC_NAMES = new Set([
  "ReactFlowMap",
  "FlowmapProvider",
  "ComponentOverlay",
]);

function selectionExists(
  selectedId: string,
  entries: DocEntry[],
): boolean {
  if (!selectedId) return true;
  return entries.some((entry) => entry.symbolId === selectedId);
}

function formatRouteBreadcrumb(
  currentPath: string,
  activeRoutes: RfmRoute[],
): string {
  if (activeRoutes.length === 0) return currentPath;
  const chain = [...activeRoutes].reverse().map((route) => route.componentName);
  return `${currentPath} | ${chain.join(" > ")}`;
}

function filterStaticChildren(
  children: RfmServerComponent[] | undefined,
): RfmServerComponent[] {
  return (children ?? [])
    .filter(
      (child) =>
        !RFM_STATIC_NAMES.has(child.componentName) &&
        !child.filePath.includes("react-flowmap"),
    )
    .map((child) => ({
      ...child,
      ...(child.children
        ? { children: filterStaticChildren(child.children) }
        : {}),
    }));
}

function toRef(entry: DocEntry): DocRef {
  return {
    symbolId: entry.symbolId,
    name: entry.name,
    filePath: entry.filePath,
  };
}

function cloneEntry(entry: DocEntry): DocEntry {
  return {
    ...entry,
    executionKind: entry.executionKind ?? "live",
    graphNodeKind: entry.graphNodeKind ?? "component",
    role: entry.role ?? "component",
    source: entry.source ?? "runtime",
    renders: [...entry.renders],
    renderedBy: [...entry.renderedBy],
    uses: [...entry.uses],
    usedBy: [...entry.usedBy],
    apiCalls: [...entry.apiCalls],
  };
}

function findEntryByFileAndName(
  entries: Iterable<DocEntry>,
  filePath: string,
  name: string,
): DocEntry | null {
  for (const entry of entries) {
    if (entry.filePath === filePath && entry.name === name) return entry;
  }
  return null;
}

function attachRenderEdge(
  entryById: Map<string, DocEntry>,
  fromId: string,
  toId: string,
) {
  if (fromId === toId) return;
  const from = entryById.get(fromId);
  const to = entryById.get(toId);
  if (!from || !to) return;

  if (!from.renders.some((ref) => ref.symbolId === to.symbolId)) {
    from.renders.push(toRef(to));
  }
  if (!to.renderedBy.some((ref) => ref.symbolId === from.symbolId)) {
    to.renderedBy.push(toRef(from));
  }
}

function entryIdentity(entry: DocEntry): string {
  return `${entry.filePath}#${entry.name}`;
}

function preferredEntry(a: DocEntry, b: DocEntry): DocEntry {
  const score = (entry: DocEntry): number => {
    if (entry.source === "runtime") return 0;
    if (entry.source === "route" && entry.executionKind === "live") return 1;
    if (entry.source === "route") return 2;
    if (entry.executionKind === "live") return 3;
    return 4;
  };

  return score(a) <= score(b) ? a : b;
}

function mergeGraphEntries(entries: DocEntry[]): DocEntry[] {
  if (entries.length <= 1) return entries;

  const grouped = new Map<string, DocEntry[]>();
  for (const entry of entries) {
    const key = entryIdentity(entry);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const canonicalByOldId = new Map<string, string>();
  const mergedSeeds = new Map<string, DocEntry>();

  for (const group of grouped.values()) {
    let canonical = group[0]!;
    for (const entry of group.slice(1)) {
      canonical = preferredEntry(canonical, entry);
    }

    const hasRoute = group.some((entry) => entry.graphNodeKind === "route");
    const hasLive = group.some((entry) => entry.executionKind === "live");
    const role =
      group.find((entry) => entry.role && entry.role !== "component")?.role ??
      canonical.role ??
      "component";

    const source = hasRoute
      ? "route"
      : group.some((entry) => entry.source === "runtime")
        ? "runtime"
        : "static-import";

    const merged: DocEntry = {
      ...canonical,
      executionKind: hasLive ? "live" : "static",
      graphNodeKind: hasRoute ? "route" : canonical.graphNodeKind ?? "component",
      role,
      source,
      renders: [],
      renderedBy: [],
      uses: [],
      usedBy: [],
      apiCalls: [],
    };

    mergedSeeds.set(merged.symbolId, merged);
    for (const entry of group) {
      canonicalByOldId.set(entry.symbolId, merged.symbolId);
    }
  }

  const appendRefs = (
    refs: DocRef[],
    target: DocRef[],
    selfId: string,
    mergedById: Map<string, DocEntry>,
  ) => {
    for (const ref of refs) {
      const mappedId = canonicalByOldId.get(ref.symbolId) ?? ref.symbolId;
      if (mappedId === selfId) continue;
      const mappedEntry = mergedById.get(mappedId);
      if (!mappedEntry) continue;
      if (!target.some((existing) => existing.symbolId === mappedId)) {
        target.push(toRef(mappedEntry));
      }
    }
  };

  const mergedById = new Map(mergedSeeds);
  for (const group of grouped.values()) {
    const canonicalId = canonicalByOldId.get(group[0]!.symbolId);
    if (!canonicalId) continue;
    const merged = mergedById.get(canonicalId);
    if (!merged) continue;

    for (const entry of group) {
      appendRefs(entry.renders, merged.renders, merged.symbolId, mergedById);
      appendRefs(
        entry.renderedBy,
        merged.renderedBy,
        merged.symbolId,
        mergedById,
      );
      appendRefs(entry.uses, merged.uses, merged.symbolId, mergedById);
      appendRefs(entry.usedBy, merged.usedBy, merged.symbolId, mergedById);

      for (const apiCall of entry.apiCalls) {
        if (!merged.apiCalls.some((existing) => existing.apiId === apiCall.apiId)) {
          merged.apiCalls.push(apiCall);
        }
      }
    }
  }

  return [...mergedById.values()];
}

function buildHybridGraphEntries(
  runtimeEntries: DocEntry[],
  activeRoutes: RfmRoute[],
): DocEntry[] {
  const entryById = new Map<string, DocEntry>(
    runtimeEntries.map((entry) => [entry.symbolId, cloneEntry(entry)]),
  );

  function ensureSyntheticEntry(entry: DocEntry): DocEntry {
    const existing = entryById.get(entry.symbolId);
    if (existing) return existing;
    entryById.set(entry.symbolId, entry);
    return entry;
  }

  function resolveRouteEntry(route: RfmRoute): DocEntry {
    const runtimeMatch =
      route.executionKind === "live"
        ? findEntryByFileAndName(
            entryById.values(),
            route.filePath,
            route.componentName,
          )
        : null;

    if (runtimeMatch) {
      runtimeMatch.graphNodeKind = "route";
      runtimeMatch.role = route.type;
      runtimeMatch.source = "route";
      runtimeMatch.executionKind = "live";
      return runtimeMatch;
    }

    return ensureSyntheticEntry({
      symbolId: ROUTE_PREFIX + route.filePath,
      name: route.componentName,
      filePath: route.filePath,
      category: "component",
      executionKind: route.executionKind,
      graphNodeKind: "route",
      role: route.type,
      source: "route",
      renders: [],
      renderedBy: [],
      uses: [],
      usedBy: [],
      apiCalls: [],
    });
  }

  function resolveImportEntry(node: RfmServerComponent): DocEntry {
    const runtimeMatch =
      node.executionKind === "live"
        ? findEntryByFileAndName(
            entryById.values(),
            node.filePath,
            node.componentName,
          )
        : null;

    if (runtimeMatch) {
      runtimeMatch.executionKind = "live";
      runtimeMatch.role = runtimeMatch.role ?? "component";
      return runtimeMatch;
    }

    return ensureSyntheticEntry({
      symbolId: `${STATIC_PREFIX}${node.filePath}#${node.componentName}`,
      name: node.componentName,
      filePath: node.filePath,
      category: "component",
      executionKind: node.executionKind,
      graphNodeKind: "component",
      role: "component",
      source: "static-import",
      renders: [],
      renderedBy: [],
      uses: [],
      usedBy: [],
      apiCalls: [],
    });
  }

  function connectImportTree(
    parentEntry: DocEntry,
    children: RfmServerComponent[] | undefined,
  ) {
    for (const child of filterStaticChildren(children)) {
      const childEntry = resolveImportEntry(child);
      attachRenderEdge(entryById, parentEntry.symbolId, childEntry.symbolId);
      if (child.children?.length) {
        connectImportTree(childEntry, child.children);
      }
    }
  }

  let previousRouteEntry: DocEntry | null = null;
  for (const route of [...activeRoutes].reverse()) {
    const routeEntry = resolveRouteEntry(route);
    if (
      previousRouteEntry &&
      previousRouteEntry.symbolId !== routeEntry.symbolId
    ) {
      attachRenderEdge(
        entryById,
        previousRouteEntry.symbolId,
        routeEntry.symbolId,
      );
    }
    connectImportTree(routeEntry, route.children);
    previousRouteEntry = routeEntry;
  }

  return mergeGraphEntries([...entryById.values()]);
}

function getGraphIdForRoute(
  route: RfmRoute,
  entries: DocEntry[],
): string {
  return (
    entries.find(
      (entry) =>
        entry.source === "route" &&
        entry.filePath === route.filePath &&
        entry.name === route.componentName,
    )?.symbolId ?? ROUTE_PREFIX + route.filePath
  );
}

export function GraphWindow() {
  const [allEntries, setAllEntries] = useState<DocEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [propTypesMap, setPropTypesMap] = useState<PropTypesMap>({});
  const [staticJsx, setStaticJsx] = useState<Record<string, string[]>>({});
  const [fiberRelations, setFiberRelations] = useState<
    Record<string, string[]>
  >({});
  const [routes, setRoutes] = useState<RfmRoute[] | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentProps, setCurrentProps] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [picking, setPicking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState("");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const selectedIdRef = useRef("");
  const selectedTreeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (document.querySelector("style[data-rfm-inspector]")) return;
    const el = document.createElement("style");
    el.setAttribute("data-rfm-inspector", "");
    el.textContent = inspectorCss;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    const ch = new BroadcastChannel(RFM_CHANNEL);
    channelRef.current = ch;
    ch.postMessage({ type: "ready" } satisfies GraphToMain);

    ch.onmessage = (ev: MessageEvent<MainToGraph>) => {
      const msg = ev.data;
      if (msg.type === "graph-update") {
        setAllEntries(msg.allEntries);
        setPropTypesMap(msg.propTypesMap ?? {});
        setStaticJsx(msg.staticJsx ?? {});
        setFiberRelations(msg.fiberRelations ?? {});
        setRoutes(msg.routes ?? null);
        setCurrentPath(msg.currentPath ?? window.location.pathname);
        if (msg.selectedId !== selectedIdRef.current) {
          setSelectedId(msg.selectedId);
          selectedIdRef.current = msg.selectedId;
          setCurrentProps(null);
        }
      } else if (msg.type === "pick-result") {
        setSelectedId(msg.symbolId);
        selectedIdRef.current = msg.symbolId;
        setCurrentProps(null);
        setPicking(false);
      } else if (
        msg.type === "props-update" &&
        msg.symbolId === selectedIdRef.current
      ) {
        setCurrentProps(msg.props);
      }
    };

    return () => ch.close();
  }, []);

  const activeRoutes = useMemo(
    () => getActiveRoutesForPath(routes ?? [], currentPath),
    [routes, currentPath],
  );
  const graphEntries = useMemo(
    () => buildHybridGraphEntries(allEntries, activeRoutes),
    [activeRoutes, allEntries],
  );

  useEffect(() => {
    if (!selectionExists(selectedId, graphEntries)) {
      setSelectedId("");
      selectedIdRef.current = "";
      setCurrentProps(null);
    }
  }, [graphEntries, selectedId]);

  useEffect(() => {
    selectedTreeRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId]);

  const sendToMain = useCallback((msg: GraphToMain) => {
    channelRef.current?.postMessage(msg);
  }, []);

  const handleSelect = useCallback(
    (symbolId: string) => {
      setSelectedId(symbolId);
      selectedIdRef.current = symbolId;
      setCurrentProps(null);
      sendToMain({ type: "select", symbolId });
    },
    [sendToMain],
  );

  const handleHover = useCallback(
    (symbolId: string) => {
      setHoveredId(symbolId);
      sendToMain({ type: "hover", symbolId });
    },
    [sendToMain],
  );

  const handleHoverEnd = useCallback(() => {
    setHoveredId("");
    sendToMain({ type: "hover-end" });
  }, [sendToMain]);

  const handleSelectRoute = useCallback(
    (route: RfmRoute) => {
      handleSelect(getGraphIdForRoute(route, graphEntries));
    },
    [graphEntries, handleSelect],
  );

  const handleHoverRoute = useCallback(
    (route: RfmRoute) => {
      handleHover(getGraphIdForRoute(route, graphEntries));
    },
    [graphEntries, handleHover],
  );

  const handlePickToggle = useCallback(() => {
    if (picking) {
      setPicking(false);
    } else {
      setPicking(true);
      sendToMain({ type: "pick-start" });
    }
  }, [picking, sendToMain]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return graphEntries;
    return graphEntries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.filePath.toLowerCase().includes(query),
    );
  }, [graphEntries, searchQuery]);

  const unifiedTree = useMemo(
    () => buildUnifiedTree(activeRoutes, filteredEntries),
    [activeRoutes, filteredEntries],
  );
  const treeEntries = useMemo(
    () => flattenUnifiedEntries(unifiedTree),
    [unifiedTree],
  );
  const hoveredIds = useMemo(
    () => (hoveredId ? new Set([hoveredId]) : new Set<string>()),
    [hoveredId],
  );

  const selectedEntry = useMemo(
    () => graphEntries.find((entry) => entry.symbolId === selectedId) ?? null,
    [graphEntries, selectedId],
  );
  const selectedRoute = useMemo<RfmRoute | null>(() => {
    if (selectedEntry?.source === "route") {
      return (
        activeRoutes.find(
          (route) =>
            route.filePath === selectedEntry.filePath &&
            route.componentName === selectedEntry.name,
        ) ?? null
      );
    }
    if (!selectedId.startsWith(ROUTE_PREFIX)) return null;
    const filePath = selectedId.slice(ROUTE_PREFIX.length);
    return activeRoutes.find((route) => route.filePath === filePath) ?? null;
  }, [activeRoutes, selectedEntry, selectedId]);
  const routeBreadcrumb = useMemo(
    () => formatRouteBreadcrumb(currentPath, activeRoutes),
    [activeRoutes, currentPath],
  );
  const selectedLabel =
    selectedRoute?.componentName ?? selectedEntry?.name ?? "No selection";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        background: "#f8fafc",
      }}
    >
      <div className="h-10 min-h-10 flex items-center gap-2 px-3 border-b border-rfm-border bg-white shrink-0">
        <div className="flex items-center gap-1.5 mr-1">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="3.5"
              r="2.5"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            <circle
              cx="3.5"
              cy="16.5"
              r="2.5"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            <circle
              cx="16.5"
              cy="16.5"
              r="2.5"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
            <line
              x1="8.9"
              y1="5.7"
              x2="4.6"
              y2="14.3"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="11.1"
              y1="5.7"
              x2="15.4"
              y2="14.3"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[13px] font-bold text-rfm-text-900">
            Flowmap Workspace
          </span>
        </div>

        <div className="w-px h-4 bg-rfm-border" />
        <span className="text-[11px] text-rfm-text-400">
          {allEntries.length} mounted symbols
        </span>
        {!!activeRoutes.length && (
          <span className="text-[11px] text-rfm-text-400">
            {activeRoutes.length} active routes
          </span>
        )}
        <div className="flex-1" />

        <button
          type="button"
          onClick={handlePickToggle}
          title={picking ? "Cancel picking" : "Pick element from app window"}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border text-[11px] font-medium transition-all cursor-pointer ${
            picking
              ? "bg-rfm-blue text-white border-rfm-blue"
              : "bg-transparent text-rfm-text-500 border-rfm-border-light hover:bg-rfm-bg-100 hover:text-rfm-text-900"
          }`}
        >
          <SquareMousePointer size={12} />
          {picking ? "Picking…" : "Pick element"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[320px] border-r border-rfm-border bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-rfm-border shrink-0">
            <div className="text-[12px] font-semibold text-rfm-text-900">
              Explorer
            </div>
            <div className="mt-1 text-[11px] text-rfm-text-400">
              {treeEntries.length} symbols across mounted files and routes
            </div>
          </div>

          <div className="px-3 py-2.5 border-b border-rfm-border shrink-0">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-rfm-text-400"
              />
              <input
                type="text"
                placeholder="Search name or file..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full box-border rounded-md border border-rfm-border-light bg-[rgba(249,250,251,0.7)] text-[11px] text-rfm-text-900 outline-none font-[inherit] focus:border-rfm-text-400 focus:bg-white"
                style={{ height: 28, paddingLeft: 28, paddingRight: 24 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-none bg-rfm-text-300 text-white cursor-pointer flex items-center justify-center p-0"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pt-1 pb-4">
            <UnifiedTreeView
              tree={unifiedTree}
              selectedId={selectedId}
              focusedSymbolId=""
              hoveredIds={hoveredIds}
              treeHoveredId={hoveredId}
              selectedRouteFilePath={selectedRoute?.filePath ?? ""}
              showDetailButton={false}
              onSelect={handleSelect}
              onDetail={() => {}}
              onActivateRoute={(route) =>
                handleSelectRoute(route)
              }
              onSelectRoute={(route) =>
                handleSelectRoute(route)
              }
              onHoverRoute={handleHoverRoute}
              onHoverRouteEnd={handleHoverEnd}
              onHover={handleHover}
              onHoverEnd={handleHoverEnd}
              selectedRef={selectedTreeRef}
            />
          </div>
        </aside>

        <section className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-rfm-border bg-[rgba(255,255,255,0.88)] shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-rfm-text-900">
                  Graph
                </div>
                <div className="mt-1 text-[11px] text-rfm-text-400 truncate">
                  Route {routeBreadcrumb}
                </div>
                <div className="text-[11px] text-rfm-text-400 truncate">
                  Focused on {selectedLabel}
                </div>
              </div>
              <div className="text-[10px] text-rfm-text-400 uppercase tracking-[0.08em]">
                Unified ownership view
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 flex">
            <FullGraph
              entries={graphEntries}
              selectedId={selectedId}
              staticJsx={staticJsx}
              fiberRelations={fiberRelations}
              onSelect={handleSelect}
              onHover={handleHover}
              onHoverEnd={handleHoverEnd}
            />
          </div>
        </section>

        <aside className="w-90  border-l border-rfm-border flex flex-col overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-rfm-border shrink-0">
            <div className="text-[12px] font-semibold text-rfm-text-900">
              Inspector
            </div>
            <div className="mt-1 text-[11px] text-rfm-text-400 truncate">
              Props and source metadata
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <WorkspaceDetail
              entry={selectedEntry}
              route={selectedRoute}
              props={currentProps}
              propTypesMap={propTypesMap}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
