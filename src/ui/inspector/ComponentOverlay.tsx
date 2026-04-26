import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type VirtualElement,
} from "@floating-ui/dom";
import type { FlowmapGraph } from "../../core/types/graph.js";
import { buildDocIndex, type DocEntry } from "../doc/build-doc-index";
import type { FoundComp, RfmRoute } from "./types";
import {
  findComponentsAt,
  findElBySymbolId,
  findAllMountedRfmComponents,
  isVisible,
  getPropsForSymbolId,
  findUnionRectBySymbolId,
  findAllInstanceRectsBySymbolId,
  deriveDisplayName,
  findComponentRectByEl,
  buildFiberRelationships,
  invalidateMountedRfmSnapshot,
} from "./utils";
import { HoverPreviewBox, ActiveSelectBox, OVERLAY_VISUALS } from "./Overlays";
import { InspectButton, type FlowmapConfig } from "./InspectButton";
import inspectorCss from "./inspector.compiled.css?raw";
import type { MainToGraph, GraphToMain, PropTypesMap } from "./channel";
import { RFM_CHANNEL } from "./channel";

// ─── Serialization helper ─────────────────────────────────────────────────────

/** BroadcastChannel은 structured clone만 지원하므로 함수 등은 문자열로 변환 */
function serializeForChannel(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "function") {
    const raw = value.name || "";
    const name =
      raw === "bound dispatchSetState"
        ? "setState"
        : raw === "bound dispatchReducerState"
        ? "dispatch"
        : raw.startsWith("bound ")
        ? raw.slice(6)
        : raw;
    return { __rfmFn: name };
  }
  if (typeof value === "symbol") return value.toString();
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(serializeForChannel);
  try {
    // plain object인지 확인 (Date, RegExp 등은 structured clone 가능하므로 통과)
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          serializeForChannel(v),
        ]),
      );
    }
    return String(value);
  } catch {
    return "[Object]";
  }
}

function serializeProps(
  rawProps: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!rawProps) return {};
  return Object.fromEntries(
    Object.entries(rawProps)
      .filter(([k]) => k !== "children")
      .map(([k, v]) => [k, serializeForChannel(v)]),
  );
}

function buildOwnershipChildIds(
  entries: DocEntry[],
  fiberRelations: Record<string, string[]>,
): Set<string> {
  const ownedChildIds = new Set<string>();

  for (const entry of entries) {
    for (const child of entry.renders) {
      ownedChildIds.add(child.symbolId);
    }
  }

  for (const childIds of Object.values(fiberRelations)) {
    for (const childId of childIds) {
      ownedChildIds.add(childId);
    }
  }

  return ownedChildIds;
}

export function applyStaticEdges(
  entries: DocEntry[],
  staticJsx: Record<string, string[]>,
  fiberRelations: Record<string, string[]>,
): DocEntry[] {
  const byId = new Map(entries.map((e) => [e.symbolId, e]));
  const byName = new Map(entries.map((e) => [e.name, e]));
  const ownedChildIds = buildOwnershipChildIds(entries, fiberRelations);

  // child name → [parentSymbolId] 역방향
  const staticParents = new Map<string, string[]>();
  for (const [fromId, childNames] of Object.entries(staticJsx)) {
    for (const name of childNames) {
      if (!staticParents.has(name)) staticParents.set(name, []);
      staticParents.get(name)!.push(fromId);
    }
  }

  return entries.map((entry) => {
    let { renderedBy, renders } = entry;

    // renderedBy 보완: ownership parent가 전혀 없을 때만 static 부모를 fallback으로 추가
    if (renderedBy.length === 0 && !ownedChildIds.has(entry.symbolId)) {
      const extra = (staticParents.get(entry.name) ?? [])
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((pe) => ({
          symbolId: pe!.symbolId,
          name: pe!.name,
          filePath: pe!.filePath,
        }));
      if (extra.length > 0) renderedBy = extra;
    }

    // renders 보완: ownership child가 전혀 없을 때만 static child를 fallback으로 추가
    const staticChildren = staticJsx[entry.symbolId] ?? [];
    const runtimeChildIds = new Set(renders.map((r) => r.symbolId));
    const extraRenders = staticChildren
      .map((name) => byName.get(name))
      .filter(Boolean)
      .filter((ce) => !runtimeChildIds.has(ce!.symbolId))
      .filter((ce) => !ownedChildIds.has(ce!.symbolId))
      .map((ce) => ({
        symbolId: ce!.symbolId,
        name: ce!.name,
        filePath: ce!.filePath,
      }));
    if (extraRenders.length > 0) renders = [...renders, ...extraRenders];

    if (renderedBy === entry.renderedBy && renders === entry.renders)
      return entry;
    return { ...entry, renderedBy, renders };
  });
}

function computeRouteRect(): DOMRect {
  // 서버 컴포넌트는 DOM에 없으므로 항상 전체 뷰포트 반환
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

const STATIC_PREFIX = "static:";
const ROUTE_PREFIX = "route:";
const STATIC_OWNER_ATTRS = ["rfmStaticOwner", "rfmStatic"] as const;
const RUNTIME_OWNER_ATTRS = ["rfmOwner"] as const;

type OwnerOverlayState = "selected" | "hovered";

type OwnerOverlayBox = {
  symbolId: string;
  state: OwnerOverlayState;
  label: string;
  ownerEl?: HTMLElement;
  rect?: DOMRect;
  index: number;
};

type OverlayRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type FloatingLabelPosition = {
  top: number;
  left: number;
};

function rectToOverlayRect(rect: DOMRect): OverlayRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function overlayRectChanged(a: OverlayRect, b: OverlayRect): boolean {
  return (
    Math.abs(a.top - b.top) > 0.5 ||
    Math.abs(a.left - b.left) > 0.5 ||
    Math.abs(a.width - b.width) > 0.5 ||
    Math.abs(a.height - b.height) > 0.5
  );
}

function unionVisibleRects(rects: DOMRect[]): DOMRect | null {
  const visibleRects = rects.filter(isVisible);
  if (visibleRects.length === 0) return null;

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const rect of visibleRects) {
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

const OWNER_ANCHOR_SELECTOR = "[data-rfm-owner-anchor]";
const OWNER_IGNORE_SELECTOR = "[data-rfm-owner-ignore]";

function isElementVisuallyHidden(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    style.getPropertyValue("content-visibility") === "hidden"
  );
}

function isIgnoredWithinOwner(el: HTMLElement, ownerEl: HTMLElement): boolean {
  if (el === ownerEl) return false;
  return Boolean(el.closest(OWNER_IGNORE_SELECTOR));
}

function shouldSkipOwnerVisualElement(
  el: HTMLElement,
  ownerEl: HTMLElement,
): boolean {
  return (
    Boolean(el.closest("[data-rfm-overlay]")) ||
    isIgnoredWithinOwner(el, ownerEl) ||
    isElementVisuallyHidden(el)
  );
}

function getVisibleElementRect(el: HTMLElement): DOMRect | null {
  const rect = el.getBoundingClientRect();
  return isVisible(rect) ? rect : null;
}

function getVisibleDescendantRects(
  scopeEl: HTMLElement,
  ownerEl: HTMLElement,
): DOMRect[] {
  const rects: DOMRect[] = [];
  for (const el of Array.from(scopeEl.querySelectorAll<HTMLElement>("*"))) {
    if (shouldSkipOwnerVisualElement(el, ownerEl)) continue;
    const rect = getVisibleElementRect(el);
    if (rect) rects.push(rect);
  }
  return rects;
}

function isFixedOrStickyElement(el: HTMLElement): boolean {
  const position = window.getComputedStyle(el).position;
  return position === "fixed" || position === "sticky";
}

function getFixedOrStickyVisualRects(
  scopeEl: HTMLElement,
  ownerEl: HTMLElement,
): DOMRect[] {
  const elements = Array.from(scopeEl.querySelectorAll<HTMLElement>("*"));
  if (isFixedOrStickyElement(scopeEl)) elements.unshift(scopeEl);

  return elements
    .filter((el) => isFixedOrStickyElement(el))
    .filter((el) => !shouldSkipOwnerVisualElement(el, ownerEl))
    .map(getVisibleElementRect)
    .filter((rect): rect is DOMRect => rect !== null);
}

function hasFixedOrStickyVisual(ownerEl: HTMLElement): boolean {
  if (isFixedOrStickyElement(ownerEl)) return true;
  return Array.from(ownerEl.querySelectorAll<HTMLElement>("*")).some(
    (el) =>
      isFixedOrStickyElement(el) && !shouldSkipOwnerVisualElement(el, ownerEl),
  );
}

function getOwnerAnchorElements(ownerEl: HTMLElement): HTMLElement[] {
  const anchors = Array.from(
    ownerEl.querySelectorAll<HTMLElement>(OWNER_ANCHOR_SELECTOR),
  );
  if (ownerEl.matches(OWNER_ANCHOR_SELECTOR)) anchors.unshift(ownerEl);
  return anchors.filter((el) => !shouldSkipOwnerVisualElement(el, ownerEl));
}

export function getOwnerVisualRect(ownerEl: HTMLElement): DOMRect | null {
  const anchors = getOwnerAnchorElements(ownerEl);
  if (anchors.length > 0) {
    return unionVisibleRects(
      anchors.flatMap((anchor) => {
        const anchorRect = getVisibleElementRect(anchor);
        return anchorRect
          ? [anchorRect]
          : getVisibleDescendantRects(anchor, ownerEl);
      }),
    );
  }

  if (shouldSkipOwnerVisualElement(ownerEl, ownerEl)) return null;

  const positionedRect = unionVisibleRects(
    getFixedOrStickyVisualRects(ownerEl, ownerEl),
  );
  if (positionedRect) return positionedRect;

  const ownerRect = getVisibleElementRect(ownerEl);
  if (ownerRect) return ownerRect;

  const ownerStyle = window.getComputedStyle(ownerEl);
  if (ownerStyle.display === "contents") {
    return unionVisibleRects(getVisibleDescendantRects(ownerEl, ownerEl));
  }

  return null;
}

function staticOwnerKeyFromSymbolId(symbolId: string): string | null {
  if (symbolId.startsWith(STATIC_PREFIX)) {
    const key = symbolId.slice(STATIC_PREFIX.length);
    return key.includes("#") ? key : null;
  }

  if (symbolId.startsWith(ROUTE_PREFIX)) {
    const filePath = symbolId.slice(ROUTE_PREFIX.length);
    const route = getRouteManifest()?.find(
      (item) => item.filePath === filePath,
    );
    return route ? `${route.filePath}#${route.componentName}` : null;
  }

  return null;
}

function routeFromSymbolId(symbolId: string): RfmRoute | null {
  if (symbolId.startsWith(ROUTE_PREFIX)) {
    const filePath = symbolId.slice(ROUTE_PREFIX.length);
    return (
      getRouteManifest()?.find((item) => item.filePath === filePath) ?? null
    );
  }

  if (symbolId.startsWith(STATIC_PREFIX)) {
    const ownerKey = staticOwnerKeyFromSymbolId(symbolId);
    if (!ownerKey) return null;
    return (
      getRouteManifest()?.find(
        (item) => `${item.filePath}#${item.componentName}` === ownerKey,
      ) ?? null
    );
  }

  return null;
}

function isLayoutRouteOwner(symbolId: string): boolean {
  const route = routeFromSymbolId(symbolId);
  if (route?.type === "layout") return true;

  if (symbolId.startsWith(ROUTE_PREFIX)) {
    return /(^|\/)layout\.[jt]sx?$/.test(symbolId.slice(ROUTE_PREFIX.length));
  }

  if (symbolId.startsWith(STATIC_PREFIX)) {
    const ownerKey = staticOwnerKeyFromSymbolId(symbolId);
    const filePath = ownerKey?.split("#")[0] ?? "";
    return /(^|\/)layout\.[jt]sx?$/.test(filePath);
  }

  return false;
}

function labelFromSymbolId(symbolId: string): string {
  if (symbolId.startsWith(ROUTE_PREFIX)) {
    const route = routeFromSymbolId(symbolId);
    if (route) return route.componentName;
  }

  return symbolId.split("#").at(-1) ?? "";
}

function findStaticOwnerElements(symbolId: string): HTMLElement[] {
  const ownerKey = staticOwnerKeyFromSymbolId(symbolId);
  if (!ownerKey) return [];

  return Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-rfm-static-owner], [data-rfm-static]",
    ),
  ).filter((el) =>
    STATIC_OWNER_ATTRS.some((attr) => el.dataset[attr] === ownerKey),
  );
}

function findRuntimeOwnerElements(symbolId: string): HTMLElement[] {
  if (!symbolId.startsWith("symbol:")) return [];

  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-rfm-owner]"),
  ).filter((el) =>
    RUNTIME_OWNER_ATTRS.some((attr) => el.dataset[attr] === symbolId),
  );
}

function findOwnerElements(symbolId: string): HTMLElement[] {
  return symbolId.startsWith(STATIC_PREFIX) || symbolId.startsWith(ROUTE_PREFIX)
    ? findStaticOwnerElements(symbolId)
    : findRuntimeOwnerElements(symbolId);
}

function findOwnerRect(
  symbolId: string,
): { rect: DOMRect; label: string } | null {
  const elements = findOwnerElements(symbolId);
  const rect = unionVisibleRects(
    elements
      .map(getOwnerVisualRect)
      .filter((rect): rect is DOMRect => rect !== null),
  );
  return rect ? { rect, label: labelFromSymbolId(symbolId) } : null;
}

function ensureOwnerVisible(symbolId: string, onAfterScroll: () => void): void {
  const ownerRect = findOwnerRect(symbolId);
  if (ownerRect && isFullyInViewport(ownerRect.rect)) return;

  const [ownerEl] = findOwnerElements(symbolId);
  if (!ownerEl) return;

  ownerEl.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: "auto",
  });
  window.requestAnimationFrame(onAfterScroll);
}

function isFullyInViewport(rect: DOMRect): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

function buildOwnerOverlayBoxes(
  symbolId: string,
  state: OwnerOverlayState,
): OwnerOverlayBox[] {
  if (
    !symbolId.startsWith(STATIC_PREFIX) &&
    !symbolId.startsWith(ROUTE_PREFIX)
  ) {
    const label = labelFromSymbolId(symbolId);
    return findAllInstanceRectsBySymbolId(symbolId).map((rect, index) => ({
      symbolId,
      state,
      label,
      rect,
      index,
    }));
  }

  if (isLayoutRouteOwner(symbolId)) return [];

  const label = labelFromSymbolId(symbolId);
  const ownerElements = findOwnerElements(symbolId);
  const fixedOrStickyOwnerElements = ownerElements.filter(hasFixedOrStickyVisual);
  return (fixedOrStickyOwnerElements.length > 0
    ? fixedOrStickyOwnerElements
    : ownerElements
  )
    .map<OwnerOverlayBox | null>((el, index) => {
      const rect = getOwnerVisualRect(el);
      return rect
        ? {
            symbolId,
            state,
            label,
            ownerEl: el,
            index,
          }
        : null;
    })
    .filter((box): box is OwnerOverlayBox => box !== null);
}

function canUseOwnerOverlay(symbolId: string): boolean {
  if (
    !symbolId.startsWith(STATIC_PREFIX) &&
    !symbolId.startsWith(ROUTE_PREFIX)
  ) {
    return findAllInstanceRectsBySymbolId(symbolId).length > 0;
  }
  if (isLayoutRouteOwner(symbolId)) return false;
  return findOwnerElements(symbolId).length > 0;
}

function OwnerDomOverlayBox({ box }: { box: OwnerOverlayBox }) {
  const selected = box.state === "selected";
  const visual = selected ? OVERLAY_VISUALS.selected : OVERLAY_VISUALS.hovered;
  const floatingElRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<OverlayRect | null>(() => {
    const ownerRect =
      box.rect ?? (box.ownerEl ? getOwnerVisualRect(box.ownerEl) : null);
    return ownerRect ? rectToOverlayRect(ownerRect) : null;
  });
  const [labelPosition, setLabelPosition] =
    useState<FloatingLabelPosition | null>(null);

  useLayoutEffect(() => {
    if (box.rect) {
      setRect(rectToOverlayRect(box.rect));
      setLabelPosition(null);
      return;
    }

    const ownerEl = box.ownerEl;
    const floatingEl = floatingElRef.current;
    if (!ownerEl || !floatingEl) return;

    let active = true;
    const update = () => {
      if (!active || !ownerEl.isConnected) return;
      const nextRect = getOwnerVisualRect(ownerEl);
      if (!nextRect) {
        setRect(null);
        setLabelPosition(null);
        return;
      }

      const nextOverlayRect = rectToOverlayRect(nextRect);
      setRect((current) =>
        current && !overlayRectChanged(current, nextOverlayRect)
          ? current
          : nextOverlayRect,
      );

      const virtualOwner: VirtualElement = {
        getBoundingClientRect: () => nextRect,
      };
      void computePosition(virtualOwner, floatingEl, {
        placement: "top-start",
        strategy: "fixed",
        middleware: [offset(0), flip(), shift({ padding: 4 })],
      }).then(({ x, y }) => {
        if (!active) return;
        setLabelPosition((current) =>
          current &&
          Math.abs(current.left - x) <= 0.5 &&
          Math.abs(current.top - y) <= 0.5
            ? current
            : { left: x, top: y },
        );
      });
    };

    update();
    const cleanup = autoUpdate(ownerEl, floatingEl, update, {
      ancestorResize: true,
      ancestorScroll: true,
      animationFrame: true,
      elementResize: true,
      layoutShift: true,
    });
    return () => {
      active = false;
      cleanup();
    };
  }, [box.ownerEl, box.rect]);

  if (!rect) return null;

  const left = rect.left;
  const top = rect.top;
  const width = Math.max(0, rect.width);
  const height = Math.max(0, rect.height);

  return (
    <div
      data-rfm-overlay
      data-rfm-owner-overlay
      data-rfm-owner-overlay-id={box.symbolId}
      data-rfm-owner-overlay-state={box.state}
      className="rfm-owner-overlay-box"
      style={{
        position: "fixed",
        left,
        top,
        width,
        height,
        boxSizing: "border-box",
        outline: visual.outline,
        background: visual.background,
        pointerEvents: "none",
        zIndex: visual.zIndex,
      }}
    >
      <div
        data-rfm-owner-overlay-label
        ref={floatingElRef}
        style={{
          position: "fixed",
          top: labelPosition?.top ?? top,
          left: labelPosition?.left ?? left,
          borderRadius: "4px 4px 0 0",
          background: visual.labelBackground,
          color: "#ffffff",
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          fontSize: visual.labelFontSize,
          fontWeight: 600,
          lineHeight: 1.6,
          padding: "1px 7px",
          whiteSpace: "nowrap",
          maxWidth: "min(260px, calc(100vw - 12px))",
          overflow: "hidden",
          textOverflow: "ellipsis",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        {box.label}
      </div>
    </div>
  );
}

function getRouteManifest(): RfmRoute[] | null {
  const globalRoutes = globalThis as typeof globalThis & {
    __rfmNextRouteTree?: RfmRoute[];
    __rfmViteRoutes?: RfmRoute[];
  };

  return (
    globalRoutes.__rfmNextRouteTree ?? globalRoutes.__rfmViteRoutes ?? null
  );
}

function broadcastToGraph(
  ch: BroadcastChannel,
  allEntries: DocEntry[],
  selectedId: string,
  routes?: RfmRoute[] | null,
) {
  // 항상 fresh하게 계산 (unmount 반영)
  const mountedIds = new Set(
    findAllMountedRfmComponents().map((c) => c.symbolId),
  );
  let mountedEntries = allEntries.filter((e) => mountedIds.has(e.symbolId));
  const propTypesMap =
    (globalThis as unknown as { __rfmPropTypes?: PropTypesMap })
      .__rfmPropTypes ?? {};
  const fiberRelations = buildFiberRelationships();
  const staticJsx = (
    globalThis as unknown as { __rfmStaticJsx?: Record<string, string[]> }
  ).__rfmStaticJsx;
  const observedStaticOwnerKeys = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-rfm-static-owner], [data-rfm-static]",
    ),
  )
    .map((el) => el.dataset.rfmStaticOwner ?? el.dataset.rfmStatic ?? "")
    .filter((key) => key.includes("#"));
  if (staticJsx)
    mountedEntries = applyStaticEdges(
      mountedEntries,
      staticJsx,
      fiberRelations,
    );
  ch.postMessage({
    type: "graph-update",
    allEntries: mountedEntries,
    selectedId,
    propTypesMap,
    ...(staticJsx ? { staticJsx } : {}),
    fiberRelations,
    routes: routes ?? null,
    observedStaticOwnerKeys,
    currentPath: window.location.pathname,
  } satisfies MainToGraph);
  if (selectedId) {
    const props = serializeProps(getPropsForSymbolId(selectedId));
    ch.postMessage({
      type: "props-update",
      symbolId: selectedId,
      props,
    } satisfies MainToGraph);
  }
}

// ─── ComponentOverlay ─────────────────────────────────────────────────────────

export function ComponentOverlay({
  graph,
  active,
  onDeactivate,
  onOpenWorkspace,
  onGraphWindowOpen,
  config = {},
}: {
  graph: FlowmapGraph;
  active: boolean;
  onDeactivate: () => void;
  onOpenWorkspace?: (() => void) | undefined;
  onGraphWindowOpen?: () => void;
  config?: FlowmapConfig;
}) {
  const [stack, setStack] = useState<FoundComp[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [highlightTarget, setHighlightTarget] = useState<{
    symbolId: string;
    el?: HTMLElement | null;
    els?: HTMLElement[];
  } | null>(null);
  const [routeRect, setRouteRect] = useState<{
    rect: DOMRect;
    label: string;
  } | null>(null);
  const [routeHoverRect, setRouteHoverRect] = useState<{
    rect: DOMRect;
    label: string;
  } | null>(null);
  const [ownerHoverId, setOwnerHoverId] = useState("");
  const [graphWindowOpen, setGraphWindowOpen] = useState(false);
  const graphWinRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const graphWindowOpenRef = useRef(false);
  const routeSyncTimersRef = useRef<number[]>([]);
  const [shadowContainer, setShadowContainer] = useState<HTMLElement | null>(
    null,
  );

  const routes = getRouteManifest();
  const [picking, setPicking] = useState(false);
  // ref 교체 후 re-render 강제용 (setSelectedId가 동일값이면 React가 스킵하므로)
  const [, forceRender] = useState(0);
  // 클릭으로 선택된 특정 DOM 요소 — 같은 symbolId가 여러 개일 때 정확한 요소를 기억
  const selectedElRef = useRef<HTMLElement | null>(null);
  // MutationObserver 콜백에서 최신 selectedId 참조용
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const onDeactivateRef = useRef(onDeactivate);
  useEffect(() => {
    onDeactivateRef.current = onDeactivate;
  }, [onDeactivate]);

  useEffect(() => {
    graphWindowOpenRef.current = graphWindowOpen;
    if (!graphWindowOpen) clearRouteSyncTimers();
  }, [graphWindowOpen]);

  function clearRouteSyncTimers() {
    for (const timer of routeSyncTimersRef.current) {
      window.clearTimeout(timer);
    }
    routeSyncTimersRef.current = [];
  }

  function broadcastCurrentGraphState() {
    if (!graphWindowOpenRef.current || !channelRef.current) return;
    const { mountedEntries, routes: currentRoutes } = currentDataRef.current;
    broadcastToGraph(channelRef.current, mountedEntries, selectedIdRef.current, currentRoutes);
  }

  function scheduleRouteGraphSync() {
    if (!graphWindowOpenRef.current) return;
    clearRouteSyncTimers();
    for (const delay of [0, 120, 360]) {
      const timer = window.setTimeout(() => {
        invalidateMountedRfmSnapshot();
        setDomVersion((v) => v + 1);
        broadcastCurrentGraphState();
      }, delay);
      routeSyncTimersRef.current.push(timer);
    }
  }

  // 채널 핸들러에서 최신 값 참조용 (stale closure 방지)
  const currentDataRef = useRef<{
    mountedEntries: DocEntry[]; // allEntries 저장 (broadcastToGraph 내부에서 fresh mount 계산)
    selectedId: string;
    routes: RfmRoute[] | null;
  }>({ mountedEntries: [], selectedId: "", routes: null });

  // shadow root ref — CSS 동기화에 재사용
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  // inspectorCss를 shadow root에 주입
  // inspector.css는 @source inline()으로 필요한 모든 유틸리티 클래스를 자체 포함.
  // 호스트 앱 CSS는 복사하지 않음 — 호스트의 unlayered 전역 스타일(* { padding:0 } 등)이
  // shadow DOM 안의 @layer utilities 클래스를 덮어쓰는 것을 막기 위함.
  function syncShadowStyles(shadow: ShadowRoot) {
    shadow
      .querySelectorAll("style[data-rfm-shadow]")
      .forEach((el) => el.remove());
    const style = document.createElement("style");
    style.setAttribute("data-rfm-shadow", "");
    style.textContent = inspectorCss;
    shadow.appendChild(style);
  }

  // @property 규칙을 main document에 주입
  // Chrome은 shadow DOM 안의 @property를 무시하므로 main document에 별도 주입 필요.
  // 호스트 앱에 Tailwind가 없으면 --tw-translate-y 등 CSS 변수가 초기화되지 않아 transform이 깨짐.
  function syncPropertyRules() {
    document.head.querySelector("style[data-rfm-props]")?.remove();
    const matches = inspectorCss.match(/@property\s+[^{]+\{[^}]+\}/g);
    if (!matches) return;
    const style = document.createElement("style");
    style.setAttribute("data-rfm-props", "");
    style.textContent = matches.join("\n");
    document.head.appendChild(style);
  }

  // Shadow DOM 설정 — 한 번만 실행 (페인트 전에 동기 실행)
  useLayoutEffect(() => {
    const host = document.createElement("div");
    host.setAttribute("data-rfm-overlay", "");
    host.setAttribute("data-rfm-shadow-host", "");
    host.style.cssText =
      "position:fixed;top:0;left:0;overflow:visible;z-index:2147483647;";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadowRootRef.current = shadow;
    syncShadowStyles(shadow);
    syncPropertyRules();

    const container = document.createElement("div");
    shadow.appendChild(container);
    setShadowContainer(container);

    return () => {
      host.remove();
      clearRouteSyncTimers();
      document.head.querySelector("style[data-rfm-props]")?.remove();
      shadowRootRef.current = null;
      setShadowContainer(null);
    };
  }, []);

  // dev HMR: inspectorCss 자체가 바뀌면 재동기화
  useEffect(() => {
    if (shadowRootRef.current) syncShadowStyles(shadowRootRef.current);
    syncPropertyRules();
  }, [inspectorCss]);

  // ── BroadcastChannel (그래프 창 연동) ─────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const ch = new BroadcastChannel(RFM_CHANNEL);
    channelRef.current = ch;

    ch.onmessage = (ev: MessageEvent<GraphToMain>) => {
      const msg = ev.data;
      if (msg.type === "ready") {
        // 그래프 창 준비 완료 → 현재 상태 즉시 전송
        const {
          mountedEntries,
          selectedId: sid,
          routes: currentRoutes,
        } = currentDataRef.current;
        broadcastToGraph(ch, mountedEntries, sid, currentRoutes);
      } else if (msg.type === "select") {
        if (msg.symbolId.startsWith(ROUTE_PREFIX)) {
          // 그래프 창에서 static route context 선택 → DOM owner가 있으면 실제 영역, 없으면 viewport fallback
          const fp = msg.symbolId.slice(ROUTE_PREFIX.length);
          const currentRoutes = getRouteManifest() ?? [];
          const route = currentRoutes.find((r) => r.filePath === fp) ?? null;
          if (route) {
            setSelectedId(msg.symbolId);
            selectedElRef.current = null;
            if (findOwnerElements(msg.symbolId).length > 0) {
              setRouteRect(null);
              ensureOwnerVisible(msg.symbolId, () => {
                forceRender((n) => n + 1);
              });
            } else {
              const rect = computeRouteRect();
              setRouteRect({ rect, label: route.componentName });
            }
          } else {
            setRouteRect(null);
          }
        } else if (msg.symbolId.startsWith(STATIC_PREFIX)) {
          setSelectedId(msg.symbolId);
          selectedElRef.current = null;
          setRouteRect(null);
          ensureOwnerVisible(msg.symbolId, () => {
            forceRender((n) => n + 1);
          });
        } else {
          setSelectedId(msg.symbolId);
          setRouteRect(null);
          const el = findElBySymbolId(msg.symbolId);
          selectedElRef.current = el;
          el?.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "auto",
          });
          window.requestAnimationFrame(() => {
            forceRender((n) => n + 1);
          });
          const props = serializeProps(getPropsForSymbolId(msg.symbolId));
          ch.postMessage({
            type: "props-update",
            symbolId: msg.symbolId,
            props,
          } satisfies MainToGraph);
        }
      } else if (msg.type === "hover") {
        if (msg.symbolId.startsWith(ROUTE_PREFIX)) {
          // 그래프 창에서 static route context 호버 → DOM owner가 있으면 실제 영역, 없으면 viewport fallback
          setHighlightTarget(null);
          const fp = msg.symbolId.slice(ROUTE_PREFIX.length);
          const currentRoutes = getRouteManifest() ?? [];
          const route = currentRoutes.find((r) => r.filePath === fp) ?? null;
          if (route && findOwnerElements(msg.symbolId).length > 0) {
            setRouteHoverRect(null);
            setOwnerHoverId(msg.symbolId);
          } else if (route) {
            setOwnerHoverId("");
            const rect = computeRouteRect();
            setRouteHoverRect({ rect, label: route.componentName });
          } else {
            setOwnerHoverId("");
            setRouteHoverRect(null);
          }
        } else if (msg.symbolId.startsWith(STATIC_PREFIX)) {
          setHighlightTarget(null);
          setRouteHoverRect(null);
          setOwnerHoverId(msg.symbolId);
        } else {
          setHighlightTarget(null);
          setRouteHoverRect(null);
          setOwnerHoverId(msg.symbolId);
        }
      } else if (msg.type === "hover-end") {
        setHighlightTarget(null);
        setRouteHoverRect(null);
        setOwnerHoverId("");
      } else if (msg.type === "pick-start") {
        setPicking(true);
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [active]);

  const index = useMemo(() => buildDocIndex(graph), [graph]);
  const graphEntries = useMemo(
    () => [...index.pages, ...index.components],
    [index],
  );

  // DOM 커밋 이후 fiber-walk를 재실행하기 위한 trigger
  // useMemo는 render 도중 실행되므로 최초 렌더 시 DOM이 없어 fiber-walk 결과가 비어있음.
  // mount 후 setState로 deps를 변경해 allEntries를 DOM이 존재하는 시점에 다시 계산함.
  // domVersion은 라우트 전환 등 DOM 변경 시 fiber-walk를 재실행하기 위한 카운터.
  const [domVersion, setDomVersion] = useState(0);
  useEffect(() => {
    // 첫 마운트 후 즉시 실행 (domReady 역할 포함)
    invalidateMountedRfmSnapshot();
    setDomVersion((v) => v + 1);
    if (!active) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      invalidateMountedRfmSnapshot();
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => setDomVersion((v) => v + 1), 200);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      if (debounceId) clearTimeout(debounceId);
    };
  }, [active]);

  // 그래프에 없지만 DOM에 존재하는 컴포넌트 (App 등 루트 컴포넌트)
  const allEntries = useMemo(() => {
    if (domVersion === 0) return [...graphEntries];
    const graphIds = new Set(graphEntries.map((e) => e.symbolId));
    const extra: DocEntry[] = [];
    findAllMountedRfmComponents().forEach(({ symbolId }) => {
      if (graphIds.has(symbolId)) return;
      const match = symbolId.match(/^symbol:(.+)#(.+)$/);
      if (!match) return;
      const filePath = match[1]!;
      const name = deriveDisplayName(match[2]!, filePath);
      extra.push({
        symbolId,
        name,
        filePath,
        category: "component",
        renders: [],
        renderedBy: [],
        uses: [],
        usedBy: [],
        apiCalls: [],
      });
      graphIds.add(symbolId);
    });
    return [...graphEntries, ...extra];
  }, [graphEntries, domVersion]);

  // 채널 핸들러에서 최신 값 참조용 ref 동기화
  useEffect(() => {
    currentDataRef.current = { mountedEntries: allEntries, selectedId, routes };
  }, [allEntries, selectedId, routes]);

  // allEntries / selectedId 변경 시 그래프 창에 브로드캐스트
  useEffect(() => {
    if (!graphWindowOpen || !channelRef.current) return;
    broadcastToGraph(channelRef.current, allEntries, selectedId, routes);
  }, [allEntries, selectedId, graphWindowOpen, routes]);

  // popup refresh는 유지하고, 실제 close일 때만 inspector를 정리한다.
  useEffect(() => {
    if (!graphWindowOpen) return;

    const intervalId = window.setInterval(() => {
      const graphWindow = graphWinRef.current;
      if (graphWindow && !graphWindow.closed) {
        return;
      }

      window.clearInterval(intervalId);
      setGraphWindowOpen(false);
      graphWinRef.current = null;
      onDeactivateRef.current();
    }, 400);

    return () => window.clearInterval(intervalId);
  }, [graphWindowOpen]);

  // DOM 변화(mount/unmount) 감지 → 그래프창 재동기화
  useEffect(() => {
    if (!graphWindowOpen) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      invalidateMountedRfmSnapshot();
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (channelRef.current) {
          broadcastToGraph(
            channelRef.current,
            allEntries,
            selectedIdRef.current,
            currentDataRef.current.routes,
          );
        }
      }, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      if (debounceId) clearTimeout(debounceId);
    };
  }, [graphWindowOpen, allEntries]);

  // pick 완료 시 그래프 창으로 결과 전달
  const prevPickingRef = useRef(false);
  useEffect(() => {
    if (
      prevPickingRef.current &&
      !picking &&
      selectedId &&
      graphWindowOpen &&
      channelRef.current
    ) {
      channelRef.current.postMessage({
        type: "pick-result",
        symbolId: selectedId,
      } satisfies MainToGraph);
    }
    prevPickingRef.current = picking;
  }, [picking, selectedId, graphWindowOpen]);

  function openGraphWindow() {
    if (graphWinRef.current && !graphWinRef.current.closed) {
      graphWinRef.current.focus();
      return true;
    }
    // 현재 URL에 ?__rfm=graph 추가 — 별도 라우트 불필요, 모든 프레임워크 동작
    const url = new URL(window.location.href);
    url.searchParams.set("__rfm", "graph");
    const win = window.open(
      url.toString(),
      "rfm-graph",
      "width=1200,height=800",
    );
    if (!win) return false;
    graphWinRef.current = win;
    setGraphWindowOpen(true);
    onGraphWindowOpen?.();
    setTimeout(() => {
      const {
        mountedEntries,
        selectedId: currentSelectedId,
        routes: currentRoutes,
      } = currentDataRef.current;
      if (channelRef.current) {
        broadcastToGraph(
          channelRef.current,
          mountedEntries,
          currentSelectedId,
          currentRoutes,
        );
      }
    }, 600);
    return true;
  }

  // 패널 열림/닫힘
  useEffect(() => {
    if (!active) {
      setPicking(false);
      setStack([]);
      setSelectedId("");
      setOwnerHoverId("");
      selectedElRef.current = null;
    }
  }, [active]);

  // 라우터 전환 시 선택 상태 초기화 → 트리뷰로 복귀
  // TanStack Router / React Router / Next.js 모두 history.pushState|replaceState 사용
  useEffect(() => {
    if (!active) return;
    let resetTimer: number | null = null;
    function reset() {
      resetTimer = null;
      setSelectedId("");
      selectedIdRef.current = "";
      selectedElRef.current = null;
      setStack([]);
      setPicking(false);
      setOwnerHoverId("");
      setRouteRect(null);
      setRouteHoverRect(null);
      setHighlightTarget(null);
      invalidateMountedRfmSnapshot();
      setDomVersion((v) => v + 1);
      scheduleRouteGraphSync();
    }
    function scheduleReset() {
      if (resetTimer !== null) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(reset, 0);
    }
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      origPush(...args);
      scheduleReset();
    };
    history.replaceState = (
      ...args: Parameters<typeof history.replaceState>
    ) => {
      origReplace(...args);
      scheduleReset();
    };
    window.addEventListener("popstate", scheduleReset);
    return () => {
      window.removeEventListener("popstate", scheduleReset);
      if (resetTimer !== null) window.clearTimeout(resetTimer);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, [active]);

  // 리사이즈/스크롤 시 선택 박스 위치 갱신
  useEffect(() => {
    if (!active) return;
    function refresh() {
      forceRender((n) => n + 1);
    }
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [active]);

  // 선택된 DOM 요소가 unmount(페이지 전환·필터)되면 대체 인스턴스 탐색 or 선택 해제
  useEffect(() => {
    if (!active) return;
    const observer = new MutationObserver(() => {
      invalidateMountedRfmSnapshot();
      if (!selectedElRef.current || selectedElRef.current.isConnected) return;
      const id = selectedIdRef.current;
      const fallback = id ? findElBySymbolId(id) : null;
      if (fallback) {
        // 같은 컴포넌트의 다른 인스턴스가 남아 있으면 교체 후 re-render 강제
        selectedElRef.current = fallback;
        forceRender((n) => n + 1);
      } else {
        // 인스턴스가 전혀 없으면 선택 해제 → 트리 뷰로
        selectedElRef.current = null;
        setSelectedId("");
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);

  // 피킹 모드 — 마우스/클릭 이벤트 (picking일 때만 활성)
  useEffect(() => {
    if (!picking) {
      document.body.style.cursor = "";
      return;
    }

    document.body.style.cursor = "crosshair";

    let rafId = 0;
    function onMove(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("[data-rfm-overlay]")) return;
      const x = e.clientX,
        y = e.clientY;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const found = findComponentsAt(x, y);
        setStack(found);
      });
    }

    function onClickApp(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("[data-rfm-overlay]")) return;
      const found = findComponentsAt(e.clientX, e.clientY);
      if (found[0]) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(found[0].symbolId);
        selectedElRef.current = found[0].el;
        setPicking(false); // 선택 완료 → 피킹 종료, 패널은 유지
        setStack([]);
      }
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClickApp, true);
    return () => {
      document.body.style.cursor = "";
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClickApp, true);
    };
  }, [picking]);

  // Escape: 피킹 중이면 피킹 취소, 아니면 패널 닫기
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (picking) {
        setPicking(false);
        setStack([]);
      } else {
        onDeactivateRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [picking]);

  // 호버 중인 가장 구체적 컴포넌트 (amber 프리뷰)
  const hoveredComp = stack[0] ?? null;
  // 액티브 선택 rect: 스택에서 먼저, 없으면 DOM 쿼리
  // 선택된 요소와 동일한 DOM 요소일 때만 stack에서 rect 취득 (다른 인스턴스는 무시)
  const selectedComp =
    stack.find(
      (c) =>
        c.symbolId === selectedId &&
        (!selectedElRef.current || c.el === selectedElRef.current),
    ) ?? null;
  let selectedRect: DOMRect | null = selectedComp?.rect ?? null;
  if (!selectedRect && selectedId && selectedElRef.current?.isConnected) {
    selectedRect = findComponentRectByEl(selectedElRef.current, selectedId);
  }
  if (!selectedRect && selectedId) {
    selectedRect = findUnionRectBySymbolId(selectedId);
  }
  const selectedUsesOwnerHighlight = selectedId
    ? canUseOwnerOverlay(selectedId)
    : false;
  if (selectedUsesOwnerHighlight) {
    selectedRect = null;
  }

  // 동일 symbolId라도 다른 DOM 요소면 hover로 표시 (리스트 아이템 구분)
  const showHoverBox =
    hoveredComp &&
    (hoveredComp.symbolId !== selectedId ||
      (selectedElRef.current !== null &&
        hoveredComp.el !== selectedElRef.current));
  const hoveredLabel = hoveredComp?.symbolId.split("#").at(-1) ?? "";
  const selectedLabel = selectedId.split("#").at(-1) ?? "";
  const activeSelectionRect =
    selectedUsesOwnerHighlight || selectedId.startsWith(STATIC_PREFIX)
      ? null
      : routeRect;
  const activeHoverRect = ownerHoverId ? null : routeHoverRect;
  const ownerOverlayBoxes = [
    ...(selectedUsesOwnerHighlight && selectedId
      ? buildOwnerOverlayBoxes(selectedId, "selected")
      : []),
    ...(ownerHoverId && ownerHoverId !== selectedId
      ? buildOwnerOverlayBoxes(ownerHoverId, "hovered")
      : []),
  ];

  function handleButtonClick() {
    if (openGraphWindow()) {
      onOpenWorkspace?.();
    }
  }

  if (!shadowContainer) return null;

  if (!active || !graphWindowOpen) {
    return createPortal(
      <InspectButton
        onClick={handleButtonClick}
        positionOverride={config.buttonPosition}
      />,
      shadowContainer,
    );
  }

  return (
    <>
      {createPortal(
        <>
          {/* Static route/component hover preview */}
          {activeHoverRect && (
            <HoverPreviewBox
              rect={activeHoverRect.rect}
              label={activeHoverRect.label}
            />
          )}

          {/* 사이드바 Relations 노드 hover → DOM 하이라이트 */}
          {highlightTarget &&
            (() => {
              const label = highlightTarget.symbolId.split("#").at(-1) ?? "";
              const exactRects = (highlightTarget.els ?? [])
                .map((el) =>
                  findComponentRectByEl(el, highlightTarget.symbolId),
                )
                .filter(
                  (rect): rect is DOMRect => rect !== null && isVisible(rect),
                );
              const exactRect = highlightTarget.el
                ? findComponentRectByEl(
                    highlightTarget.el,
                    highlightTarget.symbolId,
                  )
                : null;

              if (exactRects.length > 0) {
                return exactRects.map((rect, i) => (
                  <HoverPreviewBox
                    key={`${highlightTarget.symbolId}-${i}`}
                    rect={rect}
                    label={label}
                  />
                ));
              }

              if (exactRect && isVisible(exactRect)) {
                return <HoverPreviewBox rect={exactRect} label={label} />;
              }

              const rects = findAllInstanceRectsBySymbolId(
                highlightTarget.symbolId,
              );
              return rects.map((rect, i) =>
                isVisible(rect) ? (
                  <HoverPreviewBox key={i} rect={rect} label={label} />
                ) : null,
              );
            })()}

          {/* 호버 프리뷰: 점선 — 피킹 중일 때만 */}
          {picking && showHoverBox && (
            <HoverPreviewBox rect={hoveredComp.rect} label={hoveredLabel} />
          )}

          {/* 액티브 선택: 실선 */}
          {selectedRect && (
            <ActiveSelectBox rect={selectedRect} label={selectedLabel} />
          )}

          {/* Static route/component selection: live component selection이 없을 때만 */}
          {!selectedRect && activeSelectionRect && (
            <ActiveSelectBox
              rect={activeSelectionRect.rect}
              label={activeSelectionRect.label}
            />
          )}
        </>,
        shadowContainer,
      )}
      {ownerOverlayBoxes.length > 0 &&
        createPortal(
          <>
            {ownerOverlayBoxes.map((box) => (
              <OwnerDomOverlayBox
                key={`${box.state}:${box.symbolId}:${box.index}`}
                box={box}
              />
            ))}
          </>,
          document.body,
        )}
    </>
  );
}
