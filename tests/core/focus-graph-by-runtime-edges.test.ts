import { describe, expect, it } from 'vitest';

import { createRuntimeEdgeIdFromEvent } from '../../src/core/graph/create-runtime-edge-id-from-event';
import { focusGraphByRuntimeEdges } from '../../src/core/graph/focus-graph-by-runtime-edges';
import { requestUserFlow } from '../fixtures/request-user-flow';
import { requestUserFlowEvents } from '../fixtures/request-user-flow-events';

describe('focusGraphByRuntimeEdges', () => {
  it('keeps only the nodes and edges related to the focused runtime edges', () => {
    const graph = focusGraphByRuntimeEdges(requestUserFlow, [
      'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
      'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
    ]);

    expect(graph.nodes).toEqual([
      {
        id: 'file:src/hooks/use-user.ts',
        kind: 'file',
        path: 'src/hooks/use-user.ts',
        name: 'use-user.ts',
        exports: [
          {
            symbolId: 'symbol:src/hooks/use-user.ts#useUser',
            name: 'useUser',
            symbolType: 'hook',
            exported: true,
          },
        ],
      },
      {
        id: 'file:src/api/user.ts',
        kind: 'file',
        path: 'src/api/user.ts',
        name: 'user.ts',
        exports: [
          {
            symbolId: 'symbol:src/api/user.ts#fetchUser',
            name: 'fetchUser',
            symbolType: 'function',
            exported: true,
          },
        ],
      },
      {
        id: 'symbol:src/hooks/use-user.ts#useUser',
        kind: 'symbol',
        fileId: 'file:src/hooks/use-user.ts',
        name: 'useUser',
        symbolType: 'hook',
        exported: true,
      },
      {
        id: 'symbol:src/api/user.ts#fetchUser',
        kind: 'symbol',
        fileId: 'file:src/api/user.ts',
        name: 'fetchUser',
        symbolType: 'function',
        exported: true,
      },
      {
        id: 'api:GET:/api/user',
        kind: 'api',
        method: 'GET',
        path: '/api/user',
        label: 'GET /api/user',
      },
    ]);

    expect(graph.edges).toEqual([
      {
        id: 'contains:file:src/hooks/use-user.ts->symbol:src/hooks/use-user.ts#useUser',
        kind: 'contains',
        source: 'file:src/hooks/use-user.ts',
        target: 'symbol:src/hooks/use-user.ts#useUser',
      },
      {
        id: 'contains:file:src/api/user.ts->symbol:src/api/user.ts#fetchUser',
        kind: 'contains',
        source: 'file:src/api/user.ts',
        target: 'symbol:src/api/user.ts#fetchUser',
      },
      {
        id: 'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        kind: 'call',
        source: 'symbol:src/hooks/use-user.ts#useUser',
        target: 'symbol:src/api/user.ts#fetchUser',
      },
      {
        id: 'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
        kind: 'request',
        source: 'symbol:src/api/user.ts#fetchUser',
        target: 'api:GET:/api/user',
      },
    ]);
  });
});

describe('createRuntimeEdgeIdFromEvent', () => {
  it('maps runtime events to the runtime edge id format', () => {
    expect(requestUserFlowEvents.map((event) => createRuntimeEdgeIdFromEvent(event))).toEqual([
      'render:unknown->symbol:src/pages/user-page.tsx#UserPage',
      'render:symbol:src/pages/user-page.tsx#UserPage->symbol:src/components/user-card.tsx#UserCard',
      'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
      'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
      'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
    ]);
  });
});
