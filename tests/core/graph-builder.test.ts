import { describe, expect, it } from 'vitest';

import { buildGraph } from '../../src/core/graph/graph-builder';
import { requestUserFlowEvents } from '../fixtures/request-user-flow-events';

describe('buildGraph', () => {
  it('normalizes runtime events into a file, symbol, and api graph', () => {
    const graph = buildGraph(requestUserFlowEvents);

    expect(graph.nodes).toEqual([
      {
        id: 'file:src/pages/user-page.tsx',
        kind: 'file',
        path: 'src/pages/user-page.tsx',
        name: 'user-page.tsx',
        exports: [],
      },
      {
        id: 'symbol:src/pages/user-page.tsx#UserPage',
        kind: 'symbol',
        fileId: 'file:src/pages/user-page.tsx',
        name: 'UserPage',
        symbolType: 'component',
        exported: false,
      },
      {
        id: 'file:src/hooks/use-user.ts',
        kind: 'file',
        path: 'src/hooks/use-user.ts',
        name: 'use-user.ts',
        exports: [],
      },
      {
        id: 'symbol:src/hooks/use-user.ts#useUser',
        kind: 'symbol',
        fileId: 'file:src/hooks/use-user.ts',
        name: 'useUser',
        symbolType: 'hook',
        exported: false,
      },
      {
        id: 'file:src/api/user.ts',
        kind: 'file',
        path: 'src/api/user.ts',
        name: 'user.ts',
        exports: [],
      },
      {
        id: 'symbol:src/api/user.ts#fetchUser',
        kind: 'symbol',
        fileId: 'file:src/api/user.ts',
        name: 'fetchUser',
        symbolType: 'function',
        exported: false,
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
        id: 'contains:file:src/pages/user-page.tsx->symbol:src/pages/user-page.tsx#UserPage',
        kind: 'contains',
        source: 'file:src/pages/user-page.tsx',
        target: 'symbol:src/pages/user-page.tsx#UserPage',
      },
      {
        id: 'contains:file:src/hooks/use-user.ts->symbol:src/hooks/use-user.ts#useUser',
        kind: 'contains',
        source: 'file:src/hooks/use-user.ts',
        target: 'symbol:src/hooks/use-user.ts#useUser',
      },
      {
        id: 'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        kind: 'use',
        source: 'symbol:src/pages/user-page.tsx#UserPage',
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

  it('deduplicates repeated runtime observations into a stable graph shape', () => {
    const graph = buildGraph([...requestUserFlowEvents, ...requestUserFlowEvents]);

    expect(graph.nodes).toHaveLength(7);
    expect(graph.edges).toHaveLength(6);
  });
});
