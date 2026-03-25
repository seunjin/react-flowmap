import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { FlowmapGraph } from '../../core/types/graph.js';
import { buildDocIndex, type DocEntry } from '../doc/build-doc-index';
import type { DockPosition, FoundComp, RfmNextRoute } from './types';
import {
  loadDock, saveDock, saveFloatPos,
  findComponentsAt, findElBySymbolId,
  findElBySymbolIdInSubtree, findAncestorElBySymbolId, getLocForSymbolId,
  findAllMountedRfmComponents, isVisible, getPropsForSymbolId,
  findUnionRectBySymbolId, findAllInstanceRectsBySymbolId, deriveDisplayName,
  buildFiberRelationships,
} from './utils';
import { HoverPreviewBox, ActiveSelectBox } from './Overlays';
import { FloatingSidebar } from './FloatingSidebar';
import { SIDEBAR_W } from './tokens';
import { InspectButton, type FlowmapConfig } from './InspectButton';
import inspectorCss from './inspector.compiled.css?raw';
import type { MainToGraph, GraphToMain, PropTypesMap } from './channel';
import { RFM_CHANNEL } from './channel';

// ─── Serialization helper ─────────────────────────────────────────────────────

/** BroadcastChannel은 structured clone만 지원하므로 함수 등은 문자열로 변환 */
function serializeForChannel(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') {
    const raw = value.name || '';
    const name = raw === 'bound dispatchSetState' ? 'setState'
      : raw === 'bound dispatchReducerState' ? 'dispatch'
      : raw.startsWith('bound ') ? raw.slice(6)
      : raw;
    return { __rfmFn: name };
  }
  if (typeof value === 'symbol') return value.toString();
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(serializeForChannel);
  try {
    // plain object인지 확인 (Date, RegExp 등은 structured clone 가능하므로 통과)
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeForChannel(v)]),
      );
    }
    return String(value);
  } catch {
    return '[Object]';
  }
}

function serializeProps(rawProps: Record<string, unknown> | null): Record<string, unknown> {
  if (!rawProps) return {};
  return Object.fromEntries(
    Object.entries(rawProps)
      .filter(([k]) => k !== 'children')
      .map(([k, v]) => [k, serializeForChannel(v)]),
  );
}

function applyStaticEdges(
  entries: import('../doc/build-doc-index').DocEntry[],
  staticJsx: Record<string, string[]>,
): import('../doc/build-doc-index').DocEntry[] {
  const byId = new Map(entries.map(e => [e.symbolId, e]));
  const byName = new Map(entries.map(e => [e.name, e]));

  // child name → [parentSymbolId] 역방향
  const staticParents = new Map<string, string[]>();
  for (const [fromId, childNames] of Object.entries(staticJsx)) {
    for (const name of childNames) {
      if (!staticParents.has(name)) staticParents.set(name, []);
      staticParents.get(name)!.push(fromId);
    }
  }

  return entries.map(entry => {
    let { renderedBy, renders } = entry;

    // renderedBy 보완: 런타임 부모가 없으면 static 부모 추가
    if (renderedBy.length === 0) {
      const extra = (staticParents.get(entry.name) ?? [])
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(pe => ({ symbolId: pe!.symbolId, name: pe!.name, filePath: pe!.filePath }));
      if (extra.length > 0) renderedBy = extra;
    }

    // renders 보완: staticJsx에 있지만 런타임 renders에 없는 자식 추가
    const staticChildren = staticJsx[entry.symbolId] ?? [];
    const runtimeChildIds = new Set(renders.map(r => r.symbolId));
    const extraRenders = staticChildren
      .map(name => byName.get(name))
      .filter(Boolean)
      .filter(ce => !runtimeChildIds.has(ce!.symbolId))
      .map(ce => ({ symbolId: ce!.symbolId, name: ce!.name, filePath: ce!.filePath }));
    if (extraRenders.length > 0) renders = [...renders, ...extraRenders];

    if (renderedBy === entry.renderedBy && renders === entry.renders) return entry;
    return { ...entry, renderedBy, renders };
  });
}

function broadcastToGraph(
  ch: BroadcastChannel,
  allEntries: import('../doc/build-doc-index').DocEntry[],
  selectedId: string,
) {
  // 항상 fresh하게 계산 (unmount 반영)
  const mountedIds = new Set(findAllMountedRfmComponents().map(c => c.symbolId));
  let mountedEntries = allEntries.filter(e => mountedIds.has(e.symbolId));
  const propTypesMap = (globalThis as unknown as { __rfmPropTypes?: PropTypesMap }).__rfmPropTypes ?? {};
  const staticJsx = (globalThis as unknown as { __rfmStaticJsx?: Record<string, string[]> }).__rfmStaticJsx;
  if (staticJsx) mountedEntries = applyStaticEdges(mountedEntries, staticJsx);
  const fiberRelations = buildFiberRelationships();
  ch.postMessage({
    type: 'graph-update',
    allEntries: mountedEntries,
    selectedId,
    propTypesMap,
    ...(staticJsx ? { staticJsx } : {}),
    fiberRelations,
  } satisfies MainToGraph);
  if (selectedId) {
    const props = serializeProps(getPropsForSymbolId(selectedId));
    ch.postMessage({ type: 'props-update', symbolId: selectedId, props } satisfies MainToGraph);
  }
}

// ─── ComponentOverlay ─────────────────────────────────────────────────────────

export function ComponentOverlay({
  graph, active, onDeactivate, onToggle, onGraphWindowOpen, config = {},
}: {
  graph: FlowmapGraph; active: boolean; onDeactivate: () => void; onToggle?: (() => void) | undefined;
  onGraphWindowOpen?: () => void;
  config?: FlowmapConfig;
}) {
  const [stack,           setStack]           = useState<FoundComp[]>([]);
  const [selectedId,      setSelectedId]      = useState<string>('');
  const [highlightId,     setHighlightId]     = useState<string>('');
  const [graphWindowOpen, setGraphWindowOpen] = useState(false);
  const graphWinRef   = useRef<Window | null>(null);
  const channelRef    = useRef<BroadcastChannel | null>(null);
  const [shadowContainer, setShadowContainer] = useState<HTMLElement | null>(null);

  // Next.js App Router 라우트 트리 — withFlowmap의 DefinePlugin이 주입, Vite에서는 undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextRoutes: RfmNextRoute[] | null = (globalThis as any).__rfmNextRouteTree ?? null;
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

  // 채널 핸들러에서 최신 값 참조용 (stale closure 방지)
  const currentDataRef = useRef<{
    mountedEntries: import('../doc/build-doc-index').DocEntry[]; // allEntries 저장 (broadcastToGraph 내부에서 fresh mount 계산)
    selectedId: string;
  }>({ mountedEntries: [], selectedId: '' });

  // shadow root ref — CSS 동기화에 재사용
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  // inspectorCss를 shadow root에 주입
  // inspector.css는 @source inline()으로 필요한 모든 유틸리티 클래스를 자체 포함.
  // 호스트 앱 CSS는 복사하지 않음 — 호스트의 unlayered 전역 스타일(* { padding:0 } 등)이
  // shadow DOM 안의 @layer utilities 클래스를 덮어쓰는 것을 막기 위함.
  function syncShadowStyles(shadow: ShadowRoot) {
    shadow.querySelectorAll('style[data-rfm-shadow]').forEach(el => el.remove());
    const style = document.createElement('style');
    style.setAttribute('data-rfm-shadow', '');
    style.textContent = inspectorCss;
    shadow.appendChild(style);
  }

  // @property 규칙을 main document에 주입
  // Chrome은 shadow DOM 안의 @property를 무시하므로 main document에 별도 주입 필요.
  // 호스트 앱에 Tailwind가 없으면 --tw-translate-y 등 CSS 변수가 초기화되지 않아 transform이 깨짐.
  function syncPropertyRules() {
    document.head.querySelector('style[data-rfm-props]')?.remove();
    const matches = inspectorCss.match(/@property\s+[^{]+\{[^}]+\}/g);
    if (!matches) return;
    const style = document.createElement('style');
    style.setAttribute('data-rfm-props', '');
    style.textContent = matches.join('\n');
    document.head.appendChild(style);
  }

  // Shadow DOM 설정 — 한 번만 실행 (페인트 전에 동기 실행)
  useLayoutEffect(() => {
    const host = document.createElement('div');
    host.setAttribute('data-rfm-overlay', '');
    host.setAttribute('data-rfm-shadow-host', '');
    host.style.cssText = 'position:fixed;top:0;left:0;overflow:visible;z-index:2147483647;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadowRootRef.current = shadow;
    syncShadowStyles(shadow);
    syncPropertyRules();

    const container = document.createElement('div');
    shadow.appendChild(container);
    setShadowContainer(container);

    return () => {
      host.remove();
      document.head.querySelector('style[data-rfm-props]')?.remove();
      shadowRootRef.current = null;
      setShadowContainer(null);
    };
  }, []);

  // dev HMR: inspectorCss 자체가 바뀌면 재동기화
  useEffect(() => {
    if (shadowRootRef.current) syncShadowStyles(shadowRootRef.current);
    syncPropertyRules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectorCss]);

  // ── BroadcastChannel (그래프 창 연동) ─────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const ch = new BroadcastChannel(RFM_CHANNEL);
    channelRef.current = ch;

    ch.onmessage = (ev: MessageEvent<GraphToMain>) => {
      const msg = ev.data;
      if (msg.type === 'ready') {
        // 그래프 창 준비 완료 → 현재 상태 즉시 전송
        const { mountedEntries, selectedId: sid } = currentDataRef.current;
        broadcastToGraph(ch, mountedEntries, sid);
      } else if (msg.type === 'select') {
        setSelectedId(msg.symbolId);
        const el = findElBySymbolId(msg.symbolId);
        selectedElRef.current = el;
        const props = serializeProps(getPropsForSymbolId(msg.symbolId));
        ch.postMessage({
          type: 'props-update',
          symbolId: msg.symbolId,
          props,
        } satisfies MainToGraph);
      } else if (msg.type === 'hover') {
        setHighlightId(msg.symbolId);
      } else if (msg.type === 'hover-end') {
        setHighlightId('');
      } else if (msg.type === 'pick-start') {
        setPicking(true);
      } else if (msg.type === 'back-to-overlay') {
        setGraphWindowOpen(false);
        graphWinRef.current = null;
        // 인스펙터는 활성 상태 유지
      } else if (msg.type === 'window-close') {
        setGraphWindowOpen(false);
        graphWinRef.current = null;
        onDeactivateRef.current(); // 그래프 창 닫히면 inspector 전체 비활성화
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [active]);

  const index      = useMemo(() => buildDocIndex(graph), [graph]);
  const graphEntries = useMemo(() => [...index.pages, ...index.components], [index]);

  // symbolId → loc(줄번호) 캐시: 한 번 DOM에서 본 loc은 계속 기억
  const locCacheRef = useRef(new Map<string, string>());

  // DOM 커밋 이후 fiber-walk를 재실행하기 위한 trigger
  // useMemo는 render 도중 실행되므로 최초 렌더 시 DOM이 없어 fiber-walk 결과가 비어있음.
  // mount 후 setState로 deps를 변경해 allEntries를 DOM이 존재하는 시점에 다시 계산함.
  // domVersion은 라우트 전환 등 DOM 변경 시 fiber-walk를 재실행하기 위한 카운터.
  const [domVersion, setDomVersion] = useState(0);
  useEffect(() => {
    // 첫 마운트 후 즉시 실행 (domReady 역할 포함)
    setDomVersion(v => v + 1);
    if (!active) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => setDomVersion(v => v + 1), 200);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (debounceId) clearTimeout(debounceId); };
  }, [active]);

  // 그래프에 없지만 DOM에 존재하는 컴포넌트 (App 등 루트 컴포넌트)
  const allEntries = useMemo(() => {
    if (domVersion === 0) return [...graphEntries];
    const graphIds = new Set(graphEntries.map(e => e.symbolId));
    const extra: DocEntry[] = [];
    findAllMountedRfmComponents().forEach(({ symbolId, loc }) => {
      if (loc) locCacheRef.current.set(symbolId, loc);
      if (graphIds.has(symbolId)) return;
      const match = symbolId.match(/^symbol:(.+)#(.+)$/);
      if (!match) return;
      const filePath = match[1]!;
      const name = deriveDisplayName(match[2]!, filePath);
      extra.push({
        symbolId,
        name,
        filePath,
        category: name.endsWith('Page') || name.endsWith('Layout') ? 'page' : 'component',
        renders: [], renderedBy: [], uses: [], usedBy: [], apiCalls: [],
      });
      graphIds.add(symbolId);
    });
    return [...graphEntries, ...extra];
  }, [graphEntries, domVersion]);

  // 채널 핸들러에서 최신 값 참조용 ref 동기화
  useEffect(() => {
    currentDataRef.current = { mountedEntries: allEntries, selectedId };
  }, [allEntries, selectedId]);

  // allEntries / selectedId 변경 시 그래프 창에 브로드캐스트
  useEffect(() => {
    if (!graphWindowOpen || !channelRef.current) return;
    broadcastToGraph(channelRef.current, allEntries, selectedId);
  }, [allEntries, selectedId, graphWindowOpen]);

  // DOM 변화(mount/unmount) 감지 → 그래프창 재동기화
  useEffect(() => {
    if (!graphWindowOpen) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (channelRef.current) broadcastToGraph(channelRef.current, allEntries, selectedIdRef.current);
      }, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (debounceId) clearTimeout(debounceId); };
  }, [graphWindowOpen, allEntries]);

  // pick 완료 시 그래프 창으로 결과 전달
  const prevPickingRef = useRef(false);
  useEffect(() => {
    if (prevPickingRef.current && !picking && selectedId && graphWindowOpen && channelRef.current) {
      channelRef.current.postMessage({ type: 'pick-result', symbolId: selectedId } satisfies MainToGraph);
    }
    prevPickingRef.current = picking;
  }, [picking, selectedId, graphWindowOpen]);

  function openGraphWindow() {
    if (graphWinRef.current && !graphWinRef.current.closed) {
      graphWinRef.current.focus();
      return;
    }
    // 현재 URL에 ?__rfm=graph 추가 — 별도 라우트 불필요, 모든 프레임워크 동작
    const url = new URL(window.location.href);
    url.searchParams.set('__rfm', 'graph');
    const win = window.open(url.toString(), 'rfm-graph', 'width=1200,height=800');
    graphWinRef.current = win;
    setGraphWindowOpen(true);
    onGraphWindowOpen?.();
    setTimeout(() => {
      const propTypesMap = (globalThis as unknown as { __rfmPropTypes?: PropTypesMap }).__rfmPropTypes ?? {};
      channelRef.current?.postMessage({
        type: 'graph-update',
        allEntries,
        selectedId,
        propTypesMap,
      } satisfies MainToGraph);
    }, 600);
  }

  // 패널 열림/닫힘
  useEffect(() => {
    if (!active) {
      setPicking(false);
      setStack([]);
      setSelectedId('');
      selectedElRef.current = null;
    }
  }, [active]);

  // 라우터 전환 시 선택 상태 초기화 → 트리뷰로 복귀
  // TanStack Router / React Router / Next.js 모두 history.pushState|replaceState 사용
  useEffect(() => {
    if (!active) return;
    function reset() {
      setSelectedId('');
      selectedElRef.current = null;
      setStack([]);
      setPicking(false);
    }
    const origPush    = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState    = (...args: Parameters<typeof history.pushState>)    => { origPush(...args);    reset(); };
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => { origReplace(...args); reset(); };
    window.addEventListener('popstate', reset);
    return () => {
      window.removeEventListener('popstate', reset);
      history.pushState    = origPush;
      history.replaceState = origReplace;
    };
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
    selectedRect = findUnionRectBySymbolId(selectedId);
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

  if (!shadowContainer) return null;

  if (!active) {
    return createPortal(
      <InspectButton onClick={handleButtonClick} positionOverride={config.buttonPosition} />,
      shadowContainer,
    );
  }

  return createPortal(
    <>
      {/* 사이드바 Relations 노드 hover → DOM 하이라이트 */}
      {highlightId && (() => {
        const rects = findAllInstanceRectsBySymbolId(highlightId);
        const label = highlightId.split('#').at(-1) ?? '';
        return rects.map((rect, i) => (
          isVisible(rect) ? <HoverPreviewBox key={i} rect={rect} label={label} /> : null
        ));
      })()}

      {/* 호버 프리뷰: 점선 — 피킹 중일 때만 */}
      {picking && showHoverBox && (
        <HoverPreviewBox rect={hoveredComp.rect} label={hoveredLabel} />
      )}

      {/* 액티브 선택: 실선 */}
      {selectedRect && (
        <ActiveSelectBox rect={selectedRect} label={selectedLabel} />
      )}

      {/* 플로팅 사이드바 — 그래프 창 열려있을 때는 숨김 */}
      {!graphWindowOpen && <FloatingSidebar
        stack={stack}
        selectedId={selectedId}
        selectedLoc={selectedLoc}
        allEntries={allEntries}
        selectedEl={selectedElRef.current}
        nextRoutes={nextRoutes}
        dockPosition={dockPosition}
        floatPos={floatPos}
        picking={picking}
        onOpenGraphWindow={openGraphWindow}
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
        onClose={() => {
          if (graphWindowOpen && graphWinRef.current && !graphWinRef.current.closed) {
            graphWinRef.current.close();
            setGraphWindowOpen(false);
          }
          onDeactivate();
        }}
        onHighlight={setHighlightId}
        onHighlightEnd={() => setHighlightId('')}
      />}
    </>,
    shadowContainer,
  );
}
