import { createContext, useEffect, useRef } from 'react';
import { RuntimeCollector } from './collector/collector';
import { RuntimeSession } from './tracing/runtime-session';

export const __goriCollector = new RuntimeCollector();

export const __goriSession = new RuntimeSession(__goriCollector, {
  createEventId: (kind: string) => `evt-${kind}:${Date.now()}`,
});

export const __GoriCtx = createContext<string>('__root__');

export function __useGoriRecord(parent: string, self: string, file: string): void {
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    __goriSession.recordRender(parent, self, file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
