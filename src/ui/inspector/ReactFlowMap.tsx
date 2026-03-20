import { useState, useEffect, useRef } from 'react';
import { buildGraph } from '../../core/graph/index.js';
import type { FlowmapGraph } from '../../core/types/graph.js';
import type { RuntimeEvent } from '../../core/types/runtime-events.js';
import { __rfmCollector, __rfmSession } from '../../runtime/rfm-context.js';
import { attachFetchInterceptor } from '../../runtime/collector/index.js';
import { ComponentOverlay } from './ComponentOverlay.js';
import type { FlowmapConfig } from './InspectButton.js';

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

  const [active, setActive] = useState(() => {
    if (!persistActive) return false;
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [graph, setGraph] = useState<FlowmapGraph>(emptyGraph);

  // 활성 상태 localStorage 동기화
  const persist = (next: boolean) => {
    if (persistActive) {
      try { localStorage.setItem(storageKey, String(next)); } catch {}
    }
  };

  // collector 구독 + fetch 인터셉터
  const detachRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    __rfmCollector.reset();

    if (!disableFetchInterceptor) {
      detachRef.current = attachFetchInterceptor({
        collector: __rfmCollector,
        getContext: () => __rfmSession.getContext(),
      });
    }

    const unsub = __rfmCollector.subscribe((events: RuntimeEvent[]) => {
      setGraph(buildGraph(events));
    });

    return () => {
      unsub();
      detachRef.current?.();
      detachRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
