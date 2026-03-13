import { describe, expect, it } from 'vitest';

import { InMemoryGraphStore } from '../../src/core/graph/in-memory-graph-store';
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
});
