import type { DockPosition, DomRelNode, FoundComp } from './types';
import { SIDEBAR_W, BOTTOM_H } from './tokens';
import {
  EDITOR_OPTIONS,
  EDITOR_SELECTION_STORAGE_KEY,
  isKnownEditorId,
  type KnownEditorId,
} from '../../editor.js';

// ─── Dock persistence ─────────────────────────────────────────────────────────

export function loadDock(): DockPosition {
  try { return (localStorage.getItem('rfm-dock') as DockPosition) ?? 'right'; } catch { return 'right'; }
}

export function saveDock(pos: DockPosition) {
  try { localStorage.setItem('rfm-dock', pos); } catch { /* noop */ }
}

export function saveFloatPos(pos: { x: number; y: number }) {
  try { localStorage.setItem('rfm-float-pos', JSON.stringify(pos)); } catch { /* noop */ }
}

// ─── Sidebar style ────────────────────────────────────────────────────────────

export function sidebarStyle(dock: DockPosition, floatPos: { x: number; y: number }): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    zIndex: 10000, display: 'flex', flexDirection: 'column',
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    overflow: 'hidden',
  };
  if (dock === 'right')  return { ...base, top: 0, right: 0, bottom: 0, width: SIDEBAR_W, borderLeft: '1px solid rgba(229,231,235,0.7)', boxShadow: '-4px 0 32px rgba(23,37,84,0.08)' };
  if (dock === 'left')   return { ...base, top: 0, left: 0, bottom: 0, width: SIDEBAR_W, borderRight: '1px solid rgba(229,231,235,0.7)', boxShadow: '4px 0 32px rgba(23,37,84,0.08)' };
  if (dock === 'bottom') return { ...base, left: 0, right: 0, bottom: 0, height: BOTTOM_H, borderTop: '1px solid rgba(229,231,235,0.7)', boxShadow: '0 -4px 32px rgba(23,37,84,0.08)' };
  // float
  return {
    ...base,
    top: floatPos.y, left: floatPos.x,
    width: SIDEBAR_W, maxHeight: '90dvh',
    borderRadius: 14,
    border: '1px solid rgba(229,231,235,0.8)',
    boxShadow: '0 4px 6px rgba(23,37,84,0.04), 0 12px 32px rgba(23,37,84,0.10), 0 32px 64px rgba(23,37,84,0.06)',
  };
}

// ─── Visibility helpers ───────────────────────────────────────────────────────

export function isVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 && rect.height > 0 &&
    rect.bottom > 0 && rect.right > 0 &&
    rect.top < window.innerHeight && rect.left < window.innerWidth
  );
}

export function clipToViewport(rect: DOMRect) {
  const l = Math.max(0, rect.left);
  const t = Math.max(0, rect.top);
  const r = Math.min(window.innerWidth,  rect.right);
  const b = Math.min(window.innerHeight, rect.bottom);
  return { left: l, top: t, width: Math.max(0, r - l), height: Math.max(0, b - t) };
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

export function getDomDepth(el: HTMLElement): number {
  let d = 0, cur: Element | null = el;
  while (cur) { d++; cur = cur.parentElement; }
  return d;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function shortenPath(p: string) {
  return p.replace(/^demo\/src\//, '').replace(/^src\//, '');
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/^demo\//, '');
}

// ─── Editor open ──────────────────────────────────────────────────────────────

let _editorOverride: string | null = null;

/** ReactFlowMap config.editor에서 설정된 에디터 커맨드를 저장 */
export function setEditorOverride(editor: string | undefined) {
  _editorOverride = editor ?? null;
}

export type EditorSelection = 'project' | KnownEditorId;

export type AvailableEditor = {
  id: KnownEditorId;
  label: string;
  available: boolean;
};

export type EditorAvailability = {
  defaultEditor: KnownEditorId | null;
  defaultLabel: string;
  editors: AvailableEditor[];
};

export const DEFAULT_EDITOR_AVAILABILITY: EditorAvailability = {
  defaultEditor: 'code',
  defaultLabel: 'VS Code',
  editors: EDITOR_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    available: option.id === 'code',
  })),
};

export const EDITOR_SELECTION_EVENT = 'rfm-editor-selection-change';

function getOpenBase(): string {
  // Next.js: globalThis.__rfmOpenUrl = 'http://127.0.0.1:51423' (사이드카)
  // Vite: undefined → 상대 URL로 fallback (Vite 미들웨어 처리)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).__rfmOpenUrl ?? '';
}

export function getStoredEditorSelection(): KnownEditorId | null {
  try {
    const value = localStorage.getItem(EDITOR_SELECTION_STORAGE_KEY);
    return isKnownEditorId(value) ? value : null;
  } catch {
    return null;
  }
}

export function setStoredEditorSelection(selection: EditorSelection): void {
  try {
    if (selection === 'project') {
      localStorage.removeItem(EDITOR_SELECTION_STORAGE_KEY);
    } else {
      localStorage.setItem(EDITOR_SELECTION_STORAGE_KEY, selection);
    }
  } catch {
    // noop
  }

  window.dispatchEvent(new CustomEvent(EDITOR_SELECTION_EVENT, {
    detail: { selection },
  }));
}

export async function fetchEditorAvailability(): Promise<EditorAvailability> {
  try {
    const res = await fetch(`${getOpenBase()}/__rfm-editors`);
    if (!res.ok) return DEFAULT_EDITOR_AVAILABILITY;
    const data = await res.json() as EditorAvailability;
    return {
      defaultEditor: isKnownEditorId(data.defaultEditor)
        ? data.defaultEditor
        : DEFAULT_EDITOR_AVAILABILITY.defaultEditor,
      defaultLabel: typeof data.defaultLabel === 'string'
        ? data.defaultLabel
        : DEFAULT_EDITOR_AVAILABILITY.defaultLabel,
      editors: Array.isArray(data.editors) && data.editors.length > 0
        ? data.editors.filter((editor) => isKnownEditorId(editor.id))
        : DEFAULT_EDITOR_AVAILABILITY.editors,
    };
  } catch {
    return DEFAULT_EDITOR_AVAILABILITY;
  }
}

export function openInEditor(filePath: string, symbolId: string, loc?: string | null) {
  const base = getOpenBase();
  const params = new URLSearchParams({ file: filePath, symbolId });
  if (loc) params.set('line', loc);
  const selectedEditor = getStoredEditorSelection() ?? _editorOverride;
  if (selectedEditor) params.set('editor', selectedEditor);
  fetch(`${base}/__rfm-open?${params.toString()}`).catch(() => {});
}

// ─── React Fiber types & helpers ─────────────────────────────────────────────

type RfmFn = ((...args: unknown[]) => unknown) & {
  __rfm_symbolId?: string;
  __rfm_loc?: string;
};
type FiberNode = {
  type: unknown;
  return: FiberNode | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  stateNode: unknown;
  memoizedProps: Record<string, unknown> | null;
};

type MountedRfmComponent = {
  symbolId: string;
  loc: string | null;
};

type MountedRfmInstance = MountedRfmComponent & {
  probeEl: HTMLElement;
  fallbackHostEl: HTMLElement;
};

type MountedRfmSnapshot = {
  mountedComponents: MountedRfmComponent[];
  instancesBySymbolId: Map<string, MountedRfmInstance[]>;
  fiberRelationships: Record<string, string[]>;
};

let mountedRfmSnapshotCache: MountedRfmSnapshot | null = null;

/** Unwrap React.memo / React.forwardRef to get the underlying RFM-instrumented function. */
function getRfmFn(type: unknown): RfmFn | null {
  if (typeof type === 'function') {
    const fn = type as RfmFn;
    return fn.__rfm_symbolId ? fn : null;
  }
  if (type && typeof type === 'object') {
    // React.memo  → { $$typeof, type: Comp }
    // React.forwardRef → { $$typeof, render: Comp }
    const inner = (type as { type?: unknown; render?: unknown }).type
               ?? (type as { type?: unknown; render?: unknown }).render;
    if (typeof inner === 'function') {
      const fn = inner as RfmFn;
      return fn.__rfm_symbolId ? fn : null;
    }
  }
  return null;
}

/** True for fiber types that represent a real component boundary.
 *  Only plain functions and React.memo/forwardRef object wrappers are boundaries.
 *  Everything else (Fragment, null, Context.Provider, Consumer, Lazy, Offscreen, etc.)
 *  is treated as a transparent wrapper that should be descended through. */
function isComponentBoundary(type: unknown): boolean {
  if (typeof type === 'function') return true;
  if (type && typeof type === 'object') {
    const $t = (type as { $$typeof?: unknown }).$$typeof;
    return $t === Symbol.for('react.memo') || $t === Symbol.for('react.forward_ref');
  }
  return false;
}

/** Derive a user-friendly display name for components auto-generated by routers.
 *  TanStack Router's Vite plugin extracts anonymous route components as `TSRComponent`,
 *  `TSRIndexComponent`, etc. — map those back to the filename. */
export function deriveDisplayName(rawName: string, filePath: string): string {
  if (/^TSR(Index|Error|Pending|NotFound)?Component$/.test(rawName)) {
    const base = filePath.replace(/\.[jt]sx?$/, '').split(/[/\\]/).pop() ?? '';
    const cleaned = base.replace(/^[_]+/, '').replace(/[^a-zA-Z0-9]/g, '_');
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return capitalized || rawName;
  }
  return rawName;
}

function getFiberFromEl(el: Element): FiberNode | null {
  const key = Object.keys(el).find(
    k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  );
  return key ? ((el as unknown as Record<string, FiberNode>)[key] ?? null) : null;
}

/** First host DOM element in a fiber's subtree (follows .child chain). */
function getFirstHostEl(fiber: FiberNode | null): HTMLElement | null {
  let f = fiber;
  while (f) {
    if (typeof f.type === 'string' && f.stateNode instanceof HTMLElement) return f.stateNode;
    f = f.child;
  }
  return null;
}

/** All top-level host elements of a component's render output.
 *  Stops at component boundaries (functions, memo, forwardRef).
 *  Descends through everything else: Fragment, Context.Provider/Consumer,
 *  React.lazy, Offscreen, etc. */
function getRootHostEls(fiber: FiberNode | null): HTMLElement[] {
  const els: HTMLElement[] = [];
  function collect(f: FiberNode | null) {
    let cur = f;
    while (cur) {
      if (typeof cur.type === 'string' && cur.stateNode instanceof HTMLElement) {
        // Host element (div, nav, section, …)
        els.push(cur.stateNode);
      } else if (isComponentBoundary(cur.type)) {
        // Component boundary — take first host el, don't recurse deeper
        const hostEl = getFirstHostEl(cur.child);
        if (hostEl) els.push(hostEl);
      } else {
        // Transparent wrapper (Fragment, null, Context.Provider, lazy, …) — recurse
        collect(cur.child);
      }
      cur = cur.sibling;
    }
  }
  collect(fiber);
  return els;
}

/** Union DOMRect of multiple elements. Falls back to first element's rect if only one. */
function unionRects(els: HTMLElement[]): DOMRect | null {
  if (els.length === 0) return null;
  let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return new DOMRect(left, top, right - left, bottom - top);
}

/** Walk up fiber chain to find the nearest ancestor component fiber with __rfm_symbolId. */
function getCompFiber(fiber: FiberNode | null): FiberNode | null {
  let f = fiber;
  while (f) {
    if (getRfmFn(f.type)) return f;
    f = f.return;
  }
  return null;
}

function createMountedRfmWalker(): TreeWalker {
  return document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return (node as HTMLElement).hasAttribute('data-rfm-overlay')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
}

function buildMountedRfmSnapshot(): MountedRfmSnapshot {
  if (!document.body) {
    return {
      mountedComponents: [],
      instancesBySymbolId: new Map<string, MountedRfmInstance[]>(),
      fiberRelationships: {},
    };
  }

  const mountedComponents: MountedRfmComponent[] = [];
  const instancesBySymbolId = new Map<string, MountedRfmInstance[]>();
  const fiberRelationships = new Map<string, Set<string>>();
  const seenSymbols = new Set<string>();
  const seenFibers = new Set<FiberNode>();
  const walker = createMountedRfmWalker();

  let node: Node | null = document.body;
  while (node) {
    const el = node as HTMLElement;
    const fiber = getFiberFromEl(el);

    if (fiber) {
      let f: FiberNode | null = fiber;

      while (f) {
        const fn = getRfmFn(f.type);
        const symbolId = fn?.__rfm_symbolId;

        if (symbolId && !seenFibers.has(f)) {
          seenFibers.add(f);

          const instance: MountedRfmInstance = {
            symbolId,
            loc: fn.__rfm_loc ?? null,
            probeEl: el,
            fallbackHostEl: getFirstHostEl(f.child) ?? el,
          };

          const instances = instancesBySymbolId.get(symbolId);
          if (instances) {
            instances.push(instance);
          } else {
            instancesBySymbolId.set(symbolId, [instance]);
          }

          if (!seenSymbols.has(symbolId)) {
            seenSymbols.add(symbolId);
            mountedComponents.push({ symbolId, loc: fn.__rfm_loc ?? null });
          }

          let parent: FiberNode | null = f.return;
          while (parent) {
            const parentId = getRfmFn(parent.type)?.__rfm_symbolId;

            if (parentId && parentId !== symbolId) {
              if (!fiberRelationships.has(parentId)) {
                fiberRelationships.set(parentId, new Set<string>());
              }
              fiberRelationships.get(parentId)!.add(symbolId);
              break;
            }

            parent = parent.return;
          }
        }

        f = f.return;
      }
    }

    node = walker.nextNode();
  }

  return {
    mountedComponents,
    instancesBySymbolId,
    fiberRelationships: Object.fromEntries(
      [...fiberRelationships.entries()].map(([symbolId, childIds]) => [symbolId, [...childIds]])
    ),
  };
}

function getMountedRfmSnapshot(): MountedRfmSnapshot {
  if (!mountedRfmSnapshotCache) {
    mountedRfmSnapshotCache = buildMountedRfmSnapshot();
  }

  return mountedRfmSnapshotCache;
}

type LiveMountedRfmInstance = MountedRfmInstance & {
  fiber: FiberNode;
};

function getLiveMountedInstances(symbolId: string, retry = true): LiveMountedRfmInstance[] {
  const snapshot = getMountedRfmSnapshot();
  const instances = snapshot.instancesBySymbolId.get(symbolId) ?? [];
  const liveInstances: LiveMountedRfmInstance[] = [];

  for (const instance of instances) {
    const probeEl = instance.probeEl.isConnected ? instance.probeEl : instance.fallbackHostEl;
    if (!probeEl.isConnected) {
      continue;
    }

    const fiber = resolveSelfFiber(probeEl, symbolId);
    if (!fiber) {
      continue;
    }

    liveInstances.push({ ...instance, fiber });
  }

  if (liveInstances.length > 0 || instances.length === 0 || !retry) {
    return liveInstances;
  }

  invalidateMountedRfmSnapshot();
  return getLiveMountedInstances(symbolId, false);
}

function getLiveRootEls(instance: LiveMountedRfmInstance): HTMLElement[] {
  const rootEls = getRootHostEls(instance.fiber.child).filter((el) => el.isConnected);

  if (rootEls.length > 0) {
    return rootEls;
  }

  const fallbackHostEl = getFirstHostEl(instance.fiber.child) ?? instance.fallbackHostEl;
  return fallbackHostEl.isConnected ? [fallbackHostEl] : [];
}

export function invalidateMountedRfmSnapshot(): void {
  mountedRfmSnapshotCache = null;
}

export function findComponentRectByEl(el: HTMLElement, selfSymbolId?: string): DOMRect | null {
  const selfComp = resolveSelfFiber(el, selfSymbolId);
  if (!selfComp) {
    return null;
  }

  const rootEls = getRootHostEls(selfComp.child).filter((rootEl) => rootEl.isConnected);
  if (rootEls.length > 0) {
    return unionRects(rootEls);
  }

  const fallbackHostEl = getFirstHostEl(selfComp.child);
  if (fallbackHostEl?.isConnected) {
    return fallbackHostEl.getBoundingClientRect();
  }

  return el.isConnected ? el.getBoundingClientRect() : null;
}

export function getComponentPropsFromEl(el: HTMLElement): Record<string, unknown> | null {
  let fiber = getFiberFromEl(el);
  while (fiber) {
    if (typeof fiber.type === 'function' && fiber.memoizedProps) {
      return fiber.memoizedProps;
    }
    fiber = fiber.return;
  }
  return null;
}

/** Walk the entire DOM to find the fiber for a specific rfm symbolId and return its props.
 *  Returns `{}` if mounted but has no props, `null` if not currently mounted. */
export function getPropsForSymbolId(symbolId: string): Record<string, unknown> | null {
  const instances = getLiveMountedInstances(symbolId);

  for (const instance of instances) {
    return instance.fiber.memoizedProps ?? {};
  }

  return null;
}

// ─── Component finder (Fiber/static owner-based) ─────────────────────────────

const STATIC_OWNER_SELECTOR = '[data-rfm-static-owner], [data-rfm-static]';

function getStaticOwnerKey(el: HTMLElement): string | null {
  return el.dataset.rfmStaticOwner ?? el.dataset.rfmStatic ?? null;
}

function findStaticOwnerCandidate(domEl: Element): HTMLElement | null {
  if (!(domEl instanceof HTMLElement)) return null;
  return domEl.closest<HTMLElement>(STATIC_OWNER_SELECTOR);
}

function staticOwnerFoundComp(ownerEl: HTMLElement): FoundComp | null {
  const ownerKey = getStaticOwnerKey(ownerEl);
  if (!ownerKey || !ownerKey.includes('#')) return null;

  const rect = ownerEl.getBoundingClientRect();
  if (!isVisible(rect)) return null;

  return {
    symbolId: `static:${ownerKey}`,
    el: ownerEl,
    rect,
    depth: getDomDepth(ownerEl),
    loc: null,
  };
}

export function findComponentsAt(x: number, y: number): FoundComp[] {
  const found: FoundComp[] = [];
  const seen = new Set<string>();

  for (const domEl of document.elementsFromPoint(x, y)) {
    if (domEl instanceof HTMLElement && domEl.closest('[data-rfm-overlay]')) {
      continue;
    }

    const staticOwner = findStaticOwnerCandidate(domEl);
    if (staticOwner) {
      const staticComp = staticOwnerFoundComp(staticOwner);
      if (staticComp && !seen.has(staticComp.symbolId)) {
        seen.add(staticComp.symbolId);
        found.push(staticComp);
      }
    }

    let f: FiberNode | null = getFiberFromEl(domEl);
    while (f) {
      const fn = getRfmFn(f.type);
      if (fn && !seen.has(fn.__rfm_symbolId!)) {
        seen.add(fn.__rfm_symbolId!);
        const rootEls = getRootHostEls(f.child);
        const hostEl = rootEls[0] ?? (domEl as HTMLElement);
        const rect = unionRects(rootEls) ?? hostEl.getBoundingClientRect();
        if (isVisible(rect)) {
          found.push({
            symbolId: fn.__rfm_symbolId!,
            el: hostEl,
            rect,
            depth: getDomDepth(hostEl),
            loc: fn.__rfm_loc ?? null,
          });
        }
      }
      f = f.return;
    }
  }
  return found.sort((a, b) => {
    const da = a.rect.width * a.rect.height - b.rect.width * b.rect.height;
    if (Math.abs(da) > 100) return da;
    return b.depth - a.depth;
  });
}

// ─── Fiber-based relation finders ────────────────────────────────────────────

/** Walk fiber chain up from `el` to find the specific component fiber for `selfSymbolId`.
 *  Falls back to the nearest RFM component if selfSymbolId is not provided. */
function resolveSelfFiber(el: HTMLElement, selfSymbolId?: string): FiberNode | null {
  const base = getFiberFromEl(el);
  if (selfSymbolId) {
    let f: FiberNode | null = base;
    while (f) {
      const fn = getRfmFn(f.type);
      if (fn && fn.__rfm_symbolId === selfSymbolId) return f;
      f = f.return;
    }
    return null;
  }
  return getCompFiber(base);
}

/** Walk fiber subtree to collect direct (nearest) RFM child components. */
function collectDirectRfmChildren(
  fiber: FiberNode | null,
  selfId: string,
  results: DomRelNode[],
) {
  let cur = fiber;
  while (cur) {
    const fn = getRfmFn(cur.type);
    if (fn && fn.__rfm_symbolId !== selfId) {
      const id = fn.__rfm_symbolId!;
      results.push({
        symbolId: id,
        name: id.split('#').at(-1) ?? '',
        el: getFirstHostEl(cur.child) ?? getFirstHostEl(cur) ?? null,
      });
      // Don't recurse — its children are its own responsibility
    } else {
      // Transparent wrapper or same component — recurse into children
      collectDirectRfmChildren(cur.child, selfId, results);
    }
    cur = cur.sibling;
  }
}

function appendDomRelNode(
  nodes: DomRelNode[],
  symbolId: string,
  el?: HTMLElement | null,
): void {
  const existing = nodes.find((node) => node.symbolId === symbolId);
  const nextEl = el ?? null;

  if (existing) {
    existing.count = (existing.count ?? 1) + 1;

    if (nextEl) {
      const els = existing.els ?? (existing.el ? [existing.el] : []);
      if (!els.includes(nextEl)) {
        els.push(nextEl);
      }
      existing.els = els;
      if (!existing.el) {
        existing.el = nextEl;
      }
    }

    return;
  }

  nodes.push({
    symbolId,
    name: symbolId.split('#').at(-1) ?? '',
    ...(nextEl ? { el: nextEl, els: [nextEl] } : {}),
    count: 1,
  });
}

export function findDomParent(el: HTMLElement, selfSymbolId?: string): DomRelNode | null {
  const selfComp = resolveSelfFiber(el, selfSymbolId);
  if (!selfComp) return null;
  // Walk above selfComp to find first parent component
  let f: FiberNode | null = selfComp.return;
  while (f) {
    const fn = getRfmFn(f.type);
    if (fn) {
      return {
        symbolId: fn.__rfm_symbolId!,
        name: fn.__rfm_symbolId!.split('#').at(-1) ?? '',
        el: getFirstHostEl(f.child) ?? null,
      };
    }
    f = f.return;
  }
  return null;
}

export function findDomChildren(el: HTMLElement, selfSymbolId?: string): DomRelNode[] {
  const selfComp = resolveSelfFiber(el, selfSymbolId);
  if (!selfComp) return [];
  const selfId = selfSymbolId ?? getRfmFn(selfComp.type)?.__rfm_symbolId;
  if (!selfId) return [];

  if (selfSymbolId) {
    // Fiber-based: walk the component's fiber subtree directly (avoids DOM position issues)
    const rawResults: DomRelNode[] = [];
    collectDirectRfmChildren(selfComp.child, selfId, rawResults);
    const results: DomRelNode[] = [];
    for (const node of rawResults) {
      appendDomRelNode(results, node.symbolId, node.el);
    }
    return results;
  }

  // Original DOM-based approach for pick-mode (el is directly the component's root element)
  const results: DomRelNode[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = el;
  while (node) {
    const domEl = node as HTMLElement;
    const compFiber = getCompFiber(getFiberFromEl(domEl));
    if (compFiber) {
      const symbolId = getRfmFn(compFiber.type)?.__rfm_symbolId;
      if (symbolId && symbolId !== selfId) {
        let f: FiberNode | null = compFiber.return;
        while (f) {
          const fn = getRfmFn(f.type);
          if (fn) {
            if (fn.__rfm_symbolId === selfId) {
              appendDomRelNode(results, symbolId, getFirstHostEl(compFiber.child) ?? domEl);
            }
            break;
          }
          f = f.return;
        }
      }
    }
    node = walker.nextNode();
  }
  return results;
}

// ─── Fiber-based element finders ─────────────────────────────────────────────

/** Find the first mounted DOM element for a component by symbolId. */
export function findElBySymbolId(symbolId: string): HTMLElement | null {
  const instance = getLiveMountedInstances(symbolId)[0];

  if (!instance) {
    return null;
  }

  return getFirstHostEl(instance.fiber.child) ?? instance.fallbackHostEl;
}

/** Find all mounted DOM elements for a component by symbolId (multiple instances). */
export function findAllElsBySymbolId(symbolId: string): HTMLElement[] {
  return getLiveMountedInstances(symbolId).map((instance) =>
    getFirstHostEl(instance.fiber.child) ?? instance.fallbackHostEl
  );
}

/** Union rects for each mounted instance of a component (for highlight overlay). */
export function findAllInstanceRectsBySymbolId(symbolId: string): DOMRect[] {
  return getLiveMountedInstances(symbolId)
    .map((instance) => unionRects(getLiveRootEls(instance)))
    .filter((rect): rect is DOMRect => rect !== null);
}

/** Find a component's DOM element within a fiber subtree rooted at `root`. */
export function findElBySymbolIdInSubtree(root: HTMLElement, symbolId: string): HTMLElement | null {
  const rootCompFiber = getCompFiber(getFiberFromEl(root));
  if (!rootCompFiber) return null;
  const stack: FiberNode[] = rootCompFiber.child ? [rootCompFiber.child] : [];
  while (stack.length > 0) {
    const f = stack.pop()!;
    const fn = getRfmFn(f.type);
    if (fn && fn.__rfm_symbolId === symbolId) {
      return getFirstHostEl(f.child) ?? getFirstHostEl(f) ?? null;
    }
    if (f.child) stack.push(f.child);
    if (f.sibling) stack.push(f.sibling);
  }
  return null;
}

/** Find ancestor component DOM element by symbolId (walk up fiber chain). */
export function findAncestorElBySymbolId(el: HTMLElement, symbolId: string): HTMLElement | null {
  const selfComp = getCompFiber(getFiberFromEl(el));
  if (!selfComp) return null;
  let f: FiberNode | null = selfComp.return;
  while (f) {
    const fn = getRfmFn(f.type);
    if (fn && fn.__rfm_symbolId === symbolId) {
      return getFirstHostEl(f.child) ?? null;
    }
    f = f.return;
  }
  return null;
}

/** Union rect for all root-level host elements of a component by symbolId. */
export function findUnionRectBySymbolId(symbolId: string): DOMRect | null {
  const rects = findAllInstanceRectsBySymbolId(symbolId);

  if (rects.length === 0) {
    return null;
  }

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const rect of rects) {
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

/** Get loc (line number string) for a symbolId from its fiber. */
export function getLocForSymbolId(el: HTMLElement, symbolId: string): string | null {
  let f: FiberNode | null = getFiberFromEl(el);
  while (f) {
    const fn = getRfmFn(f.type);
    if (fn && fn.__rfm_symbolId === symbolId) return fn.__rfm_loc ?? null;
    f = f.return;
  }
  return null;
}

/** Walk the live fiber tree to extract direct parent→child relationships between RFM components.
 *  Returns a map of parentSymbolId → [childSymbolId, ...].
 *  This is used to supplement (or replace) staticJsx edges in the graph layout,
 *  covering alias imports and Outlet-mediated route rendering that staticJsx misses. */
export function buildFiberRelationships(): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(getMountedRfmSnapshot().fiberRelationships).map(([parentId, childIds]) => [parentId, [...childIds]])
  );
}

/** Walk all DOM nodes to collect all mounted RFM components.
 *  Skips [data-rfm-overlay] subtrees (inspector UI itself). */
export function findAllMountedRfmComponents(): { symbolId: string; loc: string | null }[] {
  return [...getMountedRfmSnapshot().mountedComponents];
}
