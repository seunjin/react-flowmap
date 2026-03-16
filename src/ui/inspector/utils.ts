import type { DockPosition, FoundComp } from './types';
import { SIDEBAR_W, BOTTOM_H } from './tokens';

// ─── Dock persistence ─────────────────────────────────────────────────────────

export function loadDock(): DockPosition {
  try { return (localStorage.getItem('gori-dock') as DockPosition) ?? 'float'; } catch { return 'float'; }
}

export function saveDock(pos: DockPosition) {
  try { localStorage.setItem('gori-dock', pos); } catch { /* noop */ }
}

export function saveFloatPos(pos: { x: number; y: number }) {
  try { localStorage.setItem('gori-float-pos', JSON.stringify(pos)); } catch { /* noop */ }
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
  fetch(`/__gori-open?${params.toString()}`).catch(() => {});
}

// ─── React Fiber Props ────────────────────────────────────────────────────────

export function getComponentPropsFromEl(el: HTMLElement): Record<string, unknown> | null {
  const key = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') ||
    k.startsWith('__reactInternalInstance$')
  );
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fiber = (el as any)[key];
  while (fiber) {
    if (typeof fiber.type === 'function' && fiber.memoizedProps) {
      return fiber.memoizedProps as Record<string, unknown>;
    }
    fiber = fiber.return;
  }
  return null;
}

// ─── Component finder ────────────────────────────────────────────────────────

export function findComponentsAt(x: number, y: number): FoundComp[] {
  const found: FoundComp[] = [];
  const seen = new Set<string>();
  for (const el of document.elementsFromPoint(x, y)) {
    const id = el.getAttribute('data-gori-id');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (!isVisible(rect)) continue;
    const loc = (el as HTMLElement).getAttribute('data-gori-loc');
    found.push({ symbolId: id, el: el as HTMLElement, rect, depth: getDomDepth(el as HTMLElement), loc });
  }
  return found.sort((a, b) => {
    const da = a.rect.width * a.rect.height - b.rect.width * b.rect.height;
    if (Math.abs(da) > 100) return da;
    return b.depth - a.depth;
  });
}

// ─── DOM relation finders ─────────────────────────────────────────────────────

export function findDomParent(el: HTMLElement): { name: string; symbolId: string } | null {
  const selfId = el.getAttribute('data-gori-id');
  let cur: Element | null = el.parentElement;
  while (cur) {
    const id = cur.getAttribute('data-gori-id');
    if (id && id !== selfId) {
      return { name: id.split('#').at(-1) ?? id, symbolId: id };
    }
    cur = cur.parentElement;
  }
  return null;
}

export function findDomChildren(el: HTMLElement): { name: string; symbolId: string }[] {
  const rootId = el.getAttribute('data-gori-id');
  const seen = new Set<string>();
  const results: { name: string; symbolId: string }[] = [];
  function walk(node: Element) {
    for (const child of node.children) {
      const id = child.getAttribute('data-gori-id');
      if (id && id !== rootId) {
        if (!seen.has(id)) {
          seen.add(id);
          results.push({ name: id.split('#').at(-1) ?? id, symbolId: id });
        }
        // 이 컴포넌트의 서브트리는 더 깊이 탐색하지 않음
      } else {
        walk(child);
      }
    }
  }
  walk(el);
  return results;
}
