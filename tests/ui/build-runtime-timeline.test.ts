import { describe, expect, it } from 'vitest';

import { buildGraph } from '../../src/core/graph/graph-builder';
import { buildRuntimeTimeline } from '../../src/ui/events/build-runtime-timeline';
import { requestUserFlowEvents } from '../fixtures/request-user-flow-events';

describe('buildRuntimeTimeline', () => {
  it('builds readable timeline items from runtime events', () => {
    const graph = buildGraph(requestUserFlowEvents);
    const timeline = buildRuntimeTimeline(graph, requestUserFlowEvents);

    expect(timeline).toEqual([
      {
        id: 'evt-render-user-page',
        eventType: 'render',
        title: 'Rendered UserPage',
        detail: 'file: user-page.tsx',
        timestamp: 1,
        relativeMs: 0,
      },
      {
        id: 'evt-render-user-card',
        eventType: 'render',
        title: 'UserPage rendered UserCard',
        detail: 'file: user-card.tsx',
        timestamp: 2,
        relativeMs: 1,
      },
      {
        id: 'evt-use-user',
        eventType: 'use',
        title: 'UserPage used useUser',
        timestamp: 3,
        relativeMs: 2,
      },
      {
        id: 'evt-call-fetch-user',
        eventType: 'call',
        title: 'useUser called fetchUser',
        timestamp: 4,
        relativeMs: 3,
      },
      {
        id: 'evt-request-user',
        eventType: 'request',
        title: 'fetchUser requested GET /api/user',
        timestamp: 5,
        relativeMs: 4,
      },
    ]);
  });
});
