import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import type { GoriGraph } from '../../src/core/types/graph';
import { buildDocIndex, type DocEntry } from '../../src/ui/doc/build-doc-index';

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const HTTP_STYLE: Record<string, { bg: string; color: string }> = {
  GET:    { bg: '#dcfce7', color: '#15803d' },
  POST:   { bg: '#dbeafe', color: '#1d4ed8' },
  PUT:    { bg: '#fef9c3', color: '#b45309' },
  PATCH:  { bg: '#f3e8ff', color: '#7e22ce' },
  DELETE: { bg: '#fee2e2', color: '#b91c1c' },
};
const CAT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  page:      { bg: '#eff6ff', color: '#1d4ed8', label: 'Page'      },
  component: { bg: '#f0fdf4', color: '#15803d', label: 'Component' },
  hook:      { bg: '#faf5ff', color: '#7c3aed', label: 'Hook'      },
  function:  { bg: '#fff7ed', color: '#c2410c', label: 'Fn'        },
};

const SIDEBAR_W = 320;
const BOTTOM_H  = 320;

type DockPosition = 'right' | 'left' | 'bottom' | 'float';

function loadDock(): DockPosition {
  try { return (localStorage.getItem('gori-dock') as DockPosition) ?? 'right'; } catch { return 'right'; }
}
function loadFloatPos() {
  try {
    const s = localStorage.getItem('gori-float-pos');
    return s ? (JSON.parse(s) as { x: number; y: number }) : { x: 40, y: 80 };
  } catch { return { x: 40, y: 80 }; }
}
function saveDock(pos: DockPosition) {
  try { localStorage.setItem('gori-dock', pos); } catch { /* noop */ }
}
function saveFloatPos(pos: { x: number; y: number }) {
  try { localStorage.setItem('gori-float-pos', JSON.stringify(pos)); } catch { /* noop */ }
}

function sidebarStyle(dock: DockPosition, floatPos: { x: number; y: number }): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed', background: '#ffffff',
    zIndex: 10000, display: 'flex', flexDirection: 'column',
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    overflow: 'hidden',
  };
  if (dock === 'right')  return { ...base, top: 0, right: 0, bottom: 0, width: SIDEBAR_W, borderLeft: '1px solid #e2e8f0', boxShadow: '-4px 0 20px rgba(15,23,42,0.08)' };
  if (dock === 'left')   return { ...base, top: 0, left: 0, bottom: 0, width: SIDEBAR_W, borderRight: '1px solid #e2e8f0', boxShadow: '4px 0 20px rgba(15,23,42,0.08)' };
  if (dock === 'bottom') return { ...base, left: 0, right: 0, bottom: 0, height: BOTTOM_H, borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 20px rgba(15,23,42,0.08)' };
  return { ...base, top: floatPos.y, left: floatPos.x, width: SIDEBAR_W, maxHeight: '85vh', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(15,23,42,0.18)' };
}

// 독 위치 아이콘
function DockIcon({ pos, active, onClick }: { pos: DockPosition; active: boolean; onClick: () => void }) {
  const c = active ? '#3b82f6' : '#94a3b8';
  const bg = active ? '#eff6ff' : 'transparent';
  const icons: Record<DockPosition, React.ReactNode> = {
    left: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
        <rect x="1" y="1" width="5" height="12" rx="2" fill={c} opacity="0.3"/>
        <rect x="1" y="1" width="5" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
      </svg>
    ),
    bottom: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
        <rect x="1" y="8" width="12" height="5" rx="2" fill={c} opacity="0.3"/>
        <rect x="1" y="8" width="12" height="5" rx="2" stroke={c} strokeWidth="1.2"/>
      </svg>
    ),
    right: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
        <rect x="8" y="1" width="5" height="12" rx="2" fill={c} opacity="0.3"/>
        <rect x="8" y="1" width="5" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
      </svg>
    ),
    float: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="3" y="1" width="10" height="9" rx="2" stroke={c} strokeWidth="1.2"/>
        <rect x="1" y="4" width="10" height="9" rx="2" fill={active ? '#eff6ff' : '#fff'} stroke={c} strokeWidth="1.2"/>
      </svg>
    ),
  };
  return (
    <button
      type="button" onClick={onClick}
      title={{ left: '왼쪽 고정', bottom: '하단 고정', right: '오른쪽 고정', float: '플로팅' }[pos]}
      style={{
        width: 24, height: 24, borderRadius: 4, border: active ? '1px solid #bfdbfe' : '1px solid transparent',
        background: bg, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 100ms',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = bg; }}
    >
      {icons[pos]}
    </button>
  );
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function isVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 && rect.height > 0 &&
    rect.bottom > 0 && rect.right > 0 &&
    rect.top < window.innerHeight && rect.left < window.innerWidth
  );
}
function clipToViewport(rect: DOMRect) {
  const l = Math.max(0, rect.left);
  const t = Math.max(0, rect.top);
  const r = Math.min(window.innerWidth,  rect.right);
  const b = Math.min(window.innerHeight, rect.bottom);
  return { left: l, top: t, width: Math.max(0, r - l), height: Math.max(0, b - t) };
}
function getDomDepth(el: HTMLElement): number {
  let d = 0, cur: Element | null = el;
  while (cur) { d++; cur = cur.parentElement; }
  return d;
}
function shortenPath(p: string) {
  return p.replace(/^demo\/src\//, '').replace(/^src\//, '');
}
function normalizePath(filePath: string): string {
  return filePath.replace(/^demo\//, '');
}

// ─── React Fiber Props ────────────────────────────────────────────────────────
function getComponentPropsFromEl(el: HTMLElement): Record<string, unknown> | null {
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

type PropTypeEntry = { type: string; optional: boolean };

function primitiveColor(value: unknown): string {
  if (typeof value === 'string')  return '#16a34a';
  if (typeof value === 'number')  return '#2563eb';
  if (typeof value === 'boolean') return '#dc2626';
  return '#64748b';
}

function isPrimitive(value: unknown): boolean {
  return value === null || value === undefined ||
    typeof value === 'string' || typeof value === 'number' ||
    typeof value === 'boolean' || typeof value === 'function';
}

function primitiveLabel(value: unknown): string {
  if (value === null)      return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') {
    const name = (value as { name?: string }).name;
    return name ? `${name} ƒ` : 'ƒ()';
  }
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

/** 중첩 객체/배열을 한 줄 compact 문자열로 */
function inlineValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return primitiveLabel(value);
  if (Array.isArray(value)) return value.length === 0 ? '[]' : `[…${value.length}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    return keys.length === 0 ? '{}' : `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''} }`;
  }
  return String(value);
}

/** D+E 스타일 Props 행
 *  - primitive / function: 이름  |  값  한 줄
 *  - object / array: 이름  |  타입이름(or compact)  클릭 → 하위 key-value 행 펼침
 */
function PropRow({ name, value, typeEntry }: { name: string; value: unknown; typeEntry?: PropTypeEntry | undefined }) {
  const [open, setOpen] = useState(false);

  const isObj = value !== null && typeof value === 'object';
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;

  // 타입 이름 or compact fallback
  const typeName = typeEntry?.type ?? (isArr ? `Array(${(value as unknown[]).length})` : isObj ? `{ ${Object.keys(value as object).slice(0, 3).join(', ')}${Object.keys(value as object).length > 3 ? ', …' : ''} }` : null);

  const entries: [string, unknown][] = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : isObj ? Object.entries(value as Record<string, unknown>) : [];

  const rowBase: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)',
    columnGap: 8, alignItems: 'baseline',
    padding: '4px 7px', fontFamily: 'monospace', fontSize: 11,
  };

  return (
    <div style={{ borderRadius: 4, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      {/* 메인 행 */}
      <div
        role={isExpandable ? 'button' : undefined}
        tabIndex={isExpandable ? 0 : undefined}
        onClick={isExpandable ? () => setOpen(o => !o) : undefined}
        onKeyDown={isExpandable ? (e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); } : undefined}
        style={{
          ...rowBase,
          background: open ? '#f1f5f9' : '#f8fafc',
          cursor: isExpandable ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {/* 키 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, overflow: 'hidden', minWidth: 0 }}>
          {isExpandable && (
            <span style={{
              fontSize: 7, marginRight: 4, display: 'inline-block', flexShrink: 0,
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms', color: '#94a3b8',
            }}>▶</span>
          )}
          <span style={{ color: '#7c3aed', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {typeEntry?.optional && <span style={{ color: '#94a3b8', marginLeft: 1 }}>?</span>}
        </div>
        {/* 값 */}
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {isExpandable ? (
            <span style={{ color: '#64748b', fontSize: 10 }}>{typeName}</span>
          ) : (
            <span style={{ color: primitiveColor(value) }}>{primitiveLabel(value)}</span>
          )}
        </div>
      </div>

      {/* 펼쳐진 key-value 행들 */}
      {open && entries.map(([k, v]) => (
        <div key={k} style={{
          ...rowBase,
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          paddingLeft: 22,
        }}>
          <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
          <span style={{
            color: isPrimitive(v) ? primitiveColor(v) : '#64748b',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {isPrimitive(v) ? primitiveLabel(v) : inlineValue(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── DOM 기반 직접 부모/자식 탐색 ─────────────────────────────────────────────
type DomRelNode = { name: string; symbolId: string };

function findDomParent(el: HTMLElement): DomRelNode | null {
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

function findDomChildren(el: HTMLElement): DomRelNode[] {
  const rootId = el.getAttribute('data-gori-id');
  const seen = new Set<string>();
  const results: DomRelNode[] = [];
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

// ─── 폴더 트리 빌드 ──────────────────────────────────────────────────────────
type FileTreeNode   = { kind: 'file';   name: string; fullPath: string; entries: DocEntry[] };
type FolderTreeNode = { kind: 'folder'; name: string; fullPath: string; children: (FolderTreeNode | FileTreeNode)[] };
type AnyTreeNode    = FolderTreeNode | FileTreeNode;

// 엔트리 파일 우선 순위 (낮을수록 앞)
const ENTRY_FILE_PRIORITY: Record<string, number> = {
  'app.tsx': 0, 'app.jsx': 0, 'app.ts': 0,
  '_app.tsx': 1, '_app.jsx': 1,
  'layout.tsx': 2, 'layout.jsx': 2,
  'index.tsx': 3, 'index.jsx': 3, 'index.ts': 3,
  'main.tsx': 4, 'main.jsx': 4,
  'page.tsx': 5, 'page.jsx': 5,
};

function sortTreeChildren(children: (FolderTreeNode | FileTreeNode)[]): (FolderTreeNode | FileTreeNode)[] {
  return [...children].sort((a, b) => {
    const aPri = a.kind === 'file' ? (ENTRY_FILE_PRIORITY[a.name] ?? 99) : 100;
    const bPri = b.kind === 'file' ? (ENTRY_FILE_PRIORITY[b.name] ?? 99) : 100;
    if (aPri !== bPri) return aPri - bPri;
    // 같은 우선순위면 알파벳
    return a.name.localeCompare(b.name);
  });
}

function sortTreeRecursive(node: FolderTreeNode): void {
  node.children = sortTreeChildren(node.children);
  for (const child of node.children) {
    if (child.kind === 'folder') sortTreeRecursive(child);
  }
}

function flattenTreeEntries(node: FolderTreeNode | FileTreeNode): DocEntry[] {
  if (node.kind === 'file') return node.entries;
  return node.children.flatMap(flattenTreeEntries);
}

function buildFolderTree(entries: DocEntry[]): FolderTreeNode {
  const root: FolderTreeNode = { kind: 'folder', name: '', fullPath: '', children: [] };

  for (const entry of entries) {
    if (!entry.filePath) continue;
    const normalized = normalizePath(entry.filePath);
    const parts = normalized.split('/');

    let node: FolderTreeNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      let child = node.children.find(
        (c): c is FolderTreeNode => c.kind === 'folder' && c.name === part,
      );
      if (!child) {
        child = { kind: 'folder', name: part, fullPath: parts.slice(0, i + 1).join('/'), children: [] };
        node.children.push(child);
      }
      node = child;
    }

    const fileName = parts[parts.length - 1]!;
    let fileNode = node.children.find(
      (c): c is FileTreeNode => c.kind === 'file' && c.name === fileName,
    );
    if (!fileNode) {
      fileNode = { kind: 'file', name: fileName, fullPath: normalized, entries: [] };
      node.children.push(fileNode);
    }
    if (!fileNode.entries.some(e => e.symbolId === entry.symbolId)) {
      fileNode.entries.push(entry);
    }
  }

  sortTreeRecursive(root);
  return root;
}

function folderHasHovered(node: FolderTreeNode, hoveredIds: Set<string>): boolean {
  for (const child of node.children) {
    if (child.kind === 'file') {
      if (child.entries.some(e => hoveredIds.has(e.symbolId))) return true;
    } else {
      if (folderHasHovered(child, hoveredIds)) return true;
    }
  }
  return false;
}

// ─── 트리 렌더 ────────────────────────────────────────────────────────────────
function TreeNodeView({
  node, depth, hoveredIds, selectedId, focusedSymbolId, onSelect, selectedRef,
}: {
  node: AnyTreeNode;
  depth: number;
  hoveredIds: Set<string>;
  selectedId: string;
  focusedSymbolId: string;
  onSelect: (symbolId: string) => void;
  selectedRef: React.MutableRefObject<HTMLButtonElement | null>;
}) {
  if (node.kind === 'folder') {
    const hasHovered = node.name !== '' && folderHasHovered(node, hoveredIds);
    return (
      <div>
        {node.name !== '' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: `4px 10px 4px ${10 + depth * 14}px`,
          }}>
            <FolderIcon hovered={hasHovered} />
            <span style={{
              fontSize: 11, fontWeight: hasHovered ? 600 : 500,
              color: hasHovered ? '#92400e' : '#64748b',
            }}>
              {node.name}
            </span>
          </div>
        )}
        {node.children.map((child) => (
          <TreeNodeView
            key={child.fullPath || '__root__'}
            node={child}
            depth={node.name !== '' ? depth + 1 : depth}
            hoveredIds={hoveredIds}
            selectedId={selectedId}
            focusedSymbolId={focusedSymbolId}
            onSelect={onSelect}
            selectedRef={selectedRef}
          />
        ))}
      </div>
    );
  }

  // 파일 노드
  const fileHovered = node.entries.some(e => hoveredIds.has(e.symbolId));
  const fileSelected = node.entries.some(e => e.symbolId === selectedId);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: `4px 10px 3px ${10 + depth * 14}px`,
        background: fileSelected ? '#eff6ff' : fileHovered ? '#fffbeb' : 'transparent',
      }}>
        <FileIcon hovered={fileHovered} selected={fileSelected} />
        <span style={{
          fontSize: 11,
          fontWeight: fileSelected ? 600 : fileHovered ? 500 : 400,
          color: fileSelected ? '#1e40af' : fileHovered ? '#92400e' : '#94a3b8',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {node.name}
        </span>
      </div>

      {node.entries.map((entry) => {
        const isHovered  = hoveredIds.has(entry.symbolId);
        const isSelected = entry.symbolId === selectedId;
        const isFocused  = entry.symbolId === focusedSymbolId && !isSelected;
        const cat = CAT_STYLE[entry.category] ?? CAT_STYLE['function']!;

        return (
          <button
            key={entry.symbolId}
            data-tree-entry
            type="button"
            ref={isSelected ? (el) => { selectedRef.current = el; } : undefined}
            onClick={() => onSelect(entry.symbolId)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: `4px 10px 4px ${10 + (depth + 1) * 14}px`,
              border: 'none',
              borderLeft: isSelected
                ? '2px solid #3b82f6'
                : isFocused
                  ? '2px solid #a5b4fc'
                  : isHovered
                    ? '2px solid #f59e0b'
                    : '2px solid transparent',
              textAlign: 'left', cursor: 'pointer',
              background: isSelected ? '#dbeafe' : isFocused ? '#f5f3ff' : isHovered ? '#fef3c7' : 'transparent',
              outline: 'none',
              transition: 'background 60ms',
            }}
          >
            <ComponentIcon isSelected={isSelected} isHovered={isHovered} />
            <span style={{
              fontSize: 12,
              fontWeight: isSelected ? 700 : isHovered ? 500 : 400,
              color: isSelected ? '#1d4ed8' : isHovered ? '#b45309' : '#94a3b8',
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.name}
            </span>
            {(isSelected || isHovered) && (
              <span style={{
                padding: '1px 5px', borderRadius: 3,
                background: isSelected ? '#bfdbfe' : '#fde68a',
                color: isSelected ? '#1d4ed8' : '#92400e',
                fontSize: 9, fontWeight: 700, flexShrink: 0,
              }}>
                {cat.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── 아이콘 ───────────────────────────────────────────────────────────────────
function FolderIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 3.5C1 2.948 1.448 2.5 2 2.5H4.586L5.293 3.207C5.48 3.395 5.733 3.5 6 3.5H10C10.552 3.5 11 3.948 11 4.5V9C11 9.552 10.552 10 10 10H2C1.448 10 1 9.552 1 9V3.5Z"
        fill={hovered ? '#fbbf24' : '#d1d5db'} />
    </svg>
  );
}
function FileIcon({ hovered, selected }: { hovered: boolean; selected: boolean }) {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 1H7L10 4V11C10 11.552 9.552 12 9 12H2C1.448 12 1 11.552 1 11V2C1 1.448 1.448 1 2 1Z"
        fill={selected ? '#bfdbfe' : hovered ? '#fde68a' : '#e2e8f0'} />
      <path d="M7 1V4H10"
        stroke={selected ? '#60a5fa' : hovered ? '#f59e0b' : '#cbd5e1'}
        strokeWidth="1" fill="none" />
    </svg>
  );
}

function ComponentIcon({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  const color = isSelected ? '#3b82f6' : isHovered ? '#f59e0b' : '#cbd5e1';
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="8" height="8" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M3 5H7M5 3V7" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── 커서 아래 컴포넌트 스택 ──────────────────────────────────────────────────
type FoundComp = { symbolId: string; el: HTMLElement; rect: DOMRect; depth: number; loc: string | null };

function findComponentsAt(x: number, y: number): FoundComp[] {
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

// ─── 호버 프리뷰 박스 (점선 amber) ───────────────────────────────────────────
function HoverPreviewBox({ rect, label }: { rect: DOMRect; label: string }) {
  const c = clipToViewport(rect);
  if (c.width <= 0 || c.height <= 0) return null;
  const labelAbove = rect.top > 22;
  return (
    <div style={{
      position: 'fixed', left: c.left, top: c.top, width: c.width, height: c.height,
      border: '1.5px dashed #f59e0b',
      background: 'rgba(245,158,11,0.04)',
      boxSizing: 'border-box', pointerEvents: 'none', zIndex: 9998,
    }}>
      <div style={{
        position: 'absolute',
        ...(labelAbove
          ? { top: -1, left: -1, transform: 'translateY(-100%)' }
          : { top: 3, left: 3 }),
        background: '#f59e0b',
        borderRadius: labelAbove ? '4px 4px 0 0' : 4,
        padding: '1px 7px', fontSize: 10, fontWeight: 600,
        color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.6,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        pointerEvents: 'none',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── 액티브 선택 박스 (실선 파란색) ──────────────────────────────────────────
function ActiveSelectBox({ rect, label }: { rect: DOMRect; label: string }) {
  const c = clipToViewport(rect);
  if (c.width <= 0 || c.height <= 0) return null;
  const labelAbove = rect.top > 22;
  return (
    <div style={{
      position: 'fixed', left: c.left, top: c.top, width: c.width, height: c.height,
      border: '2px solid #3b82f6',
      background: 'rgba(59,130,246,0.07)',
      boxSizing: 'border-box', pointerEvents: 'none', zIndex: 9999,
    }}>
      <div style={{
        position: 'absolute',
        ...(labelAbove
          ? { top: -1, left: -1, transform: 'translateY(-100%)' }
          : { top: 3, left: 3 }),
        background: '#3b82f6',
        borderRadius: labelAbove ? '4px 4px 0 0' : 4,
        padding: '1px 7px', fontSize: 11, fontWeight: 600,
        color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.6,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        pointerEvents: 'none',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── 선택된 컴포넌트 디테일 ───────────────────────────────────────────────────
function openInEditor(filePath: string, symbolId: string, loc?: string | null) {
  const params = new URLSearchParams({ file: filePath, symbolId });
  if (loc) params.set('line', loc);
  fetch(`/__gori-open?${params.toString()}`).catch(() => {});
}

export function EntryDetail({ entry, loc, selectedEl, onNavigate, onHover, onHoverEnd }: {
  entry: DocEntry;
  loc?: string | null;
  selectedEl?: HTMLElement | null;
  onNavigate?: ((name: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  const cat = CAT_STYLE[entry.category] ?? CAT_STYLE['function']!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 섹션 */}
      <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {entry.name}
          </span>
          <span style={{
            padding: '2px 7px', borderRadius: 4, background: cat.bg, color: cat.color,
            fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2,
          }}>
            {cat.label}
          </span>
        </div>

        {entry.filePath && (
          <button
            type="button"
            onClick={() => openInEditor(entry.filePath!, entry.symbolId, loc)}
            title="에디터에서 열기"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 8px', borderRadius: 5,
              border: '1px solid #e2e8f0', background: '#f8fafc',
              cursor: 'pointer', width: '100%', textAlign: 'left',
              transition: 'all 100ms',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = '#eff6ff';
              el.style.borderColor = '#bfdbfe';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = '#f8fafc';
              el.style.borderColor = '#e2e8f0';
            }}
          >
            <span style={{ fontSize: 10, color: '#3b82f6', flexShrink: 0 }}>↗</span>
            <span style={{
              fontSize: 10, color: '#64748b', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {shortenPath(entry.filePath)}{loc ? `:${loc}` : ''}
            </span>
          </button>
        )}
      </div>

      {/* 미니 관계 그래프 */}
      <div style={{ padding: '16px 14px', borderBottom: entry.apiCalls.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
          Relations
        </span>
        <MiniRelationGraph
          entry={entry}
          selectedEl={selectedEl ?? null}
          onNavigate={onNavigate}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
        />
      </div>

      {/* Props */}
      {selectedEl && selectedEl.isConnected && (() => {
        const props = getComponentPropsFromEl(selectedEl);
        const entries = props
          ? Object.entries(props).filter(([k]) => k !== 'children')
          : [];
        if (entries.length === 0) return null;
        const propTypes = (globalThis as unknown as { __goriPropTypes?: Record<string, Record<string, PropTypeEntry>> })
          .__goriPropTypes?.[entry.symbolId];
        return (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <DetailSection label="Props">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {entries.map(([k, v]) => (
                  <PropRow key={k} name={k} value={v} typeEntry={propTypes?.[k]} />
                ))}
              </div>
            </DetailSection>
          </div>
        );
      })()}

      {/* API Calls */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entry.apiCalls.length > 0 && (
          <DetailSection label="API Calls">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {entry.apiCalls.map((api) => {
                const s = HTTP_STYLE[api.method] ?? { bg: '#f1f5f9', color: '#64748b' };
                return (
                  <div
                    key={api.apiId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 8px', borderRadius: 5,
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                    }}
                  >
                    <span style={{
                      padding: '1px 5px', borderRadius: 3, background: s.bg, color: s.color,
                      fontSize: 9, fontWeight: 800, fontFamily: 'monospace', flexShrink: 0,
                    }}>
                      {api.method}
                    </span>
                    <span style={{
                      fontSize: 11, color: '#334155', fontFamily: 'monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {api.path}
                    </span>
                  </div>
                );
              })}
            </div>
          </DetailSection>
        )}
      </div>
    </div>
  );
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  );
}

// ─── 미니 관계 그래프 ──────────────────────────────────────────────────────────
function GraphNode({ name, isCenter, hasApi, onClick, onHover, onHoverEnd }: {
  name: string;
  isCenter?: boolean;
  hasApi?: boolean;
  onClick?: (() => void) | undefined;
  onHover?: (() => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', maxWidth: 120 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={isCenter}
        title={name}
        style={{
          padding: '4px 10px', borderRadius: 6,
          border: isCenter ? '2px solid #3b82f6' : '1px solid #e2e8f0',
          background: isCenter ? '#eff6ff' : '#f8fafc',
          color: isCenter ? '#1d4ed8' : '#475569',
          fontSize: 11, fontWeight: isCenter ? 700 : 500,
          cursor: isCenter ? 'default' : 'pointer',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 120, transition: 'all 80ms',
        }}
        onMouseEnter={e => {
          if (!isCenter) (e.currentTarget as HTMLElement).style.background = '#eff6ff';
          onHover?.();
        }}
        onMouseLeave={e => {
          if (!isCenter) (e.currentTarget as HTMLElement).style.background = '#f8fafc';
          onHoverEnd?.();
        }}
      >
        {name}
      </button>
      {hasApi && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          width: 8, height: 8, borderRadius: '50%',
          background: '#f59e0b', border: '2px solid #fff',
        }} title="API 호출 있음" />
      )}
    </div>
  );
}

function GraphConnector() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ width: 1.5, height: 10, background: '#cbd5e1' }} />
      <div style={{
        width: 0, height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderTop: '5px solid #cbd5e1',
      }} />
    </div>
  );
}

function NodeRow({ items, onNavigate, onHover, onHoverEnd }: {
  items: { name: string; symbolId: string }[];
  onNavigate?: ((n: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
      {items.map(({ name, symbolId }) => (
        <GraphNode
          key={symbolId} name={name}
          onClick={() => onNavigate?.(name)}
          onHover={() => onHover?.(symbolId)}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </div>
  );
}

function MiniRelationGraph({ entry, selectedEl, onNavigate, onHover, onHoverEnd }: {
  entry: DocEntry;
  selectedEl: HTMLElement | null;
  onNavigate?: ((name: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  const connectedEl = selectedEl?.isConnected ? selectedEl : null;
  const parent   = connectedEl ? findDomParent(connectedEl)   : null;
  const children = connectedEl ? findDomChildren(connectedEl) : [];
  const hasApi   = entry.apiCalls.length > 0;
  const noRelations = !parent && children.length === 0 && !hasApi;

  if (noRelations) {
    return (
      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
        관계가 없습니다.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* 부모 */}
      {parent && (
        <>
          <NodeRow
            items={[parent]}
            onNavigate={onNavigate}
            onHover={onHover}
            onHoverEnd={onHoverEnd}
          />
          <GraphConnector />
        </>
      )}

      {/* 현재 컴포넌트 */}
      <GraphNode name={entry.name} isCenter hasApi={hasApi} />

      {/* 자식 */}
      {children.length > 0 && (
        <>
          <GraphConnector />
          <NodeRow
            items={children}
            onNavigate={onNavigate}
            onHover={onHover}
            onHoverEnd={onHoverEnd}
          />
        </>
      )}
    </div>
  );
}

function _ChipList({ items, color = 'default', onNavigate }: {
  items: string[];
  color?: 'default' | 'purple';
  onNavigate?: ((name: string) => void) | undefined;
}) {
  const s = color === 'purple'
    ? { bg: '#faf5ff', border: '#e9d5ff', text: '#6d28d9', hover: '#f3e8ff' }
    : { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', hover: '#eff6ff' };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map(item => (
        <button
          key={item}
          type="button"
          onClick={() => onNavigate?.(item)}
          style={{
            padding: '3px 8px', borderRadius: 4,
            border: `1px solid ${s.border}`, background: s.bg,
            fontSize: 11, color: s.text,
            cursor: onNavigate ? 'pointer' : 'default',
            transition: 'all 80ms',
          }}
          onMouseEnter={e => { if (onNavigate) (e.currentTarget as HTMLElement).style.background = s.hover; }}
          onMouseLeave={e => { if (onNavigate) (e.currentTarget as HTMLElement).style.background = s.bg; }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ─── 브레드크럼 ───────────────────────────────────────────────────────────────
function BreadcrumbBar({
  stack, onSelect,
}: {
  stack: FoundComp[];
  onSelect: (symbolId: string, el: HTMLElement) => void;
}) {
  const all = [...stack].reverse(); // outermost → innermost
  const MAX_VISIBLE = 3;
  const hiddenCount = all.length > MAX_VISIBLE ? all.length - MAX_VISIBLE : 0;
  const items = hiddenCount > 0 ? all.slice(-MAX_VISIBLE) : all;

  if (all.length === 0) {
    return (
      <div style={{
        height: 30, minHeight: 30,
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid #f1f5f9',
        background: '#fafafa',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>마우스를 컴포넌트 위로 이동</span>
      </div>
    );
  }

  return (
    <div style={{
      height: 30, minHeight: 30,
      display: 'flex', alignItems: 'center',
      padding: '0 8px',
      borderBottom: '1px solid #f1f5f9',
      background: '#fffbeb',
      flexShrink: 0,
      gap: 2,
      overflow: 'hidden',
    }}>
      {hiddenCount > 0 && (
        <>
          <span
            title={all.slice(0, hiddenCount).map(c => c.symbolId.split('#').at(-1)).join(' › ')}
            style={{
              fontSize: 10, color: '#d97706', flexShrink: 0,
              padding: '1px 4px', borderRadius: 3,
              background: 'rgba(245,158,11,0.10)',
              cursor: 'default', userSelect: 'none',
            }}
          >
            ···
          </span>
          <span style={{ fontSize: 10, color: '#d97706', flexShrink: 0, userSelect: 'none' }}>›</span>
        </>
      )}
      {items.map((comp, i) => {
        const name = comp.symbolId.split('#').at(-1) ?? comp.symbolId;
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${comp.symbolId}-${i}`}>
            <button
              type="button"
              onClick={() => onSelect(comp.symbolId, comp.el)}
              style={{
                padding: '1px 4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: isLast ? 600 : 400,
                color: isLast ? '#92400e' : '#b45309',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'background 80ms',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 90,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              title={name}
            >
              {name}
            </button>
            {!isLast && (
              <span style={{ fontSize: 10, color: '#d97706', flexShrink: 0, userSelect: 'none' }}>›</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── 플로팅 사이드바 ──────────────────────────────────────────────────────────
function FloatingSidebar({
  stack, selectedId, selectedLoc, selectedEl, allEntries, onSelect, onClose,
  dockPosition, floatPos, onDockChange, onFloatMove,
  onHighlight, onHighlightEnd,
  picking, onPickToggle,
}: {
  stack: FoundComp[];
  selectedId: string;
  selectedLoc: string | null;
  selectedEl: HTMLElement | null;
  allEntries: DocEntry[];
  onSelect: (symbolId: string, el?: HTMLElement) => void;
  onClose: () => void;
  dockPosition: DockPosition;
  floatPos: { x: number; y: number };
  onDockChange: (pos: DockPosition) => void;
  onFloatMove: (pos: { x: number; y: number }) => void;
  onHighlight: (symbolId: string) => void;
  onHighlightEnd: () => void;
  picking: boolean;
  onPickToggle: () => void;
}) {
  const [renderedOnly, setRenderedOnly] = useState(false);
  const [view, setView] = useState<'tree' | 'detail'>('tree');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const treeScrollRef = useRef<HTMLDivElement | null>(null);

  // 플로팅 드래그
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  function onHeaderMouseDown(e: React.MouseEvent) {
    if (dockPosition !== 'float') return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: floatPos.x, origY: floatPos.y };
    function onMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const nx = dragRef.current.origX + (ev.clientX - dragRef.current.startX);
      const ny = dragRef.current.origY + (ev.clientY - dragRef.current.startY);
      onFloatMove({ x: Math.max(0, nx), y: Math.max(0, ny) });
    }
    function onMouseUp() {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // 선택 시 자동으로 detail 뷰로 전환
  useEffect(() => {
    if (selectedId) setView('detail');
  }, [selectedId]);

  const hoveredIds = useMemo(() => new Set(stack.map(c => c.symbolId)), [stack]);

  const displayEntries = useMemo(() => {
    if (!renderedOnly) return allEntries;
    const domIds = new Set(
      [...document.querySelectorAll('[data-gori-id]')]
        .map(el => el.getAttribute('data-gori-id')!)
    );
    return allEntries.filter(e => domIds.has(e.symbolId));
  }, [allEntries, renderedOnly]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return displayEntries;
    const q = searchQuery.toLowerCase();
    return displayEntries.filter(e => e.name.toLowerCase().includes(q));
  }, [displayEntries, searchQuery]);

  const tree = useMemo(() => buildFolderTree(filteredEntries), [filteredEntries]);
  // 트리 시각 순서 기준 플랫 리스트 (키보드 nav 용)
  const treeOrderedEntries = useMemo(() => flattenTreeEntries(tree), [tree]);
  const selectedEntry = allEntries.find(e => e.symbolId === selectedId) ?? null;
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (view === 'tree') selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, view]);

  // 트리 뷰에서 선택된 항목 인덱스 동기화
  useEffect(() => {
    if (view !== 'tree') return;
    const idx = treeOrderedEntries.findIndex(e => e.symbolId === selectedId);
    setFocusedIdx(idx);
  }, [selectedId, view, treeOrderedEntries]);

  // 키보드 네비게이션
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;

      if (view === 'detail') {
        if (e.key === 'Escape') { e.stopPropagation(); setView('tree'); }
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIdx(prev => {
          const next = e.key === 'ArrowDown'
            ? Math.min(prev + 1, treeOrderedEntries.length - 1)
            : Math.max(prev - 1, 0);
          const btns = treeScrollRef.current?.querySelectorAll<HTMLButtonElement>('[data-tree-entry]');
          btns?.[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
      }

      if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        const entry = treeOrderedEntries[focusedIdx];
        if (entry) onSelect(entry.symbolId);
      }
    }

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [view, treeOrderedEntries, focusedIdx, onSelect]);

  return (
    <div
      data-gori-overlay
      style={sidebarStyle(dockPosition, floatPos)}
    >
      {/* 헤더 */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          height: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px 0 12px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fafafa',
          flexShrink: 0,
          cursor: dockPosition === 'float' ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>G</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Inspector</span>
          <div style={{ width: 1, height: 14, background: '#e2e8f0' }} />
          {/* 요소 선택 픽 버튼 (DevTools 스타일) */}
          <button
            type="button"
            onClick={onPickToggle}
            title={picking ? '선택 취소 (Escape)' : '요소 선택'}
            style={{
              width: 26, height: 26, borderRadius: 5, border: '1px solid',
              borderColor: picking ? '#3b82f6' : '#e2e8f0',
              background: picking ? '#eff6ff' : 'transparent',
              color: picking ? '#3b82f6' : '#64748b',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 120ms',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="16" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {(['left', 'bottom', 'right', 'float'] as DockPosition[]).map(pos => (
            <DockIcon key={pos} pos={pos} active={dockPosition === pos} onClick={() => onDockChange(pos)} />
          ))}
          <div style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 4px' }} />
          <button type="button" onClick={onClose} style={{
            width: 24, height: 24, borderRadius: 5, border: '1px solid #e2e8f0',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
          }}>✕</button>
        </div>
      </div>

      {/* 브레드크럼 — 항상 표시 */}
      <BreadcrumbBar stack={stack} onSelect={onSelect} />

      {view === 'tree' ? (
        <>
          {/* All / Rendered 토글 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <ToggleTab label="All"      active={!renderedOnly} onClick={() => setRenderedOnly(false)} />
            <ToggleTab label="Rendered" active={renderedOnly}  onClick={() => setRenderedOnly(true)} accent />
          </div>

          {/* 검색 */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <svg
                width="12" height="12" viewBox="0 0 20 20" fill="none"
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="컴포넌트 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '5px 26px 5px 26px',
                  borderRadius: 5, border: '1px solid #e2e8f0',
                  background: '#f8fafc', fontSize: 11, color: '#0f172a',
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#fff'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, borderRadius: '50%', border: 'none',
                    background: '#cbd5e1', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                    padding: 0,
                  }}
                >✕</button>
              )}
            </div>
          </div>

          {/* 폴더 트리 */}
          <div ref={treeScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filteredEntries.length === 0 ? (
              <p style={{ margin: 0, padding: '16px 12px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                {searchQuery ? `"${searchQuery}" 검색 결과 없음` : renderedOnly ? '현재 화면에 렌더된 컴포넌트가 없습니다' : '컴포넌트 데이터가 없습니다'}
              </p>
            ) : (
              <TreeNodeView
                node={tree}
                depth={0}
                hoveredIds={hoveredIds}
                selectedId={selectedId}
                focusedSymbolId={focusedIdx >= 0 ? (treeOrderedEntries[focusedIdx]?.symbolId ?? '') : ''}
                onSelect={onSelect}
                selectedRef={selectedRef}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* 뒤로가기 바 */}
          <div style={{
            height: 36, minHeight: 36,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 8px',
            borderBottom: '1px solid #f1f5f9',
            background: '#fafafa',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setView('tree')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', borderRadius: 4,
                border: '1px solid #e2e8f0', background: '#fff',
                cursor: 'pointer', fontSize: 11, color: '#475569',
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
            >
              ← 목록
            </button>
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#0f172a',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {selectedEntry?.name ?? selectedId.split('#').at(-1)}
            </span>
          </div>

          {/* 상세 — 전체 높이 사용 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {selectedEntry
              ? <EntryDetail
                  entry={selectedEntry}
                  loc={selectedLoc}
                  selectedEl={selectedEl}
                  onNavigate={(name) => {
                    const target = allEntries.find(e => e.name === name);
                    if (target) onSelect(target.symbolId);
                  }}
                  onHover={(symbolId) => onHighlight(symbolId)}
                  onHoverEnd={onHighlightEnd}
                />
              : <p style={{ margin: 0, padding: '16px 12px', fontSize: 11, color: '#94a3b8' }}>데이터 없음</p>
            }
          </div>
        </>
      )}
    </div>
  );
}

function ToggleTab({
  label, active, onClick, accent,
}: {
  label: string; active: boolean; onClick: () => void; accent?: boolean;
}) {
  const activeColor = accent ? '#15803d' : '#1d4ed8';
  const activeBg    = accent ? '#f0fdf4' : '#eff6ff';
  return (
    <button
      data-gori-overlay
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: '7px 0', fontSize: 11,
        background: active ? activeBg : 'transparent',
        color: active ? activeColor : '#94a3b8',
        fontWeight: active ? 700 : 400,
        border: 'none', borderBottom: active ? `2px solid ${activeColor}` : '2px solid transparent',
        cursor: 'pointer', transition: 'all 100ms',
      }}
    >
      {label}
    </button>
  );
}

// ─── 플로팅 Inspect 버튼 ──────────────────────────────────────────────────────
export function InspectButton({
  open, onClick, dockPosition = 'right',
}: {
  open: boolean;
  onClick: () => void;
  dockPosition?: DockPosition;
}) {
  let btnRight: number | undefined;
  let btnLeft: number | undefined;
  let btnBottom: number;

  if (dockPosition === 'right') {
    btnRight  = open ? SIDEBAR_W + 12 : 20;
    btnBottom = 20;
  } else if (dockPosition === 'left') {
    btnLeft   = open ? SIDEBAR_W + 12 : 20;
    btnBottom = 20;
  } else if (dockPosition === 'bottom') {
    btnRight  = 20;
    btnBottom = open ? BOTTOM_H + 12 : 20;
  } else {
    btnRight  = 20;
    btnBottom = 20;
  }

  return (
    <button
      data-gori-overlay
      type="button"
      onClick={onClick}
      title={open ? '인스펙터 닫기' : '컴포넌트 Inspector'}
      style={{
        position: 'fixed',
        bottom: btnBottom,
        ...(btnRight !== undefined ? { right: btnRight } : {}),
        ...(btnLeft  !== undefined ? { left:  btnLeft  } : {}),
        width: 44, height: 44, borderRadius: '50%', border: 'none',
        background: open ? '#1e40af' : '#0f172a',
        color: '#ffffff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: open
          ? '0 0 0 2px rgba(59,130,246,0.3), 0 2px 10px rgba(15,23,42,0.2)'
          : '0 2px 10px rgba(15,23,42,0.3)',
        transition: 'all 180ms', zIndex: 10001,
      }}
    >
      <span style={{ fontSize: 18 }}>⬡</span>
    </button>
  );
}

// ─── ComponentOverlay ─────────────────────────────────────────────────────────
export function ComponentOverlay({
  graph, active, onDeactivate, onToggle,
}: {
  graph: GoriGraph; active: boolean; onDeactivate: () => void; onToggle?: (() => void) | undefined;
}) {
  const [stack,      setStack]      = useState<FoundComp[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [highlightId, setHighlightId] = useState<string>('');
  const [picking,    setPicking]    = useState(false);
  const [dockPosition, setDockPosition] = useState<DockPosition>(loadDock);
  const [floatPos,     setFloatPos]     = useState(loadFloatPos);
  // ref 교체 후 re-render 강제용 (setSelectedId가 동일값이면 React가 스킵하므로)
  const [, forceRender] = useState(0);
  // 클릭으로 선택된 특정 DOM 요소 — 같은 symbolId가 여러 개일 때 정확한 요소를 기억
  const selectedElRef = useRef<HTMLElement | null>(null);
  // MutationObserver 콜백에서 최신 selectedId 참조용
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const onDeactivateRef = useRef(onDeactivate);
  useEffect(() => { onDeactivateRef.current = onDeactivate; }, [onDeactivate]);

  const index      = useMemo(() => buildDocIndex(graph), [graph]);
  const graphEntries = useMemo(() => [...index.pages, ...index.components, ...index.hooks], [index]);

  // symbolId → loc(줄번호) 캐시: 한 번 DOM에서 본 loc은 계속 기억
  const locCacheRef = useRef(new Map<string, string>());

  // 그래프에 없지만 DOM에 존재하는 컴포넌트 (App 등 루트 컴포넌트)
  const allEntries = useMemo(() => {
    const graphIds = new Set(graphEntries.map(e => e.symbolId));
    const extra: DocEntry[] = [];
    document.querySelectorAll('[data-gori-id]').forEach((el) => {
      const symbolId = el.getAttribute('data-gori-id');
      const loc = el.getAttribute('data-gori-loc');
      if (symbolId && loc) locCacheRef.current.set(symbolId, loc);
      if (!symbolId || graphIds.has(symbolId)) return;
      const match = symbolId.match(/^symbol:(.+)#(.+)$/);
      if (!match) return;
      const name = match[2]!;
      extra.push({
        symbolId,
        name,
        filePath: match[1]!,
        category: name.endsWith('Page') || name.endsWith('Layout') ? 'page' : 'component',
        renders: [], renderedBy: [], uses: [], usedBy: [], apiCalls: [],
      });
      graphIds.add(symbolId);
    });
    return [...graphEntries, ...extra];
  }, [graphEntries]);

  // 패널 열림/닫힘
  useEffect(() => {
    if (!active) {
      setPicking(false);
      setStack([]);
      setSelectedId('');
      selectedElRef.current = null;
    }
  }, [active]);

  // 선택된 DOM 요소가 unmount(페이지 전환·필터)되면 대체 인스턴스 탐색 or 선택 해제
  useEffect(() => {
    if (!active) return;
    const observer = new MutationObserver(() => {
      if (!selectedElRef.current || selectedElRef.current.isConnected) return;
      const id = selectedIdRef.current;
      const fallback = id
        ? (document.querySelector(`[data-gori-id="${id}"]`) as HTMLElement | null)
        : null;
      if (fallback) {
        // 같은 컴포넌트의 다른 인스턴스가 남아 있으면 교체 후 re-render 강제
        selectedElRef.current = fallback;
        forceRender(n => n + 1);
      } else {
        // 인스턴스가 전혀 없으면 선택 해제 → 트리 뷰로
        selectedElRef.current = null;
        setSelectedId('');
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);

  // 피킹 모드 — 마우스/클릭 이벤트 (picking일 때만 활성)
  useEffect(() => {
    if (!picking) {
      document.body.style.cursor = '';
      return;
    }

    document.body.style.cursor = 'crosshair';

    let rafId = 0;
    function onMove(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-gori-overlay]')) return;
      const x = e.clientX, y = e.clientY;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const found = findComponentsAt(x, y);
        found.forEach(c => { if (c.loc) locCacheRef.current.set(c.symbolId, c.loc); });
        setStack(found);
      });
    }

    function onClickApp(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-gori-overlay]')) return;
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

    document.addEventListener('mousemove', onMove);
    document.addEventListener('click',     onClickApp, true);
    return () => {
      document.body.style.cursor = '';
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('click',     onClickApp, true);
    };
  }, [picking]);

  // Escape: 피킹 중이면 피킹 취소, 아니면 패널 닫기
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (picking) {
        setPicking(false);
        setStack([]);
      } else {
        onDeactivateRef.current();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [picking]);

  // 호버 중인 가장 구체적 컴포넌트 (amber 프리뷰)
  const hoveredComp = stack[0] ?? null;
  // 액티브 선택 rect: 스택에서 먼저, 없으면 DOM 쿼리
  // 선택된 요소와 동일한 DOM 요소일 때만 stack에서 rect 취득 (다른 인스턴스는 무시)
  const selectedComp = stack.find(
    c => c.symbolId === selectedId && (!selectedElRef.current || c.el === selectedElRef.current)
  ) ?? null;
  let selectedRect: DOMRect | null = selectedComp?.rect ?? null;
  if (!selectedRect && selectedId) {
    const el = selectedElRef.current ?? document.querySelector(`[data-gori-id="${selectedId}"]`);
    if (el) selectedRect = (el as HTMLElement).getBoundingClientRect();
  }

  // 선택된 컴포넌트 loc: DOM에서 먼저, 없으면 캐시
  const selectedLoc = useMemo(() => {
    if (!selectedId) return null;
    const fromStack = stack.find(c => c.symbolId === selectedId)?.loc;
    if (fromStack) { locCacheRef.current.set(selectedId, fromStack); return fromStack; }
    const el = document.querySelector(`[data-gori-id="${selectedId}"]`);
    const fromDom = el?.getAttribute('data-gori-loc');
    if (fromDom) { locCacheRef.current.set(selectedId, fromDom); return fromDom; }
    return locCacheRef.current.get(selectedId) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, stack]);

  // 동일 symbolId라도 다른 DOM 요소면 hover로 표시 (리스트 아이템 구분)
  const showHoverBox = hoveredComp && (
    hoveredComp.symbolId !== selectedId ||
    (selectedElRef.current !== null && hoveredComp.el !== selectedElRef.current)
  );
  const hoveredLabel   = hoveredComp?.symbolId.split('#').at(-1) ?? '';
  const selectedLabel  = selectedId.split('#').at(-1) ?? '';

  function handleButtonClick() {
    onToggle?.();
  }

  if (!active) {
    return (
      <InspectButton open={false} onClick={handleButtonClick} dockPosition={dockPosition} />
    );
  }

  return (
    <>
      {/* 사이드바 Relations 노드 hover → DOM 하이라이트 */}
      {highlightId && (() => {
        const els = [...document.querySelectorAll(`[data-gori-id="${highlightId}"]`)] as HTMLElement[];
        const label = highlightId.split('#').at(-1) ?? '';
        return els.map((el, i) => {
          const rect = el.getBoundingClientRect();
          return isVisible(rect) ? <HoverPreviewBox key={i} rect={rect} label={label} /> : null;
        });
      })()}

      {/* 호버 프리뷰: 점선 amber — 피킹 중일 때만 */}
      {picking && showHoverBox && (
        <HoverPreviewBox rect={hoveredComp.rect} label={hoveredLabel} />
      )}

      {/* 액티브 선택: 실선 파란색 */}
      {selectedRect && (
        <ActiveSelectBox rect={selectedRect} label={selectedLabel} />
      )}

      <InspectButton open={true} onClick={handleButtonClick} dockPosition={dockPosition} />

      {/* 플로팅 사이드바 */}
      <FloatingSidebar
        stack={stack}
        selectedId={selectedId}
        selectedLoc={selectedLoc}
        allEntries={allEntries}
        selectedEl={selectedElRef.current}
        dockPosition={dockPosition}
        floatPos={floatPos}
        picking={picking}
        onPickToggle={() => {
          if (picking) { setPicking(false); setStack([]); }
          else { setPicking(true); }
        }}
        onDockChange={(pos) => { setDockPosition(pos); saveDock(pos); }}
        onFloatMove={(pos) => { setFloatPos(pos); saveFloatPos(pos); }}
        onSelect={(id, el) => {
          setSelectedId(id);
          if (el) {
            selectedElRef.current = el;
          } else {
            // element 없이 navigate할 때 (상세 뷰 칩 클릭):
            // 1) 서브트리 안에서 탐색 (자식 방향)
            // 2) 없으면 조상에서 탐색 (부모 방향) → n번째 인스턴스 유지
            const currentEl = selectedElRef.current;
            if (currentEl) {
              const inSubtree = currentEl.querySelector(`[data-gori-id="${id}"]`) as HTMLElement | null;
              if (inSubtree) {
                selectedElRef.current = inSubtree;
              } else {
                let ancestor: Element | null = currentEl.parentElement;
                while (ancestor) {
                  if (ancestor.getAttribute('data-gori-id') === id) {
                    selectedElRef.current = ancestor as HTMLElement;
                    break;
                  }
                  ancestor = ancestor.parentElement;
                }
                if (!ancestor) selectedElRef.current = null;
              }
            } else {
              // currentEl이 없을 때 (트리에서 직접 선택): DOM 쿼리로 첫 번째 인스턴스 사용
              selectedElRef.current =
                (document.querySelector(`[data-gori-id="${id}"]`) as HTMLElement | null) ?? null;
            }
          }
        }}
        onClose={onDeactivate}
        onHighlight={setHighlightId}
        onHighlightEnd={() => setHighlightId('')}
      />
    </>
  );
}
