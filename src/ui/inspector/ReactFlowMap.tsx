import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  applyRuntimeEvents,
  buildGraphFromState,
  createGraphBuilderState,
} from '../../core/graph/index.js';
import type { FlowmapGraph } from '../../core/types/graph.js';
import { __rfmRuntimeManager } from '../../runtime/rfm-context.js';
import { ComponentOverlay } from './ComponentOverlay.js';
import { GraphWindow } from '../graph-window/GraphWindow.js';
import type { FlowmapConfig } from './InspectButton.js';
import { setEditorOverride } from './utils.js';

// ─── ReactFlowMap ──────────────────────────────────────────────────────────────

export type ReactFlowMapConfig = FlowmapConfig & {
  /** localStorage에 활성 상태 저장 여부 (기본: true) */
  persistActive?: boolean;
  /** localStorage 키 (기본: 'rfm-active') */
  storageKey?: string;
  /** fetch 인터셉터 비활성화 (기본: false) */
  disableFetchInterceptor?: boolean;
};

const emptyGraph: FlowmapGraph = { nodes: [], edges: [] };
const GRAPH_WINDOW_ROOT_ATTR = 'data-rfm-graph-root';

function isGraphWindowLocation(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('__rfm') === 'graph';
}

function installGraphWindowPageGuard(): void {
  if (typeof document === 'undefined') return;

  if (document.head.querySelector('style[data-rfm-graph-window-guard]')) return;

  const style = document.createElement('style');
  style.setAttribute('data-rfm-graph-window-guard', '');
  style.textContent = `
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #f8fafc !important;
}
body > :not([${GRAPH_WINDOW_ROOT_ATTR}]) {
  display: none !important;
}
`;
  document.head.appendChild(style);
}

function uninstallGraphWindowPageGuard(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector('style[data-rfm-graph-window-guard]')?.remove();
}

if (isGraphWindowLocation()) {
  installGraphWindowPageGuard();
}

export function ReactFlowMap({ config = {} }: { config?: ReactFlowMapConfig } = {}) {
  const {
    persistActive = true,
    storageKey = 'rfm-active',
    disableFetchInterceptor = false,
    ...overlayConfig
  } = config;

  useEffect(() => { setEditorOverride(config.editor); }, [config.editor]);

  // ?__rfm=graph 감지 — window.open()으로 열린 그래프 창 팝업인 경우
  // module-level guard가 앱 root를 먼저 숨기고, React tree는 hydration 후 graph mode로 전환한다.
  const [isGraphMode, setIsGraphMode] = useState(false);
  useEffect(() => {
    const next = isGraphWindowLocation();
    setIsGraphMode(next);
    if (next) {
      installGraphWindowPageGuard();
    } else {
      uninstallGraphWindowPageGuard();
    }
  }, []);

  const [active, setActive] = useState(() => {
    if (!persistActive) return false;
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [graph, setGraph] = useState<FlowmapGraph>(emptyGraph);

  const persist = (next: boolean) => {
    if (persistActive) {
      try { localStorage.setItem(storageKey, String(next)); } catch { /* noop */ }
    }
  };

  const graphStateRef = useRef(createGraphBuilderState());
  useEffect(() => {
    if (isGraphMode) return;

    graphStateRef.current = createGraphBuilderState();
    const runtime = __rfmRuntimeManager.acquire({
      enableFetchInterceptor: !disableFetchInterceptor,
    });

    const initialEvents = runtime.collector.getEvents();
    if (initialEvents.length > 0 && applyRuntimeEvents(graphStateRef.current, initialEvents)) {
      setGraph(buildGraphFromState(graphStateRef.current));
    }

    const unsub = runtime.collector.subscribeToBatches((events) => {
      if (!applyRuntimeEvents(graphStateRef.current, events)) {
        return;
      }

      setGraph(buildGraphFromState(graphStateRef.current));
    });

    return () => {
      unsub();
      runtime.release();
      graphStateRef.current = createGraphBuilderState();
      setGraph(emptyGraph);
    };
  }, [disableFetchInterceptor, isGraphMode]);

  // 그래프 창 팝업 모드: 전체화면 오버레이로 GraphWindow 렌더
  // 기존 라우트(/rfm-graph) 없이도 모든 프레임워크에서 동작
  if (isGraphMode) {
    return createPortal(
      <div
        data-rfm-graph-root
        style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: '#ffffff' }}
      >
        <GraphWindow />
      </div>,
      document.body,
    );
  }

  return (
    <ComponentOverlay
      graph={graph}
      active={active}
      onDeactivate={() => { setActive(false); persist(false); }}
      onOpenWorkspace={() => setActive(true)}
      onGraphWindowOpen={() => persist(false)}
      config={overlayConfig}
    />
  );
}
