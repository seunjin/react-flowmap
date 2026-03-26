import { useState, useEffect, useRef, useMemo } from 'react';
import type React from 'react';
import { SquareMousePointer, X, Search, ChevronLeft, ExternalLink, Maximize2, Clipboard, Check } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { DockPosition, FoundComp, RfmNextRoute, RfmNextServerComponent } from './types';
import { sidebarStyle, openInEditor, findAllMountedRfmComponents, deriveDisplayName, findAllInstanceRectsBySymbolId } from './utils';
import { buildUnifiedTree, flattenUnifiedEntries, UnifiedTreeView } from './UnifiedTreeView';
import type { UnifiedFolder, UnifiedFile } from './UnifiedTreeView';
import { DockDropdown } from './DockDropdown';
import { EntryDetail } from './EntryDetail';
import { ServerComponentDetail } from './ServerComponentDetail';

// ─── 트리 텍스트 직렬화 (복사 버튼용) ────────────────────────────────────────

function serializeImportNode(node: RfmNextServerComponent, prefix: string, isLast: boolean): string {
  const connector = isLast ? '└── ' : '├── ';
  const badge = node.isServer ? '(S)' : '(C)';
  const line = `${prefix}${connector}${node.componentName} ${badge}`;
  if (!node.children?.length) return line;
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  return [line, ...node.children.map((c, i) =>
    serializeImportNode(c, childPrefix, i === node.children!.length - 1),
  )].join('\n');
}

function serializeUnifiedNode(
  node: UnifiedFolder | UnifiedFile,
  prefix: string,
  isLast: boolean,
): string {
  const connector = isLast ? '└── ' : '├── ';
  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  if (node.kind === 'folder') {
    const line = `${prefix}${connector}${node.name}/`;
    const childLines = node.children.map((c, i) =>
      serializeUnifiedNode(c, childPrefix, i === node.children.length - 1),
    );
    return [line, ...childLines].join('\n');
  }

  const lines: string[] = [];
  const { route, entries } = node;

  if (route) {
    const badge = route.isServer ? '(S)' : '(C)';
    lines.push(`${prefix}${connector}${node.name}  ${route.componentName} ${badge}`);
    if (route.children?.length) {
      route.children.forEach((child, ci) => {
        lines.push(serializeImportNode(child, childPrefix, ci === route.children!.length - 1));
      });
    }
  } else if (entries.length > 0) {
    lines.push(`${prefix}${connector}${node.name}  ${entries.map(e => e.name).join(', ')}`);
  }

  return lines.filter(Boolean).join('\n');
}

// ─── FloatingSidebar ──────────────────────────────────────────────────────────

export function FloatingSidebar({
  stack, selectedId, selectedLoc, selectedEl, allEntries, onSelect, onClose,
  dockPosition, floatPos, onDockChange, onFloatMove,
  onHighlight, onHighlightEnd, onRouteRect, onRouteHoverRect,
  picking, onPickToggle,
  onOpenGraphWindow,
  nextRoutes,
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
  onRouteRect: (rect: DOMRect | null, label: string) => void;
  onRouteHoverRect: (rect: DOMRect | null, label: string) => void;
  picking: boolean;
  onPickToggle: () => void;
  onOpenGraphWindow: () => void;
  nextRoutes: RfmNextRoute[] | null;
}) {
  const [view, setView] = useState<'tree' | 'detail' | 'server-detail'>('tree');
  const [selectedRoute, setSelectedRoute] = useState<RfmNextRoute | null>(null);

  function computeRouteRect(route: RfmNextRoute): DOMRect {
    // layout → 항상 전체 뷰포트
    if (route.type === 'layout') {
      return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    }
    // 라우트 컴포넌트 자체가 displayEntries에 있으면 실제 DOM rect 사용
    const ownEntry = displayEntries.find(e => e.filePath === route.filePath && e.name === route.componentName)
      ?? displayEntries.find(e => e.filePath === route.filePath);

    if (ownEntry) {
      const rects = findAllInstanceRectsBySymbolId(ownEntry.symbolId);
      if (rects.length > 0) {
        const t = Math.min(...rects.map(r => r.top));
        const l = Math.min(...rects.map(r => r.left));
        const r = Math.max(...rects.map(r => r.right));
        const b = Math.max(...rects.map(r => r.bottom));
        return new DOMRect(l, t, r - l, b - t);
      }
    }
    // 서버 컴포넌트 등 DOM에 없으면 전체 뷰포트 fallback
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function activateRoute(route: RfmNextRoute) {
    const fullRoute = nextRoutes?.find(r => r.filePath === route.filePath) ?? route;
    setSelectedRoute(fullRoute);
    onRouteRect(computeRouteRect(fullRoute), fullRoute.componentName);
  }

  function selectRoute(route: RfmNextRoute) {
    const fullRoute = nextRoutes?.find(r => r.filePath === route.filePath) ?? route;
    setSelectedRoute(fullRoute);
    setView('server-detail');
    onRouteRect(computeRouteRect(fullRoute), fullRoute.componentName);
  }

  function hoverRoute(route: RfmNextRoute | null) {
    if (!route) { onRouteHoverRect(null, ''); return; }
    onRouteHoverRect(computeRouteRect(route), route.componentName);
  }

  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const treeScrollRef = useRef<HTMLDivElement | null>(null);

  // 플로팅 드래그
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  function onHeaderMouseDown(e: React.MouseEvent) {
    if (dockPosition !== 'float') return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: floatPos.x, origY: floatPos.y };
    function onMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      onFloatMove({
        x: Math.max(0, dragRef.current.origX + (ev.clientX - dragRef.current.startX)),
        y: Math.max(0, dragRef.current.origY + (ev.clientY - dragRef.current.startY)),
      });
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
    const mountedComponents = findAllMountedRfmComponents();
    if (mountedComponents.length === 0) return [];
    const allById = new Map(allEntries.map(e => [e.symbolId, e]));
    return mountedComponents.map(c => {
      const existing = allById.get(c.symbolId);
      if (existing) return existing;
      const match = c.symbolId.match(/^symbol:(.+)#(.+)$/);
      if (!match) return null;
      const filePath = match[1]!;
      const name = deriveDisplayName(match[2]!, filePath);
      return {
        symbolId: c.symbolId, name, filePath,
        category: (name.endsWith('Page') || name.endsWith('Layout') ? 'page' : 'component') as DocEntry['category'],
        renders: [], renderedBy: [], uses: [], usedBy: [], apiCalls: [],
      };
    }).filter((e): e is DocEntry => e !== null);
  }, [allEntries]);

  // CSR 컴포넌트의 서버 부모 라우트 — 어떤 경로로 진입해도 자동 계산
  const serverParent = useMemo<RfmNextRoute | null>(() => {
    if (view !== 'detail' || !selectedId || !nextRoutes) return null;
    const entry = displayEntries.find(e => e.symbolId === selectedId);
    if (!entry?.filePath) return null;
    // nextRoutes에서 이 파일을 import하는 라우트 탐색
    const found = nextRoutes.find(route =>
      route.children?.some(c => c.filePath === entry.filePath),
    );
    return found ?? null;
  }, [view, selectedId, displayEntries, nextRoutes]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return displayEntries;
    const q = searchQuery.toLowerCase();
    return displayEntries.filter(e => e.name.toLowerCase().includes(q));
  }, [displayEntries, searchQuery]);

  // 통합 폴더 트리: 라우트 파일 + 런타임 컴포넌트
  const unifiedTree = useMemo(
    () => buildUnifiedTree(nextRoutes, filteredEntries),
    [nextRoutes, filteredEntries],
  );

  // 키보드 네비게이션용 플랫 리스트 (런타임 컴포넌트만)
  const treeOrderedEntries = useMemo(() => flattenUnifiedEntries(unifiedTree), [unifiedTree]);

  const selectedEntry = allEntries.find(e => e.symbolId === selectedId)
    ?? displayEntries.find(e => e.symbolId === selectedId)
    ?? null;
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  function copyTree() {
    const text = unifiedTree.children
      .map((c, i) => serializeUnifiedNode(c, '', i === unifiedTree.children.length - 1))
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // selectedId 초기화 시 트리뷰로 복귀
  useEffect(() => { if (!selectedId && view === 'detail') setView('tree'); }, [selectedId]);

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
          if (entry.symbolId === selectedId) setView('detail');
          else onSelect(entry.symbolId);
        }
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [view, treeOrderedEntries, focusedIdx, onSelect]);

  return (
    <div
      data-rfm-overlay
      data-rfm-sidebar
      style={sidebarStyle(dockPosition, floatPos)}
    >
      {/* 헤더 */}
      <div
        onMouseDown={onHeaderMouseDown}
        className={`h-9 min-h-9 flex items-center justify-between px-2 border-b border-[rgba(229,231,235,0.5)] shrink-0 select-none ${
          dockPosition === 'float'
            ? 'bg-[rgba(249,250,251,0.5)] cursor-grab'
            : 'bg-[rgba(249,250,251,0.6)] cursor-default'
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPickToggle}
            title={picking ? 'Cancel (Escape)' : 'Pick element'}
            className={`w-6 h-6 rounded-[4px] border-none flex items-center justify-center cursor-pointer transition-all duration-100 ${
              picking
                ? 'bg-rfm-bg-100 text-rfm-text-700'
                : 'bg-transparent text-rfm-text-400 hover:bg-rfm-bg-100 hover:text-rfm-text-700'
            }`}
          >
            <SquareMousePointer size={14} />
          </button>
          <div className="w-px h-3.5 bg-rfm-border-light" />
          <DockDropdown current={dockPosition} onChange={onDockChange} />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyTree}
            title="Copy tree as text"
            className="w-6 h-6 rounded-[4px] border-none bg-transparent text-rfm-text-400 cursor-pointer flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Clipboard size={12} />}
          </button>
          <button
            type="button"
            onClick={onOpenGraphWindow}
            title="Open full graph in new window"
            className="w-6 h-6 rounded-[4px] border-none bg-transparent text-rfm-text-400 cursor-pointer flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
          >
            <Maximize2 size={12} />
          </button>
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
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* 통합 폴더 트리 */}
          <div ref={treeScrollRef} className="flex-1 overflow-y-auto pt-1 pb-4">
            <UnifiedTreeView
              tree={unifiedTree}
              selectedId={selectedId}
              focusedSymbolId={focusedIdx >= 0 ? (treeOrderedEntries[focusedIdx]?.symbolId ?? '') : ''}
              hoveredIds={hoveredIds}
              treeHoveredId={treeHoveredId}
              selectedRouteFilePath={selectedRoute?.filePath ?? ''}
              onSelect={onSelect}
              onDetail={() => setView('detail')}
              onActivateRoute={(route) => activateRoute(route)}
              onSelectRoute={(route) => selectRoute(route)}
              selectedRef={selectedRef}
              onHover={(id) => { setTreeHoveredId(id); onHighlight(id); }}
              onHoverEnd={() => { setTreeHoveredId(''); onHighlightEnd(); }}
              onHoverRoute={(route) => hoverRoute(route)}
              onHoverRouteEnd={() => hoverRoute(null)}
            />
          </div>
        </>
      ) : (
        <>
          {/* 뒤로가기 바 */}
          <div className="h-9 min-h-9 grid grid-cols-[32px_1fr_32px] items-center px-2 border-b border-[rgba(229,231,235,0.5)] shrink-0">
            <button
              type="button"
              onClick={() => {
                if (view === 'detail' && serverParent) {
                  // CSR 상세에서 뒤로 → 서버 부모로 복귀
                  setView('server-detail');
                  onRouteRect(computeRouteRect(serverParent), serverParent.componentName);
                } else {
                  setView('tree');
                  setSelectedRoute(null);
                  onRouteRect(null, '');
                }
              }}
              className="w-6 h-6 rounded-[4px] border-none bg-transparent cursor-pointer text-rfm-text-400 flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] font-semibold text-rfm-text-900 truncate text-center">
              {view === 'server-detail'
                ? selectedRoute?.componentName
                : (selectedEntry?.name ?? selectedId.split('#').at(-1))
              }
            </span>
            <div className="flex justify-end">
              {view === 'detail' && selectedEntry?.filePath && (
                <button
                  type="button"
                  onClick={() => openInEditor(selectedEntry.filePath!, selectedEntry.symbolId, selectedLoc)}
                  title="Open in editor"
                  className="w-6 h-6 rounded-[4px] border-none bg-transparent cursor-pointer text-rfm-text-400 flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
                >
                  <ExternalLink size={12} />
                </button>
              )}
              {view === 'server-detail' && selectedRoute?.filePath && (
                <button
                  type="button"
                  onClick={() => openInEditor(selectedRoute.filePath, '', '1')}
                  title="Open in editor"
                  className="w-6 h-6 rounded-[4px] border-none bg-transparent cursor-pointer text-rfm-text-400 flex items-center justify-center transition-all duration-100 hover:bg-rfm-bg-100 hover:text-rfm-text-700"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 상세 */}
          <div className="flex-1 overflow-y-auto">
            {view === 'server-detail' && selectedRoute
              ? <ServerComponentDetail
                  route={selectedRoute}
                  allRoutes={nextRoutes ?? []}
                  onSelectRoute={(r) => selectRoute(r)}
                  onHoverRoute={(r) => hoverRoute(r)}
                  onHoverRouteEnd={() => hoverRoute(null)}
                  onHoverImportChild={(child) => {
                    const entry = displayEntries.find(
                      e => e.filePath === child.filePath && e.name === child.componentName,
                    ) ?? displayEntries.find(e => e.filePath === child.filePath);
                    if (entry) onHighlight(entry.symbolId);
                  }}
                  onHoverImportChildEnd={onHighlightEnd}
                  onSelectImportChild={(child) => {
                    const entry = displayEntries.find(
                      e => e.filePath === child.filePath && e.name === child.componentName,
                    ) ?? displayEntries.find(e => e.filePath === child.filePath);
                    if (entry) { onSelect(entry.symbolId); setView('detail'); }
                  }}
                />
              : selectedEntry
                ? <EntryDetail
                    entry={selectedEntry}
                    selectedEl={selectedEl}
                    onNavigate={(symbolId) => { onSelect(symbolId); }}
                    onHover={(symbolId) => onHighlight(symbolId)}
                    onHoverEnd={onHighlightEnd}
                    serverParent={serverParent ? {
                      name: serverParent.componentName,
                      onSelect: () => { setView('server-detail'); onRouteRect(computeRouteRect(serverParent), serverParent.componentName); },
                      onHover: () => hoverRoute(serverParent),
                      onHoverEnd: () => hoverRoute(null),
                    } : undefined}
                  />
                : <p className="m-0 px-2 py-4 text-[11px] text-rfm-text-400">No data</p>
            }
          </div>
        </>
      )}
    </div>
  );
}
