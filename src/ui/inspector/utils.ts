import type { DockPosition, FoundComp } from './types';
import { SIDEBAR_W, BOTTOM_H } from './tokens';

// ─── Dock persistence ─────────────────────────────────────────────────────────

export function loadDock(): DockPosition {
  try { return (localStorage.getItem('rfm-dock') as DockPosition) ?? 'float'; } catch { return 'float'; }
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
    width: SIDEBAR_W, maxHeight: '80vh',
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
 *  Traverses Fragment wrappers but stops at child component boundaries. */
function getRootHostEls(fiber: FiberNode | null): HTMLElement[] {
  const els: HTMLElement[] = [];
  function collect(f: FiberNode | null) {
    let cur = f;
    while (cur) {
      if (typeof cur.type === 'string' && cur.stateNode instanceof HTMLElement) {
        // host element (div, section, etc.)
        els.push(cur.stateNode);
      } else if (typeof cur.type !== 'function') {
        // Fragment or other wrapper — descend into children
        collect(cur.child);
      } else {
        // child component — take its first host el, don't recurse inside
        const hostEl = getFirstHostEl(cur.child);
        if (hostEl) els.push(hostEl);
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
    if (typeof (f.type as RfmFn)?.__rfm_symbolId === 'string') return f;
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
        const fn = f.type as RfmFn | null;
        if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) {
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
      const fn = f.type as RfmFn | null;
      if (typeof fn === 'function' && fn.__rfm_symbolId && !seen.has(fn.__rfm_symbolId)) {
        seen.add(fn.__rfm_symbolId);
        const rootEls = getRootHostEls(f.child);
        const hostEl = rootEls[0] ?? (domEl as HTMLElement);
        const rect = unionRects(rootEls) ?? hostEl.getBoundingClientRect();
        if (isVisible(rect)) {
          found.push({
            symbolId: fn.__rfm_symbolId,
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

export function findDomParent(el: HTMLElement): { name: string; symbolId: string } | null {
  const selfComp = getCompFiber(getFiberFromEl(el));
  if (!selfComp) return null;
  // Walk above selfComp to find first parent component
  let f: FiberNode | null = selfComp.return;
  while (f) {
    const fn = f.type as RfmFn | null;
    if (typeof fn === 'function' && fn.__rfm_symbolId) {
      return { symbolId: fn.__rfm_symbolId, name: fn.__rfm_symbolId.split('#').at(-1) ?? '' };
    }
    f = f.return;
  }
  return null;
}

export function findDomChildren(el: HTMLElement): { name: string; symbolId: string }[] {
  // Find which component el belongs to
  const selfComp = getCompFiber(getFiberFromEl(el));
  if (!selfComp) return [];
  const selfSymbolId = (selfComp.type as RfmFn).__rfm_symbolId!;

  const results: { name: string; symbolId: string }[] = [];
  const seen = new Set<string>();

  // Walk DOM subtree — for each element, check if it's the root of a *direct* child component.
  // "Direct child" means: the nearest RFM ancestor in the fiber chain is selfComp.
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = el;
  while (node) {
    const domEl = node as HTMLElement;
    const compFiber = getCompFiber(getFiberFromEl(domEl));
    if (compFiber) {
      const symbolId = (compFiber.type as RfmFn).__rfm_symbolId;
      if (symbolId && symbolId !== selfSymbolId && !seen.has(symbolId)) {
        // Walk up from this component to find its nearest RFM parent
        let f: FiberNode | null = compFiber.return;
        while (f) {
          const fn = f.type as RfmFn | null;
          if (typeof fn === 'function' && fn.__rfm_symbolId) {
            if (fn.__rfm_symbolId === selfSymbolId) {
              seen.add(symbolId);
              results.push({ symbolId, name: symbolId.split('#').at(-1) ?? '' });
            }
            break; // stop at first RFM ancestor regardless
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
        const fn = f.type as RfmFn | null;
        if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) {
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
        const fn = f.type as RfmFn | null;
        if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) {
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

/** Find a component's DOM element within a fiber subtree rooted at `root`. */
export function findElBySymbolIdInSubtree(root: HTMLElement, symbolId: string): HTMLElement | null {
  const rootCompFiber = getCompFiber(getFiberFromEl(root));
  if (!rootCompFiber) return null;
  const stack: FiberNode[] = rootCompFiber.child ? [rootCompFiber.child] : [];
  while (stack.length > 0) {
    const f = stack.pop()!;
    const fn = f.type as RfmFn | null;
    if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) {
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
    const fn = f.type as RfmFn | null;
    if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) {
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
        const fn = f.type as RfmFn | null;
        if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) {
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
    const fn = f.type as RfmFn | null;
    if (typeof fn === 'function' && fn.__rfm_symbolId === symbolId) return fn.__rfm_loc ?? null;
    f = f.return;
  }
  return null;
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
        const fn = f.type as RfmFn | null;
        if (typeof fn === 'function' && fn.__rfm_symbolId && !seen.has(fn.__rfm_symbolId)) {
          seen.add(fn.__rfm_symbolId);
          results.push({ symbolId: fn.__rfm_symbolId, loc: fn.__rfm_loc ?? null });
        }
        f = f.return;
      }
    }
    node = walker.nextNode();
  }
  return results;
}
