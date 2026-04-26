import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ClipboardCheck,
  ClipboardCopy,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  SquareMousePointer,
  X,
} from "lucide-react";
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
import {
  getActiveRoutesForPath,
  getEntryScreenContext,
  getRouteScreenContext,
} from "./workspace-detail-model";
import { openInEditor } from "../inspector/utils";
import { EditorSelect } from "../inspector/EditorSelect";
import inspectorCss from "../inspector/inspector.compiled.css?raw";
import type { RfmServerComponent } from "../inspector/types";
import packageJson from "../../../package.json";

const STATIC_PREFIX = "static:";
const GRAPH_WINDOW_SNAPSHOT_KEY = "rfm-graph-window-snapshot";
const RFM_STATIC_NAMES = new Set([
  "ReactFlowMap",
  "FlowmapProvider",
  "ComponentOverlay",
]);

function selectionExists(selectedId: string, entries: DocEntry[]): boolean {
  if (!selectedId) return true;
  return entries.some((entry) => entry.symbolId === selectedId);
}

function formatRole(
  role: DocEntry["role"] | RfmRoute["type"] | undefined,
): string {
  if (!role) return "Component";
  if (role === "not-found") return "Not Found";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function SelectionSummaryContent({
  entry,
  route,
  contextRoute,
  parentLayout,
  currentPath,
}: {
  entry: DocEntry | null;
  route: RfmRoute | null;
  contextRoute: RfmRoute | null;
  parentLayout: RfmRoute | null;
  currentPath: string;
}) {
  const name = route?.componentName ?? entry?.name ?? "";
  const filePath = route?.filePath ?? entry?.filePath ?? "";
  const executionKind = route?.executionKind ?? entry?.executionKind ?? "live";
  const ownershipLabel =
    entry?.ownershipKind ??
    (executionKind === "static" ? "STATIC-DECLARED" : "LIVE");
  const roleLabel = route
    ? formatRole(route.type)
    : formatRole(entry?.role ?? "component");
  const routeLabel = contextRoute?.componentName ?? currentPath;
  const parentLabel = parentLayout?.componentName ?? null;

  return (
    <>
      {name ? (
        <>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold text-rfm-text-400 uppercase tracking-[0.07em] shrink-0">
                Selected source
              </span>
              <span className="inline-flex items-center rounded-full bg-rfm-blue-light px-2 py-0.5 text-[10px] font-medium text-rfm-blue shrink-0">
                {roleLabel} · {ownershipLabel}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 min-w-0">
              <span className="text-[15px] font-semibold text-rfm-text-900 truncate">
                {name}
              </span>
              <span className="text-[10px] text-rfm-text-300 shrink-0">in</span>
              <span className="text-[11px] text-rfm-text-500 font-mono truncate">
                {filePath || "—"}
              </span>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 min-w-0 max-w-[280px]">
            <span className="text-[10px] text-rfm-text-400 truncate max-w-full">
              Route {routeLabel}
            </span>
            {parentLabel ? (
              <span className="text-[10px] text-rfm-text-400 truncate max-w-full">
                Layout {parentLabel}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-rfm-text-900">
            No UI selected
          </div>
          <div className="mt-0.5 text-[11px] text-rfm-text-400">
            Pick an element from the app window or choose a component from
            Explorer.
          </div>
        </div>
      )}
    </>
  );
}

function OpenSourceButton({
  entry,
  route,
}: {
  entry: DocEntry | null;
  route: RfmRoute | null;
}) {
  const filePath = route?.filePath ?? entry?.filePath ?? "";
  const canOpen = filePath.length > 0;

  const handleOpen = () => {
    if (!canOpen) return;
    if (route) {
      openInEditor(filePath, "", "1");
      return;
    }
    openInEditor(
      filePath,
      entry?.source === "static-import" ? "" : entry?.symbolId ?? "",
      entry?.source === "static-import" ? "1" : null,
    );
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={!canOpen}
      title={canOpen ? `Open ${filePath}` : "No source file"}
      className="h-7 shrink-0 flex items-center gap-1.5 rounded-md border border-rfm-border-light bg-transparent px-2.5 text-[11px] font-medium text-rfm-text-500 hover:bg-rfm-bg-100 hover:text-rfm-text-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
    >
      <ExternalLink size={12} />
      Open source
    </button>
  );
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
    ownershipKind:
      entry.ownershipKind ??
      (entry.executionKind === "static" ? "STATIC-DECLARED" : "LIVE"),
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

function findSingleLiveEntryByFile(
  entries: Iterable<DocEntry>,
  filePath: string,
): DocEntry | null {
  let match: DocEntry | null = null;
  for (const entry of entries) {
    if (entry.filePath !== filePath || entry.executionKind === "static") {
      continue;
    }
    if (match) return null;
    match = entry;
  }
  return match;
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
    const hasStaticDom = group.some(
      (entry) => entry.ownershipKind === "STATIC-DOM",
    );
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
      ownershipKind: hasLive
        ? "LIVE"
        : hasStaticDom
        ? "STATIC-DOM"
        : "STATIC-DECLARED",
      graphNodeKind: hasRoute
        ? "route"
        : canonical.graphNodeKind ?? "component",
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
        if (
          !merged.apiCalls.some((existing) => existing.apiId === apiCall.apiId)
        ) {
          merged.apiCalls.push(apiCall);
        }
      }
    }
  }

  return [...mergedById.values()];
}

export function buildHybridGraphEntries(
  runtimeEntries: DocEntry[],
  activeRoutes: RfmRoute[],
  observedStaticOwnerKeys: Iterable<string> = [],
): DocEntry[] {
  const observedStaticOwners = new Set(observedStaticOwnerKeys);
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
      runtimeMatch.ownershipKind = "LIVE";
      return runtimeMatch;
    }

    return ensureSyntheticEntry({
      symbolId: ROUTE_PREFIX + route.filePath,
      name: route.componentName,
      filePath: route.filePath,
      category: "component",
      executionKind: route.executionKind,
      ownershipKind:
        route.executionKind === "live"
          ? "LIVE"
          : observedStaticOwners.has(`${route.filePath}#${route.componentName}`)
          ? "STATIC-DOM"
          : "STATIC-DECLARED",
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
          ) ?? findSingleLiveEntryByFile(entryById.values(), node.filePath)
        : null;

    if (runtimeMatch) {
      runtimeMatch.executionKind = "live";
      runtimeMatch.ownershipKind = "LIVE";
      runtimeMatch.role = runtimeMatch.role ?? "component";
      return runtimeMatch;
    }

    const ownerKey = `${node.filePath}#${node.componentName}`;
    return ensureSyntheticEntry({
      symbolId: `${STATIC_PREFIX}${ownerKey}`,
      name: node.componentName,
      filePath: node.filePath,
      category: "component",
      executionKind: node.executionKind,
      ownershipKind:
        node.executionKind === "live"
          ? "LIVE"
          : observedStaticOwners.has(ownerKey)
          ? "STATIC-DOM"
          : "STATIC-DECLARED",
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

function summarizeEntry(entry: DocEntry) {
  return {
    symbolId: entry.symbolId,
    name: entry.name,
    filePath: entry.filePath,
    category: entry.category,
    executionKind: entry.executionKind ?? "live",
    ownershipKind:
      entry.ownershipKind ??
      (entry.executionKind === "static" ? "STATIC-DECLARED" : "LIVE"),
    graphNodeKind: entry.graphNodeKind ?? "component",
    role: entry.role ?? "component",
    source: entry.source ?? "runtime",
    renders: entry.renders.map((ref) => ref.symbolId),
    renderedBy: entry.renderedBy.map((ref) => ref.symbolId),
    uses: entry.uses.map((ref) => ref.symbolId),
    usedBy: entry.usedBy.map((ref) => ref.symbolId),
    apiCalls: entry.apiCalls.map((api) => api.apiId),
  };
}

function summarizeImportTree(
  children: RfmServerComponent[] | undefined,
): unknown[] {
  return (children ?? []).map((child) => ({
    filePath: child.filePath,
    componentName: child.componentName,
    nodeKind: child.nodeKind,
    executionKind: child.executionKind,
    isServer: child.isServer,
    children: summarizeImportTree(child.children),
  }));
}

function summarizeRoute(route: RfmRoute) {
  return {
    router: route.router ?? "next",
    urlPath: route.urlPath,
    filePath: route.filePath,
    type: route.type,
    componentName: route.componentName,
    executionKind: route.executionKind,
    isServer: route.isServer,
    propTypes: route.propTypes ?? {},
    children: summarizeImportTree(route.children),
  };
}

function collectClientBoundaryDiagnostics(
  runtimeEntries: DocEntry[],
  routes: RfmRoute[],
) {
  const diagnostics: Array<Record<string, unknown>> = [];
  const runtimeByFile = new Map<string, DocEntry[]>();

  for (const entry of runtimeEntries) {
    if (entry.executionKind === "static") continue;
    runtimeByFile.set(entry.filePath, [
      ...(runtimeByFile.get(entry.filePath) ?? []),
      entry,
    ]);
  }

  const visit = (node: RfmServerComponent, route: RfmRoute) => {
    if (node.nodeKind === "client-boundary") {
      const matches = runtimeByFile.get(node.filePath) ?? [];
      const exactMatch = matches.some(
        (entry) => entry.name === node.componentName,
      );
      if (matches.length > 0 && !exactMatch) {
        diagnostics.push({
          type: "client-boundary-name-mismatch",
          route: route.urlPath,
          filePath: node.filePath,
          staticName: node.componentName,
          liveNames: matches.map((entry) => entry.name),
        });
      }
    }

    for (const child of node.children ?? []) {
      visit(child, route);
    }
  };

  for (const route of routes) {
    for (const child of route.children ?? []) {
      visit(child, route);
    }
  }

  return diagnostics;
}

export function buildDebugSnapshot({
  allEntries,
  graphEntries,
  selectedId,
  currentPath,
  routes,
  activeRoutes,
  staticJsx,
  fiberRelations,
  propTypesMap,
  observedStaticOwnerKeys,
}: {
  allEntries: DocEntry[];
  graphEntries: DocEntry[];
  selectedId: string;
  currentPath: string;
  routes: RfmRoute[] | null;
  activeRoutes: RfmRoute[];
  staticJsx: Record<string, string[]>;
  fiberRelations: Record<string, string[]>;
  propTypesMap: PropTypesMap;
  observedStaticOwnerKeys: string[];
}) {
  return {
    type: "react-flowmap-debug-snapshot",
    schemaVersion: 1,
    packageVersion: packageJson.version,
    generatedAt: new Date().toISOString(),
    currentPath,
    selectedId,
    counts: {
      runtimeEntries: allEntries.length,
      graphEntries: graphEntries.length,
      routes: routes?.length ?? 0,
      activeRoutes: activeRoutes.length,
      staticJsxParents: Object.keys(staticJsx).length,
      fiberRelationParents: Object.keys(fiberRelations).length,
      propTypeEntries: Object.keys(propTypesMap).length,
    },
    diagnostics: collectClientBoundaryDiagnostics(allEntries, activeRoutes),
    routes: routes?.map(summarizeRoute) ?? null,
    activeRoutes: activeRoutes.map(summarizeRoute),
    runtimeEntries: allEntries.map(summarizeEntry),
    graphEntries: graphEntries.map(summarizeEntry),
    staticJsx,
    fiberRelations,
    observedStaticOwnerKeys,
    propTypeKeys: Object.keys(propTypesMap),
  };
}

function getGraphIdForRoute(route: RfmRoute, entries: DocEntry[]): string {
  return (
    entries.find(
      (entry) =>
        entry.source === "route" &&
        entry.filePath === route.filePath &&
        entry.name === route.componentName,
    )?.symbolId ?? ROUTE_PREFIX + route.filePath
  );
}

type GraphWindowSnapshot = {
  allEntries: DocEntry[];
  selectedId: string;
  propTypesMap: PropTypesMap;
  staticJsx: Record<string, string[]>;
  fiberRelations: Record<string, string[]>;
  routes: RfmRoute[] | null;
  observedStaticOwnerKeys: string[];
  currentPath: string;
};

function loadGraphWindowSnapshot(): GraphWindowSnapshot | null {
  try {
    const raw = sessionStorage.getItem(GRAPH_WINDOW_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GraphWindowSnapshot>;
    if (!Array.isArray(parsed.allEntries)) return null;
    return {
      allEntries: parsed.allEntries,
      selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : "",
      propTypesMap: parsed.propTypesMap ?? {},
      staticJsx: parsed.staticJsx ?? {},
      fiberRelations: parsed.fiberRelations ?? {},
      routes: parsed.routes ?? null,
      observedStaticOwnerKeys: parsed.observedStaticOwnerKeys ?? [],
      currentPath:
        typeof parsed.currentPath === "string"
          ? parsed.currentPath
          : window.location.pathname,
    };
  } catch {
    return null;
  }
}

function saveGraphWindowSnapshot(snapshot: GraphWindowSnapshot): void {
  try {
    sessionStorage.setItem(GRAPH_WINDOW_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // noop
  }
}

export function GraphWindow() {
  const initialSnapshot = useMemo(loadGraphWindowSnapshot, []);
  const [allEntries, setAllEntries] = useState<DocEntry[]>(
    () => initialSnapshot?.allEntries ?? [],
  );
  const [selectedId, setSelectedId] = useState(
    () => initialSnapshot?.selectedId ?? "",
  );
  const [propTypesMap, setPropTypesMap] = useState<PropTypesMap>(
    () => initialSnapshot?.propTypesMap ?? {},
  );
  const [staticJsx, setStaticJsx] = useState<Record<string, string[]>>(
    () => initialSnapshot?.staticJsx ?? {},
  );
  const [fiberRelations, setFiberRelations] = useState<
    Record<string, string[]>
  >(() => initialSnapshot?.fiberRelations ?? {});
  const [routes, setRoutes] = useState<RfmRoute[] | null>(
    () => initialSnapshot?.routes ?? null,
  );
  const [observedStaticOwnerKeys, setObservedStaticOwnerKeys] = useState<
    string[]
  >(() => initialSnapshot?.observedStaticOwnerKeys ?? []);
  const [currentPath, setCurrentPath] = useState(
    () => initialSnapshot?.currentPath ?? window.location.pathname,
  );
  const [currentProps, setCurrentProps] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [picking, setPicking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState("");
  const [explorerPanelOpen, setExplorerPanelOpen] = useState(true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);
  const [debugCopyState, setDebugCopyState] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const selectedIdRef = useRef(initialSnapshot?.selectedId ?? "");
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
        setObservedStaticOwnerKeys(msg.observedStaticOwnerKeys ?? []);
        setCurrentPath(msg.currentPath ?? window.location.pathname);
        if (msg.selectedId !== selectedIdRef.current) {
          setSelectedId(msg.selectedId);
          selectedIdRef.current = msg.selectedId;
          setCurrentProps(null);
          if (msg.selectedId) setDetailPanelOpen(true);
        }
      } else if (msg.type === "pick-result") {
        setSelectedId(msg.symbolId);
        selectedIdRef.current = msg.symbolId;
        setCurrentProps(null);
        setPicking(false);
        setDetailPanelOpen(true);
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
    () =>
      buildHybridGraphEntries(
        allEntries,
        activeRoutes,
        observedStaticOwnerKeys,
      ),
    [activeRoutes, allEntries, observedStaticOwnerKeys],
  );
  const debugSnapshot = useMemo(
    () =>
      buildDebugSnapshot({
        allEntries,
        graphEntries,
        selectedId,
        currentPath,
        routes,
        activeRoutes,
        staticJsx,
        fiberRelations,
        propTypesMap,
        observedStaticOwnerKeys,
      }),
    [
      activeRoutes,
      allEntries,
      currentPath,
      fiberRelations,
      graphEntries,
      propTypesMap,
      routes,
      selectedId,
      staticJsx,
      observedStaticOwnerKeys,
    ],
  );

  useEffect(() => {
    saveGraphWindowSnapshot({
      allEntries,
      selectedId,
      propTypesMap,
      staticJsx,
      fiberRelations,
      routes,
      observedStaticOwnerKeys,
      currentPath,
    });
  }, [
    allEntries,
    currentPath,
    fiberRelations,
    observedStaticOwnerKeys,
    propTypesMap,
    routes,
    selectedId,
    staticJsx,
  ]);

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
      const isSameSelection = symbolId === selectedIdRef.current;
      if (isSameSelection) {
        setDetailPanelOpen((open) => !open);
        sendToMain({ type: "select", symbolId });
        return;
      }

      setSelectedId(symbolId);
      selectedIdRef.current = symbolId;
      setCurrentProps(null);
      setDetailPanelOpen(true);
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

  const handleCopyDebugSnapshot = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable.");
      }
      await navigator.clipboard.writeText(
        JSON.stringify(debugSnapshot, null, 2),
      );
      setDebugCopyState("copied");
    } catch (error) {
      console.warn("[react-flowmap] failed to copy debug snapshot", error);
      setDebugCopyState("failed");
    } finally {
      window.setTimeout(() => setDebugCopyState("idle"), 1800);
    }
  }, [debugSnapshot]);

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
  const selectedContext = useMemo(
    () =>
      selectedEntry
        ? getEntryScreenContext(selectedEntry, activeRoutes, currentPath)
        : { route: null, parentLayout: null },
    [activeRoutes, currentPath, selectedEntry],
  );
  const selectedRouteContext = useMemo(
    () =>
      selectedRoute
        ? getRouteScreenContext(selectedRoute, activeRoutes)
        : { parentLayout: null },
    [activeRoutes, selectedRoute],
  );
  const detailRoute = selectedRoute ?? selectedContext.route;
  const detailParentLayout =
    selectedRouteContext.parentLayout ?? selectedContext.parentLayout;
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
      <div className="min-h-14 flex items-center gap-3 px-3 py-2 border-b border-rfm-border bg-white shrink-0">
        <div className="flex items-center gap-2 shrink-0">
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
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-rfm-text-900 leading-none">
              Flowmap
            </span>
          </div>
        </div>

        <div className="w-px h-8 bg-rfm-border" />

        <SelectionSummaryContent
          entry={selectedEntry}
          route={selectedRoute}
          contextRoute={detailRoute}
          parentLayout={detailParentLayout}
          currentPath={currentPath}
        />

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

        <OpenSourceButton entry={selectedEntry} route={selectedRoute} />

        <button
          type="button"
          onClick={handleCopyDebugSnapshot}
          title="Copy debug snapshot"
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border text-[11px] font-medium transition-all cursor-pointer ${
            debugCopyState === "copied"
              ? "bg-rfm-blue-light text-rfm-blue border-rfm-blue-border"
              : debugCopyState === "failed"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-transparent text-rfm-text-500 border-rfm-border-light hover:bg-rfm-bg-100 hover:text-rfm-text-900"
          }`}
        >
          {debugCopyState === "copied" ? (
            <ClipboardCheck size={12} />
          ) : (
            <ClipboardCopy size={12} />
          )}
          {debugCopyState === "copied"
            ? "Copied"
            : debugCopyState === "failed"
              ? "Copy failed"
              : "Copy debug"}
        </button>

        <EditorSelect />
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {explorerPanelOpen ? (
          <aside className="w-[320px] border-r border-rfm-border bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-rfm-border shrink-0 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-rfm-text-900">
                  Explorer
                </div>
                <div className="mt-1 text-[11px] text-rfm-text-400">
                  {treeEntries.length} entries in the current screen structure
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExplorerPanelOpen(false)}
                title="Collapse explorer"
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-rfm-border-light bg-transparent text-rfm-text-400 hover:bg-rfm-bg-100 hover:text-rfm-text-900 cursor-pointer transition-all"
              >
                <PanelLeftClose size={14} />
              </button>
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
                onActivateRoute={(route) => handleSelectRoute(route)}
                onSelectRoute={(route) => handleSelectRoute(route)}
                onHoverRoute={handleHoverRoute}
                onHoverRouteEnd={handleHoverEnd}
                onHover={handleHover}
                onHoverEnd={handleHoverEnd}
                selectedRef={selectedTreeRef}
              />
            </div>
          </aside>
        ) : (
          <div className="absolute left-4 top-3 z-10">
            <button
              type="button"
              onClick={() => setExplorerPanelOpen(true)}
              title="Open explorer"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-rfm-border-light bg-white text-rfm-text-400 shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:bg-rfm-bg-100 hover:text-rfm-text-900 cursor-pointer transition-all"
            >
              <PanelLeftOpen size={14} />
            </button>
          </div>
        )}

        <section className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <div className="min-h-0 flex-1 flex">
            <FullGraph
              entries={graphEntries}
              selectedId={selectedId}
              hoveredId={hoveredId}
              staticJsx={staticJsx}
              fiberRelations={fiberRelations}
              onSelect={handleSelect}
              onHover={handleHover}
              onHoverEnd={handleHoverEnd}
            />
          </div>
        </section>

        {detailPanelOpen ? (
          <aside className="w-90 border-l border-rfm-border flex flex-col overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-rfm-border shrink-0 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-rfm-text-900">
                  Inspector
                </div>
                <div className="mt-1 text-[11px] text-rfm-text-400 truncate">
                  Props, runtime data, and screen context
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailPanelOpen(false)}
                title="Collapse inspector"
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-rfm-border-light bg-transparent text-rfm-text-400 hover:bg-rfm-bg-100 hover:text-rfm-text-900 cursor-pointer transition-all"
              >
                <PanelRightClose size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <WorkspaceDetail
                entry={selectedEntry}
                route={selectedRoute}
                contextRoute={detailRoute}
                parentLayout={detailParentLayout}
                props={currentProps}
                propTypesMap={propTypesMap}
              />
            </div>
          </aside>
        ) : (
          <div className="absolute right-4 top-3 z-10">
            <button
              type="button"
              onClick={() => setDetailPanelOpen(true)}
              title="Open inspector"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-rfm-border-light bg-white text-rfm-text-400 shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:bg-rfm-bg-100 hover:text-rfm-text-900 cursor-pointer transition-all"
            >
              <PanelRightOpen size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
