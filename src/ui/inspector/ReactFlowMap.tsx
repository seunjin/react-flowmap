import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { buildGraph } from '../../core/graph/index.js';
import type { FlowmapGraph } from '../../core/types/graph.js';
import type { RuntimeEvent } from '../../core/types/runtime-events.js';
import { __rfmCollector, __rfmSession } from '../../runtime/rfm-context.js';
import { attachFetchInterceptor } from '../../runtime/collector/index.js';
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

export function ReactFlowMap({ config = {} }: { config?: ReactFlowMapConfig } = {}) {
  const {
    persistActive = true,
    storageKey = 'rfm-active',
    disableFetchInterceptor = false,
    ...overlayConfig
  } = config;

  useEffect(() => { setEditorOverride(config.editor); }, [config.editor]);

  // ?__rfm=graph 감지 — window.open()으로 열린 그래프 창 팝업인 경우
  // SSR hydration mismatch 방지를 위해 useEffect에서 감지
  const [isGraphMode, setIsGraphMode] = useState(false);
  useEffect(() => {
    setIsGraphMode(new URLSearchParams(window.location.search).get('__rfm') === 'graph');
  }, []);

  const [active, setActive] = useState(() => {
    if (!persistActive) return false;
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [graph, setGraph] = useState<FlowmapGraph>(emptyGraph);

  const persist = (next: boolean) => {
    if (persistActive) {
      try { localStorage.setItem(storageKey, String(next)); } catch {}
    }
  };

  // 컴포넌트 트래킹 — 그래프 모드에서는 불필요하므로 건너뜀
  const detachRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isGraphMode) return;

    const unsub = __rfmCollector.subscribe((events: RuntimeEvent[]) => {
      setGraph(buildGraph(events));
    });

    if (!disableFetchInterceptor) {
      detachRef.current = attachFetchInterceptor({
        collector: __rfmCollector,
        getContext: () => __rfmSession.getContext(),
      });
    }

    return () => {
      unsub();
      detachRef.current?.();
      detachRef.current = null;
      __rfmCollector.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGraphMode]);

  // 그래프 창 팝업 모드: 전체화면 오버레이로 GraphWindow 렌더
  // 기존 라우트(/rfm-graph) 없이도 모든 프레임워크에서 동작
  if (isGraphMode) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 2147483647, background: '#ffffff' }}>
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
      onToggle={() => setActive(p => { const next = !p; persist(next); return next; })}
      onGraphWindowOpen={() => persist(false)}
      config={overlayConfig}
    />
  );
}
