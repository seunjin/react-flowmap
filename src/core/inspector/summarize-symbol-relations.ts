import type { SymbolRelationSummary } from '../types/inspector.js';
import type { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';

export function summarizeSymbolRelations(
  store: InMemoryGraphStore,
  symbolId: string
): SymbolRelationSummary {
  const outgoingEdges = store.getOutgoingEdges(symbolId);
  const incomingEdges = store.getIncomingEdges(symbolId);

  return {
    symbolId,
    outgoingEdgeIds: outgoingEdges.map((edge) => edge.id),
    incomingEdgeIds: incomingEdges.map((edge) => edge.id),
    requestEdgeIds: outgoingEdges
      .filter((edge) => edge.kind === 'request')
      .map((edge) => edge.id),
  };
}
