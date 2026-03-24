import type { DockPosition, FoundComp } from './types';
import { SIDEBAR_W, BOTTOM_H } from './tokens';

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

export function openInEditor(filePath: string, symbolId: string, loc?: string | null) {
  const params = new URLSearchParams({ file: filePath, symbolId });
  if (loc) params.set('line', loc);
  fetch(`/__rfm-open?${params.toString()}`).catch(() => {});
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
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = document.body;
  const seen = new Set<FiberNode>();
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        if (seen.has(f)) break;
        seen.add(f);
        const fn = getRfmFn(f.type);
        if (fn && fn.__rfm_symbolId === symbolId) {
          return f.memoizedProps ?? {};
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return null;
}

// ─── Component finder (Fiber-based) ──────────────────────────────────────────

export function findComponentsAt(x: number, y: number): FoundComp[] {
  const found: FoundComp[] = [];
  const seen = new Set<string>();

  for (const domEl of document.elementsFromPoint(x, y)) {
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
  results: { name: string; symbolId: string }[],
  seen: Set<string>,
) {
  let cur = fiber;
  while (cur) {
    const fn = getRfmFn(cur.type);
    if (fn && fn.__rfm_symbolId !== selfId) {
      const id = fn.__rfm_symbolId!;
      if (!seen.has(id)) {
        seen.add(id);
        results.push({ symbolId: id, name: id.split('#').at(-1) ?? '' });
      }
      // Don't recurse — its children are its own responsibility
    } else {
      // Transparent wrapper or same component — recurse into children
      collectDirectRfmChildren(cur.child, selfId, results, seen);
    }
    cur = cur.sibling;
  }
}

export function findDomParent(el: HTMLElement, selfSymbolId?: string): { name: string; symbolId: string } | null {
  const selfComp = resolveSelfFiber(el, selfSymbolId);
  if (!selfComp) return null;
  // Walk above selfComp to find first parent component
  let f: FiberNode | null = selfComp.return;
  while (f) {
    const fn = getRfmFn(f.type);
    if (fn) {
      return { symbolId: fn.__rfm_symbolId!, name: fn.__rfm_symbolId!.split('#').at(-1) ?? '' };
    }
    f = f.return;
  }
  return null;
}

export function findDomChildren(el: HTMLElement, selfSymbolId?: string): { name: string; symbolId: string }[] {
  const selfComp = resolveSelfFiber(el, selfSymbolId);
  if (!selfComp) return [];
  const selfId = selfSymbolId ?? getRfmFn(selfComp.type)?.__rfm_symbolId;
  if (!selfId) return [];

  if (selfSymbolId) {
    // Fiber-based: walk the component's fiber subtree directly (avoids DOM position issues)
    const results: { name: string; symbolId: string }[] = [];
    const seen = new Set<string>();
    collectDirectRfmChildren(selfComp.child, selfId, results, seen);
    return results;
  }

  // Original DOM-based approach for pick-mode (el is directly the component's root element)
  const results: { name: string; symbolId: string }[] = [];
  const seen = new Set<string>();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = el;
  while (node) {
    const domEl = node as HTMLElement;
    const compFiber = getCompFiber(getFiberFromEl(domEl));
    if (compFiber) {
      const symbolId = getRfmFn(compFiber.type)?.__rfm_symbolId;
      if (symbolId && symbolId !== selfId && !seen.has(symbolId)) {
        let f: FiberNode | null = compFiber.return;
        while (f) {
          const fn = getRfmFn(f.type);
          if (fn) {
            if (fn.__rfm_symbolId === selfId) {
              seen.add(symbolId);
              results.push({ symbolId, name: symbolId.split('#').at(-1) ?? '' });
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
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = document.body;
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        const fn = getRfmFn(f.type);
        if (fn && fn.__rfm_symbolId === symbolId) {
          return getFirstHostEl(f.child) ?? (node as HTMLElement);
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return null;
}

/** Find all mounted DOM elements for a component by symbolId (multiple instances). */
export function findAllElsBySymbolId(symbolId: string): HTMLElement[] {
  const results: HTMLElement[] = [];
  const seenFibers = new Set<FiberNode>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = document.body;
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        if (seenFibers.has(f)) break;
        const fn = getRfmFn(f.type);
        if (fn && fn.__rfm_symbolId === symbolId) {
          seenFibers.add(f);
          results.push(getFirstHostEl(f.child) ?? (node as HTMLElement));
          break;
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return results;
}

/** Union rects for each mounted instance of a component (for highlight overlay). */
export function findAllInstanceRectsBySymbolId(symbolId: string): DOMRect[] {
  const rects: DOMRect[] = [];
  const seenFibers = new Set<FiberNode>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = document.body;
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        if (seenFibers.has(f)) break;
        const fn = getRfmFn(f.type);
        if (fn && fn.__rfm_symbolId === symbolId) {
          seenFibers.add(f);
          const rootEls = getRootHostEls(f.child);
          const rect = unionRects(rootEls);
          if (rect) rects.push(rect);
          break;
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return rects;
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
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = document.body;
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        const fn = getRfmFn(f.type);
        if (fn && fn.__rfm_symbolId === symbolId) {
          const rootEls = getRootHostEls(f.child);
          return unionRects(rootEls) ?? (rootEls[0]?.getBoundingClientRect() ?? null);
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return null;
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
  const result: Record<string, string[]> = {};
  const seenIds = new Set<string>(); // dedup by symbolId (one relationship per symbol is enough)

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return (node as HTMLElement).hasAttribute('data-rfm-overlay')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null = document.body;
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        const fn = getRfmFn(f.type);
        if (fn && fn.__rfm_symbolId) {
          const childId = fn.__rfm_symbolId;
          if (!seenIds.has(childId)) {
            seenIds.add(childId);
            // Walk further up to find the nearest RFM ancestor
            let parent: FiberNode | null = f.return;
            while (parent) {
              const pfn = getRfmFn(parent.type);
              if (pfn && pfn.__rfm_symbolId && pfn.__rfm_symbolId !== childId) {
                const parentId = pfn.__rfm_symbolId;
                if (!result[parentId]) result[parentId] = [];
                if (!result[parentId].includes(childId)) result[parentId].push(childId);
                break;
              }
              parent = parent.return;
            }
          }
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }

  return result;
}

/** Walk all DOM nodes to collect all mounted RFM components.
 *  Skips [data-rfm-overlay] subtrees (inspector UI itself). */
export function findAllMountedRfmComponents(): { symbolId: string; loc: string | null }[] {
  const seen = new Set<string>();
  const results: { symbolId: string; loc: string | null }[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      return (node as HTMLElement).hasAttribute('data-rfm-overlay')
        ? NodeFilter.FILTER_REJECT   // skip entire inspector subtree
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null = document.body;
  while (node) {
    const fiber = getFiberFromEl(node as Element);
    if (fiber) {
      let f: FiberNode | null = fiber;
      while (f) {
        const fn = getRfmFn(f.type);
        if (fn && !seen.has(fn.__rfm_symbolId!)) {
          seen.add(fn.__rfm_symbolId!);
          results.push({ symbolId: fn.__rfm_symbolId!, loc: fn.__rfm_loc ?? null });
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return results;
}
