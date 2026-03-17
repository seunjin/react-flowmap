import { useState, useEffect, useRef, useMemo } from 'react';
import type React from 'react';
import { SquareMousePointer, X, Search, ChevronLeft, ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { DockPosition, FoundComp } from './types';
import { sidebarStyle, openInEditor, findAllMountedRfmComponents } from './utils';
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

  const hoveredIds = useMemo(() => new Set(stack.map(c => c.symbolId)), [stack]);
  const [treeHoveredId, setTreeHoveredId] = useState('');

  const displayEntries = useMemo(() => {
    const mountedIds = new Set(findAllMountedRfmComponents().map(c => c.symbolId));
    return allEntries.filter(e => mountedIds.has(e.symbolId));
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

  // selectedId가 초기화되면(라우터 전환 등) 트리뷰로 복귀
  useEffect(() => {
    if (!selectedId) setView('tree');
  }, [selectedId]);

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
        if (entry) {
          if (entry.symbolId === selectedId) {
            setView('detail');
          } else {
            onSelect(entry.symbolId);
          }
        }
      }
    }

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [view, treeOrderedEntries, focusedIdx, onSelect]);

  return (
    <div
      data-rfm-overlay
      style={sidebarStyle(dockPosition, floatPos)}
    >
      {/* 헤더 */}
      <div
        onMouseDown={onHeaderMouseDown}
        className={`h-9 min-h-9 flex items-center justify-between px-2 border-b border-[rgba(229,231,235,0.5)] shrink-0 select-none ${dockPosition === 'float'
          ? 'bg-[rgba(249,250,251,0.5)] cursor-grab'
          : 'bg-[rgba(249,250,251,0.6)] cursor-default'
          }`}
      >
        <div className="flex items-center gap-1">
          {/* 요소 선택 픽 버튼 */}
          <button
            type="button"
            onClick={onPickToggle}
            title={picking ? 'Cancel (Escape)' : 'Pick element'}
            className={`w-6 h-6 rounded-[4px] border-none flex items-center justify-center cursor-pointer transition-all duration-100 ${picking
              ? 'bg-rfm-bg-100 text-rfm-text-700'
              : 'bg-transparent text-rfm-text-400 hover:bg-rfm-bg-100 hover:text-rfm-text-700'
              }`}
          >
            <SquareMousePointer size={14} />
          </button>
          <div className="w-px h-3.5 bg-rfm-border-light" />
          {/* 포지션 버튼 */}
          <DockDropdown current={dockPosition} onChange={onDockChange} />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-[4px] border-none bg-transparent text-rfm-text-400 cursor-pointer flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
          >
            <X size={13} />
          </button>
        </div>
      </div>


      {view === 'tree' ? (
        <>

          {/* 검색 */}
          <div className="px-2 py-1.5 border-b border-rfm-border shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-rfm-text-400" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full box-border py-[5px] pl-[26px] pr-[26px] rounded-[5px] border border-rfm-border-light bg-[rgba(249,250,251,0.6)] text-[11px] text-rfm-text-900 outline-none font-[inherit] focus:border-rfm-text-400 focus:bg-[rgba(255,255,255,0.9)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-none bg-rfm-text-300 text-white cursor-pointer flex items-center justify-center p-0"
                ><X size={10} /></button>
              )}
            </div>
          </div>

          {/* 폴더 트리 */}
          <div ref={treeScrollRef} className="flex-1 overflow-y-auto pt-2 pb-4">
            {filteredEntries.length === 0 ? (
              <p className="m-0 px-2 py-4 text-[11px] text-rfm-text-400 leading-relaxed">
                {searchQuery ? `No results for "${searchQuery}"` : 'No components rendered on screen'}
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
                onDetail={() => setView('detail')}
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
          <div className="h-9 min-h-9 grid grid-cols-[32px_1fr_32px] items-center px-2 border-b border-[rgba(229,231,235,0.5)] shrink-0">
            <button
              type="button"
              onClick={() => setView('tree')}
              className="w-6 h-6 rounded-[4px] border-none bg-transparent cursor-pointer text-rfm-text-400 flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] font-semibold text-rfm-text-900 truncate text-center">
              {selectedEntry?.name ?? selectedId.split('#').at(-1)}
            </span>
            <div className="flex justify-end">
              {selectedEntry?.filePath && (
                <button
                  type="button"
                  onClick={() => openInEditor(selectedEntry.filePath!, selectedEntry.symbolId, selectedLoc)}
                  title="Open in editor"
                  className="w-6 h-6 rounded-[4px] border-none bg-transparent cursor-pointer text-rfm-text-400 flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 상세 — 전체 높이 사용 */}
          <div className="flex-1 overflow-y-auto">
            {selectedEntry
              ? <EntryDetail
                entry={selectedEntry}
                selectedEl={selectedEl}
                onNavigate={(name) => {
                  const target = allEntries.find(e => e.name === name);
                  if (target) onSelect(target.symbolId);
                }}
                onHover={(symbolId) => onHighlight(symbolId)}
                onHoverEnd={onHighlightEnd}
              />
              : <p className="m-0 px-2 py-4 text-[11px] text-rfm-text-400">No data</p>
            }
          </div>
        </>
      )}
    </div>
  );
}
