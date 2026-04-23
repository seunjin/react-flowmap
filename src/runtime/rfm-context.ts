import { createContext, useEffect, useRef } from 'react';
import { RuntimeCollector } from './collector/collector';
import { RuntimeSession } from './tracing/runtime-session';
import { FlowmapRuntimeManager } from './runtime-manager';

export const __rfmCollector = new RuntimeCollector();

export const __rfmSession = new RuntimeSession(__rfmCollector, {
  createEventId: (kind: string) => `evt-${kind}:${Date.now()}`,
});
export const __rfmRuntimeManager = new FlowmapRuntimeManager(__rfmCollector, __rfmSession);

export const __RfmCtx = createContext<string>('__root__');

export function __useRfmRecord(parent: string, self: string, file: string): void {
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    __rfmSession.recordRender(parent, self, file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
