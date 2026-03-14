import { describe, expect, it } from 'vitest';

import { RuntimeCollector } from '../../src/runtime/collector/collector';
import { RuntimeSession } from '../../src/runtime/tracing/runtime-session';

describe('RuntimeSession', () => {
  it('records render, use, and call events and preserves contextual trace metadata', () => {
    const collector = new RuntimeCollector();
    const session = new RuntimeSession(collector, {
      getTimestamp: () => 100,
      createEventId: (kind) => `evt-${kind}-1`,
    });

    session.runWithContext(
      {
        traceId: 'trace-1',
        sessionId: 'session-1',
      },
      () => {
        session.recordRender(
          'symbol:demo/src/pages/user-page.tsx#UserPage',
          'symbol:demo/src/components/user-card.tsx#UserCard',
          'file:demo/src/components/user-card.tsx'
        );
        session.recordUse(
          'symbol:demo/src/pages/user-page.tsx#UserPage',
          'symbol:demo/src/hooks/use-user.ts#useUser'
        );
        session.recordCall(
          'symbol:demo/src/hooks/use-user.ts#useUser',
          'symbol:demo/src/api/user.ts#fetchUser'
        );
      }
    );

    expect(collector.getEvents()).toEqual([
      {
        id: 'evt-render-1',
        eventType: 'render',
        timestamp: 100,
        sourceSymbolId: 'symbol:demo/src/pages/user-page.tsx#UserPage',
        targetSymbolId: 'symbol:demo/src/components/user-card.tsx#UserCard',
        fileId: 'file:demo/src/components/user-card.tsx',
        traceId: 'trace-1',
        sessionId: 'session-1',
      },
      {
        id: 'evt-use-1',
        eventType: 'use',
        timestamp: 100,
        sourceSymbolId: 'symbol:demo/src/pages/user-page.tsx#UserPage',
        targetSymbolId: 'symbol:demo/src/hooks/use-user.ts#useUser',
        traceId: 'trace-1',
        sessionId: 'session-1',
      },
      {
        id: 'evt-call-1',
        eventType: 'call',
        timestamp: 100,
        sourceSymbolId: 'symbol:demo/src/hooks/use-user.ts#useUser',
        targetSymbolId: 'symbol:demo/src/api/user.ts#fetchUser',
        traceId: 'trace-1',
        sessionId: 'session-1',
      },
    ]);
  });
});
