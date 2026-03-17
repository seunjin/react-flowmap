import { useState, useEffect, useRef, useMemo } from 'react';
import type { FlowmapGraph } from '../../core/types/graph.js';
import { buildDocIndex, type DocEntry } from '../doc/build-doc-index';
import type { DockPosition, FoundComp } from './types';
import {
  loadDock, saveDock, saveFloatPos,
  findComponentsAt, findElBySymbolId, findAllElsBySymbolId,
  findElBySymbolIdInSubtree, findAncestorElBySymbolId, getLocForSymbolId,
  findAllMountedRfmComponents, isVisible,
} from './utils';
import { HoverPreviewBox, ActiveSelectBox } from './Overlays';
import { FloatingSidebar } from './FloatingSidebar';
import { SIDEBAR_W } from './tokens';
import { InspectButton, type FlowmapConfig } from './InspectButton';
import inspectorCss from './inspector.css?inline';

// ─── ComponentOverlay ─────────────────────────────────────────────────────────

export function ComponentOverlay({
  graph, active, onDeactivate, onToggle, config = {},
}: {
  graph: FlowmapGraph; active: boolean; onDeactivate: () => void; onToggle?: (() => void) | undefined;
  config?: FlowmapConfig;
}) {
  const [stack,      setStack]      = useState<FoundComp[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [highlightId, setHighlightId] = useState<string>('');
  const [picking,    setPicking]    = useState(false);
  const [dockPosition, setDockPosition] = useState<DockPosition>(loadDock);
  const [floatPos,     setFloatPos]     = useState(() => {
    try {
      const s = localStorage.getItem('rfm-float-pos');
      if (s) return JSON.parse(s) as { x: number; y: number };
    } catch { /* noop */ }
    return config.defaultFloatPos
      ?? { x: Math.max(20, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 360), y: 80 };
  });
  // ref 교체 후 re-render 강제용 (setSelectedId가 동일값이면 React가 스킵하므로)
  const [, forceRender] = useState(0);
  // 클릭으로 선택된 특정 DOM 요소 — 같은 symbolId가 여러 개일 때 정확한 요소를 기억
  const selectedElRef = useRef<HTMLElement | null>(null);
  // MutationObserver 콜백에서 최신 selectedId 참조용
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const onDeactivateRef = useRef(onDeactivate);
  useEffect(() => { onDeactivateRef.current = onDeactivate; }, [onDeactivate]);

  // CSS 주입 — 한 번만 실행
  useEffect(() => {
    if (document.querySelector('style[data-rfm-inspector]')) return;
    const el = document.createElement('style');
    el.setAttribute('data-rfm-inspector', '');
    el.textContent = inspectorCss;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  const index      = useMemo(() => buildDocIndex(graph), [graph]);
  const graphEntries = useMemo(() => [...index.pages, ...index.components], [index]);

  // symbolId → loc(줄번호) 캐시: 한 번 DOM에서 본 loc은 계속 기억
  const locCacheRef = useRef(new Map<string, string>());

  // 그래프에 없지만 DOM에 존재하는 컴포넌트 (App 등 루트 컴포넌트)
  const allEntries = useMemo(() => {
    const graphIds = new Set(graphEntries.map(e => e.symbolId));
    const extra: DocEntry[] = [];
    findAllMountedRfmComponents().forEach(({ symbolId, loc }) => {
      if (loc) locCacheRef.current.set(symbolId, loc);
      if (graphIds.has(symbolId)) return;
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

  // 리사이즈/스크롤 시 선택 박스 위치 갱신
  useEffect(() => {
    if (!active) return;
    function refresh() { forceRender(n => n + 1); }
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [active]);

  // 뷰포트 리사이즈 시 float 사이드바가 화면 밖으로 벗어나지 않도록 clamp
  useEffect(() => {
    if (!active || dockPosition !== 'float') return;
    function clamp() {
      setFloatPos(pos => {
        const newX = Math.min(pos.x, Math.max(8, window.innerWidth  - SIDEBAR_W - 8));
        const newY = Math.min(pos.y, Math.max(8, window.innerHeight - 120));
        return newX === pos.x && newY === pos.y ? pos : { x: newX, y: newY };
      });
    }
    clamp(); // 즉시 실행 (DevTools 열린 상태에서 인스펙터 활성화할 때 대비)
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [active, dockPosition]);

  // 선택된 DOM 요소가 unmount(페이지 전환·필터)되면 대체 인스턴스 탐색 or 선택 해제
  useEffect(() => {
    if (!active) return;
    const observer = new MutationObserver(() => {
      if (!selectedElRef.current || selectedElRef.current.isConnected) return;
      const id = selectedIdRef.current;
      const fallback = id ? findElBySymbolId(id) : null;
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
      if ((e.target as HTMLElement).closest('[data-rfm-overlay]')) return;
      const x = e.clientX, y = e.clientY;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const found = findComponentsAt(x, y);
        found.forEach(c => { if (c.loc) locCacheRef.current.set(c.symbolId, c.loc); });
        setStack(found);
      });
    }

    function onClickApp(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-rfm-overlay]')) return;
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
    const el = selectedElRef.current ?? findElBySymbolId(selectedId);
    if (el) selectedRect = el.getBoundingClientRect();
  }

  // 선택된 컴포넌트 loc: Fiber에서 먼저, 없으면 캐시
  const selectedLoc = useMemo(() => {
    if (!selectedId) return null;
    const fromStack = stack.find(c => c.symbolId === selectedId)?.loc;
    if (fromStack) { locCacheRef.current.set(selectedId, fromStack); return fromStack; }
    const el = selectedElRef.current ?? findElBySymbolId(selectedId);
    const fromFiber = el ? getLocForSymbolId(el, selectedId) : null;
    if (fromFiber) { locCacheRef.current.set(selectedId, fromFiber); return fromFiber; }
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
      <InspectButton onClick={handleButtonClick} positionOverride={config.buttonPosition} />
    );
  }

  return (
    <>
      {/* 사이드바 Relations 노드 hover → DOM 하이라이트 */}
      {highlightId && (() => {
        const els = findAllElsBySymbolId(highlightId);
        const label = highlightId.split('#').at(-1) ?? '';
        return els.map((el, i) => {
          const rect = el.getBoundingClientRect();
          return isVisible(rect) ? <HoverPreviewBox key={i} rect={rect} label={label} /> : null;
        });
      })()}

      {/* 호버 프리뷰: 점선 — 피킹 중일 때만 */}
      {picking && showHoverBox && (
        <HoverPreviewBox rect={hoveredComp.rect} label={hoveredLabel} />
      )}

      {/* 액티브 선택: 실선 */}
      {selectedRect && (
        <ActiveSelectBox rect={selectedRect} label={selectedLabel} />
      )}

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
              const inSubtree = findElBySymbolIdInSubtree(currentEl, id);
              if (inSubtree) {
                selectedElRef.current = inSubtree;
              } else {
                const ancestor = findAncestorElBySymbolId(currentEl, id);
                if (ancestor) {
                  selectedElRef.current = ancestor;
                } else {
                  // 서브트리·조상 모두 없음 → 전역 Fiber 탐색으로 fallback
                  selectedElRef.current = findElBySymbolId(id);
                }
              }
            } else {
              // currentEl이 없을 때 (트리에서 직접 선택): Fiber로 첫 번째 인스턴스 탐색
              selectedElRef.current = findElBySymbolId(id);
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
