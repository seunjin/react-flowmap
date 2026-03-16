import { useState, useEffect, useRef, useMemo } from 'react';
import { SquareMousePointer, X, Search, ChevronLeft } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { DockPosition, FoundComp } from './types';
import { sidebarStyle } from './utils';
import { buildFolderTree, flattenTreeEntries } from './tree-utils';
import { DockDropdown } from './DockDropdown';
import { TreeNodeView } from './TreeView';
import { EntryDetail } from './EntryDetail';

// ─── FloatingSidebar ──────────────────────────────────────────────────────────

export function FloatingSidebar({
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
  const [treeHoveredId, setTreeHoveredId] = useState('');

  const displayEntries = useMemo(() => {
    const domIds = new Set(
      [...document.querySelectorAll('[data-gori-id]')]
        .map(el => el.getAttribute('data-gori-id')!)
    );
    return allEntries.filter(e => domIds.has(e.symbolId));
  }, [allEntries]);

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
          borderBottom: '1px solid rgba(229,231,235,0.5)',
          background: dockPosition === 'float' ? 'rgba(249,250,251,0.5)' : 'rgba(249,250,251,0.6)',
          flexShrink: 0,
          cursor: dockPosition === 'float' ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* 요소 선택 픽 버튼 */}
          <button
            type="button"
            onClick={onPickToggle}
            title={picking ? '선택 취소 (Escape)' : '요소 선택'}
            onMouseEnter={e => { if (!picking) { (e.currentTarget as HTMLElement).style.background = 'rgba(243,244,246,0.8)'; } }}
            onMouseLeave={e => { if (!picking) { (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
            style={{
              width: 26, height: 26, borderRadius: 5,
              border: '1px solid',
              borderColor: picking ? '#1e40af' : 'rgba(229,231,235,0.8)',
              background: picking ? '#eff6ff' : 'transparent',
              color: picking ? '#1e40af' : '#9ca3af',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 120ms',
            }}
          >
            <SquareMousePointer size={14} />
          </button>
          <div style={{ width: 1, height: 14, background: 'rgba(229,231,235,0.8)' }} />
          {/* 포지션 버튼 */}
          <DockDropdown current={dockPosition} onChange={onDockChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" onClick={onClose}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(243,244,246,0.8)'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
            style={{
              width: 24, height: 24, borderRadius: 5, border: '1px solid rgba(229,231,235,0.8)',
              background: 'transparent', color: '#9ca3af', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 100ms',
            }}><X size={13} /></button>
        </div>
      </div>


      {view === 'tree' ? (
        <>

          {/* 검색 */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="컴포넌트 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '5px 26px 5px 26px',
                  borderRadius: 5, border: '1px solid rgba(229,231,235,0.8)',
                  background: 'rgba(249,250,251,0.6)', fontSize: 11, color: '#111827',
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(229,231,235,0.8)'; e.currentTarget.style.background = 'rgba(249,250,251,0.6)'; }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, borderRadius: '50%', border: 'none',
                    background: '#d1d5db', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}
                ><X size={10} /></button>
              )}
            </div>
          </div>

          {/* 폴더 트리 */}
          <div ref={treeScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filteredEntries.length === 0 ? (
              <p style={{ margin: 0, padding: '16px 12px', fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                {searchQuery ? `"${searchQuery}" 검색 결과 없음` : '현재 화면에 렌더된 컴포넌트가 없습니다'}
              </p>
            ) : (
              <TreeNodeView
                node={tree}
                depth={0}
                hoveredIds={hoveredIds}
                treeHoveredId={treeHoveredId}
                selectedId={selectedId}
                focusedSymbolId={focusedIdx >= 0 ? (treeOrderedEntries[focusedIdx]?.symbolId ?? '') : ''}
                onSelect={onSelect}
                selectedRef={selectedRef}
                onHover={(id) => { setTreeHoveredId(id); onHighlight(id); }}
                onHoverEnd={() => { setTreeHoveredId(''); onHighlightEnd(); }}
                forceExpanded={searchQuery.length > 0}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* 뒤로가기 바 */}
          <div style={{
            height: 36, minHeight: 36,
            display: 'grid', gridTemplateColumns: '32px 1fr 32px',
            alignItems: 'center',
            padding: '0 6px',
            borderBottom: '1px solid rgba(229,231,235,0.6)',
            background: 'rgba(249,250,251,0.5)',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setView('tree')}
              style={{
                width: 28, height: 28, borderRadius: 5,
                border: '1px solid rgba(229,231,235,0.8)', background: 'transparent',
                cursor: 'pointer', color: '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(243,244,246,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {selectedEntry?.name ?? selectedId.split('#').at(-1)}
            </span>
            <div />
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
              : <p style={{ margin: 0, padding: '16px 12px', fontSize: 11, color: '#9ca3af' }}>데이터 없음</p>
            }
          </div>
        </>
      )}
    </div>
  );
}
