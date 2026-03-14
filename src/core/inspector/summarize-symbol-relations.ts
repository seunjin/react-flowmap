import type { SymbolRelationSummary } from '../types/inspector.js';
import type { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';

import { describeRuntimeEdge } from './describe-runtime-edge.js';

export function summarizeSymbolRelations(
  store: InMemoryGraphStore,
  symbolId: string
): SymbolRelationSummary {
  const outgoingEdges = store.getOutgoingEdges(symbolId);
  const incomingEdges = store.getIncomingEdges(symbolId);
  const outgoingRuntimeEdges = outgoingEdges.filter((edge) => edge.kind !== 'contains');
  const incomingRuntimeEdges = incomingEdges.filter((edge) => edge.kind !== 'contains');
  const requestEdges = outgoingRuntimeEdges.filter((edge) => edge.kind === 'request');

  return {
    symbolId,
    outgoingEdgeIds: outgoingRuntimeEdges.map((edge) => edge.id),
    incomingEdgeIds: incomingRuntimeEdges.map((edge) => edge.id),
    requestEdgeIds: requestEdges.map((edge) => edge.id),
    outgoingEdges: outgoingRuntimeEdges.flatMap((edge) => {
      const label = describeRuntimeEdge(store, edge);
      return label ? [{ edgeId: edge.id, label }] : [];
    }),
    incomingEdges: incomingRuntimeEdges.flatMap((edge) => {
      const label = describeRuntimeEdge(store, edge);
      return label ? [{ edgeId: edge.id, label }] : [];
    }),
    requestEdges: requestEdges.flatMap((edge) => {
      const label = describeRuntimeEdge(store, edge);
      return label ? [{ edgeId: edge.id, label }] : [];
    }),
    outgoingLayers: [],
    incomingLayers: [],
  };
}
