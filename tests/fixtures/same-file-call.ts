import type { FlowmapGraph } from '../../src/core/types/graph';

export const sameFileCallFlow: FlowmapGraph = {
  nodes: [
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
        {
          symbolId: 'symbol:src/api/user.ts#buildRequestUrl',
          name: 'buildRequestUrl',
          symbolType: 'function',
          exported: false,
        },
      ],
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
      id: 'symbol:src/api/user.ts#buildRequestUrl',
      kind: 'symbol',
      fileId: 'file:src/api/user.ts',
      name: 'buildRequestUrl',
      symbolType: 'function',
      exported: false,
    },
  ],
  edges: [
    {
      id: 'contains:file:src/api/user.ts->symbol:src/api/user.ts#fetchUser',
      kind: 'contains',
      source: 'file:src/api/user.ts',
      target: 'symbol:src/api/user.ts#fetchUser',
    },
    {
      id: 'contains:file:src/api/user.ts->symbol:src/api/user.ts#buildRequestUrl',
      kind: 'contains',
      source: 'file:src/api/user.ts',
      target: 'symbol:src/api/user.ts#buildRequestUrl',
    },
    {
      id: 'call:symbol:src/api/user.ts#fetchUser->symbol:src/api/user.ts#buildRequestUrl',
      kind: 'call',
      source: 'symbol:src/api/user.ts#fetchUser',
      target: 'symbol:src/api/user.ts#buildRequestUrl',
    },
  ],
};
