import { describe, expect, it } from 'vitest';

import { InMemoryGraphStore } from '../../src/core/graph/in-memory-graph-store';
import { requestUserFlow } from '../fixtures/request-user-flow';
import { sameFileCallFlow } from '../fixtures/same-file-call';
import { simpleUserFlow } from '../fixtures/simple-user-flow';

describe('InMemoryGraphStore', () => {
  it('stores nodes and edges and exposes graph queries', () => {
    const store = new InMemoryGraphStore();

    store.addGraph(simpleUserFlow);

    expect(store.getNode('file:src/pages/user-page.tsx')).toMatchObject({
      kind: 'file',
      name: 'user-page.tsx',
    });

    expect(store.getSymbolsForFile('file:src/pages/user-page.tsx')).toHaveLength(1);
    expect(
      store.getOutgoingEdges('symbol:src/pages/user-page.tsx#UserPage').map((edge) => edge.kind)
    ).toEqual(['use']);
    expect(
      store.getIncomingEdges('symbol:src/hooks/use-user.ts#useUser').map((edge) => edge.kind)
    ).toEqual(['contains', 'use']);
  });

  it('resolves runtime edges and symbol-to-file ownership for projection', () => {
    const store = new InMemoryGraphStore();

    store.addGraph(requestUserFlow);

    expect(store.getFileNodes()).toHaveLength(3);
    expect(store.getApiNodes()).toHaveLength(1);
    expect(store.getRuntimeEdges().map((edge) => edge.kind)).toEqual(['use', 'call', 'request']);
    expect(store.getEdgesByKind('request')).toHaveLength(1);
    expect(store.getFileForSymbol('symbol:src/hooks/use-user.ts#useUser')).toMatchObject({
      id: 'file:src/hooks/use-user.ts',
      kind: 'file',
    });
  });

  it('keeps same-file runtime relationships available without losing ownership information', () => {
    const store = new InMemoryGraphStore();

    store.addGraph(sameFileCallFlow);

    expect(store.getSymbolsForFile('file:src/api/user.ts').map((symbol) => symbol.name)).toEqual([
      'fetchUser',
      'buildRequestUrl',
    ]);
    expect(store.getRuntimeEdges().map((edge) => edge.id)).toEqual([
      'call:symbol:src/api/user.ts#fetchUser->symbol:src/api/user.ts#buildRequestUrl',
    ]);
    expect(store.getFileForSymbol('symbol:src/api/user.ts#buildRequestUrl')).toMatchObject({
      id: 'file:src/api/user.ts',
      name: 'user.ts',
    });
  });
});
