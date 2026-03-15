import { useState, useEffect, useRef, useMemo } from 'react';
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

const SIDEBAR_W = 280;

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
  node, depth, hoveredIds, selectedId, onSelect, selectedRef,
}: {
  node: AnyTreeNode;
  depth: number;
  hoveredIds: Set<string>;
  selectedId: string;
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
        const cat = CAT_STYLE[entry.category] ?? CAT_STYLE['function']!;

        return (
          <button
            key={entry.symbolId}
            type="button"
            ref={isSelected ? (el) => { selectedRef.current = el; } : undefined}
            onClick={() => onSelect(entry.symbolId)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: `4px 10px 4px ${10 + (depth + 1) * 14}px`,
              border: 'none',
              borderLeft: isSelected
                ? '2px solid #3b82f6'
                : isHovered
                  ? '2px solid #f59e0b'
                  : '2px solid transparent',
              textAlign: 'left', cursor: 'pointer',
              background: isSelected ? '#dbeafe' : isHovered ? '#fef3c7' : 'transparent',
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
function VsCodeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 100 100" fill="none">
      <path d="M74.8 5.3L24.2 52.5 5.7 38.1 0 41.8v16.4l5.7 3.7 18.5-14.4 50.6 47.2L100 85V15L74.8 5.3z" fill="#007ACC" />
      <path d="M74.8 94.7L24.2 47.5 5.7 61.9 0 58.2V41.8l5.7-3.7L74.8 5.3 100 15v70l-25.2 9.7z" fill="#007ACC" opacity="0.6" />
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

function EntryDetail({ entry, loc }: { entry: DocEntry; loc?: string | null; }) {
  const cat = CAT_STYLE[entry.category] ?? CAT_STYLE['function']!;
  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        <span style={{ padding: '1px 6px', borderRadius: 4, background: cat.bg, color: cat.color, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
          {cat.label}
        </span>
      </div>
      {entry.filePath && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {shortenPath(entry.filePath)}{loc ? `:${loc}` : ''}
          </span>
          <button
            type="button"
            onClick={() => openInEditor(entry.filePath!, entry.symbolId, loc)}
            title="VS Code에서 열기"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 7px', borderRadius: 4, border: '1px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', flexShrink: 0,
              fontSize: 10, fontWeight: 600, color: '#475569',
              transition: 'all 100ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
          >
            <VsCodeIcon />
            Open
          </button>
        </div>
      )}
      {entry.renders.length > 0 && (
        <DetailSection label="Renders">
          <ChipList items={entry.renders.map(r => r.name)} />
        </DetailSection>
      )}
      {entry.renderedBy.length > 0 && (
        <DetailSection label="Rendered by">
          <ChipList items={entry.renderedBy.map(r => r.name)} />
        </DetailSection>
      )}
      {entry.uses.length > 0 && (
        <DetailSection label="Uses">
          <ChipList items={entry.uses.map(r => r.name)} color="purple" />
        </DetailSection>
      )}
      {entry.apiCalls.length > 0 && (
        <DetailSection label="API Calls">
          {entry.apiCalls.map((api) => {
            const s = HTTP_STYLE[api.method] ?? { bg: '#f1f5f9', color: '#64748b' };
            return (
              <div key={api.apiId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ padding: '1px 5px', borderRadius: 3, background: s.bg, color: s.color, fontSize: 9, fontWeight: 800, fontFamily: 'monospace', flexShrink: 0 }}>
                  {api.method}
                </span>
                <span style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {api.path}
                </span>
              </div>
            );
          })}
        </DetailSection>
      )}
      {!entry.renders.length && !entry.renderedBy.length && !entry.uses.length && !entry.apiCalls.length && (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>연결된 관계 없음</p>
      )}
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
function ChipList({ items, color = 'default' }: { items: string[]; color?: 'default' | 'purple' }) {
  const s = color === 'purple'
    ? { bg: '#faf5ff', border: '#e9d5ff', text: '#6d28d9' }
    : { bg: '#f8fafc', border: '#e2e8f0', text: '#334155' };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {items.map(item => (
        <span key={item} style={{ padding: '1px 6px', borderRadius: 4, border: `1px solid ${s.border}`, background: s.bg, fontSize: 11, color: s.text }}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── 플로팅 사이드바 ──────────────────────────────────────────────────────────
function FloatingSidebar({
  stack, selectedId, selectedLoc, allEntries, onSelect, onClose,
}: {
  stack: FoundComp[];
  selectedId: string;
  selectedLoc: string | null;
  allEntries: DocEntry[];
  onSelect: (symbolId: string) => void;
  onClose: () => void;
}) {
  const [renderedOnly, setRenderedOnly] = useState(false);

  const hoveredIds = useMemo(() => new Set(stack.map(c => c.symbolId)), [stack]);

  // Rendered 모드: 현재 DOM에 data-gori-id가 있는 항목만
  const displayEntries = useMemo(() => {
    if (!renderedOnly) return allEntries;
    const domIds = new Set(
      [...document.querySelectorAll('[data-gori-id]')]
        .map(el => el.getAttribute('data-gori-id')!)
    );
    return allEntries.filter(e => domIds.has(e.symbolId));
  }, [allEntries, renderedOnly]);

  const tree = useMemo(() => buildFolderTree(displayEntries), [displayEntries]);
  const selectedEntry = allEntries.find(e => e.symbolId === selectedId) ?? null;
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const hoveredName = stack[0]?.symbolId.split('#').at(-1);

  return (
    <div
      data-gori-overlay
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: SIDEBAR_W,
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-4px 0 20px rgba(15,23,42,0.08)',
        zIndex: 10000,
        display: 'flex', flexDirection: 'column',
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div style={{
        height: 44, minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid #f1f5f9',
        background: '#fafafa',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>G</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Inspector</span>
        </div>
        <button type="button" onClick={onClose} style={{
          width: 24, height: 24, borderRadius: 5, border: '1px solid #e2e8f0',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
        }}>✕</button>
      </div>

      {/* All / Rendered 토글 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #f1f5f9',
        flexShrink: 0,
      }}>
        <ToggleTab label="All" active={!renderedOnly} onClick={() => setRenderedOnly(false)} />
        <ToggleTab label="Rendered" active={renderedOnly}  onClick={() => setRenderedOnly(true)}  accent />
      </div>

      {/* 현재 호버 표시 */}
      <div style={{
        height: 30, minHeight: 30,
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 6,
        borderBottom: '1px solid #f1f5f9',
        background: hoveredName ? '#fffbeb' : '#fafafa',
        flexShrink: 0,
        transition: 'background 120ms',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: hoveredName ? '#f59e0b' : '#e2e8f0',
          transition: 'background 120ms',
        }} />
        <span style={{
          fontSize: 11, fontWeight: hoveredName ? 500 : 400,
          color: hoveredName ? '#92400e' : '#94a3b8',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {hoveredName ?? '마우스를 컴포넌트 위로 이동'}
        </span>
        {stack.length > 1 && (
          <span style={{ fontSize: 10, color: '#d97706', flexShrink: 0 }}>
            +{stack.length - 1}
          </span>
        )}
      </div>

      {/* 폴더 트리 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {displayEntries.length === 0 ? (
          <p style={{ margin: 0, padding: '16px 12px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {renderedOnly
              ? '현재 화면에 렌더된 컴포넌트가 없습니다'
              : '컴포넌트 데이터가 없습니다'}
          </p>
        ) : (
          <TreeNodeView
            node={tree}
            depth={0}
            hoveredIds={hoveredIds}
            selectedId={selectedId}
            onSelect={onSelect}
            selectedRef={selectedRef}
          />
        )}
      </div>

      {/* 선택된 컴포넌트 상세 */}
      {selectedEntry && (
        <div style={{
          borderTop: '1px solid #e2e8f0',
          maxHeight: 220, overflowY: 'auto',
          flexShrink: 0,
          background: '#fafafa',
        }}>
          <EntryDetail entry={selectedEntry} loc={selectedLoc} />
        </div>
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
export function InspectButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      data-gori-overlay
      type="button"
      onClick={onClick}
      title={active ? 'Inspect 종료 (Esc)' : '컴포넌트 Inspect'}
      style={{
        position: 'fixed', bottom: 20,
        right: active ? SIDEBAR_W + 12 : 20,
        width: 44, height: 44, borderRadius: '50%', border: 'none',
        background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#0f172a',
        color: '#ffffff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        boxShadow: active
          ? '0 0 0 3px rgba(99,102,241,0.35), 0 4px 14px rgba(59,130,246,0.45)'
          : '0 2px 10px rgba(15,23,42,0.3)',
        transition: 'all 180ms', zIndex: 10001,
      }}
    >
      {active ? '✕' : '⬡'}
    </button>
  );
}

// ─── ComponentOverlay ─────────────────────────────────────────────────────────
export function ComponentOverlay({
  graph, active, onDeactivate,
}: {
  graph: GoriGraph; active: boolean; onDeactivate: () => void;
}) {
  const [stack,      setStack]      = useState<FoundComp[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  // 클릭으로 선택된 특정 DOM 요소 — 같은 symbolId가 여러 개일 때 정확한 요소를 기억
  const selectedElRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!active) {
      setStack([]);
      setSelectedId('');
      selectedElRef.current = null;
      return;
    }

    document.body.style.cursor = 'crosshair';

    function onMove(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-gori-overlay]')) return;
      const found = findComponentsAt(e.clientX, e.clientY);
      // 화면에 있는 컴포넌트의 loc을 캐시에 저장
      found.forEach(c => { if (c.loc) locCacheRef.current.set(c.symbolId, c.loc); });
      setStack(found);
    }

    // 앱 클릭 → 호버 중인 컴포넌트를 액티브로 확정
    function onClickApp(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-gori-overlay]')) return;
      const found = findComponentsAt(e.clientX, e.clientY);
      if (found[0]) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(found[0].symbolId);
        selectedElRef.current = found[0].el;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDeactivateRef.current();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('click',     onClickApp, true);
    document.addEventListener('keydown',   onKeyDown);
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('click',     onClickApp, true);
      document.removeEventListener('keydown',   onKeyDown);
    };
  }, [active]);

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

  if (!active) return null;

  return (
    <>
      {/* 호버 프리뷰: 점선 amber */}
      {showHoverBox && (
        <HoverPreviewBox rect={hoveredComp.rect} label={hoveredLabel} />
      )}

      {/* 액티브 선택: 실선 파란색 */}
      {selectedRect && (
        <ActiveSelectBox rect={selectedRect} label={selectedLabel} />
      )}

      {/* 플로팅 사이드바 */}
      <FloatingSidebar
        stack={stack}
        selectedId={selectedId}
        selectedLoc={selectedLoc}
        allEntries={allEntries}
        onSelect={(id) => { setSelectedId(id); selectedElRef.current = null; }}
        onClose={onDeactivate}
      />
    </>
  );
}
