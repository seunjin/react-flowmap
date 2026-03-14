import { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';
import type { GoriGraph, RuntimeEdge, SymbolNode } from '../types/graph.js';
import type { InspectorPayload, SymbolRelationSummary } from '../types/inspector.js';
import type { SelectionState } from '../types/selection.js';

import { describeRuntimeEdge } from './describe-runtime-edge.js';
import { selectRuntimeEdgesForSymbol } from '../selection/select-runtime-edges.js';

function toEdgeDescriptions(store: InMemoryGraphStore, edges: RuntimeEdge[]) {
  return edges.flatMap((edge) => {
    const label = describeRuntimeEdge(store, edge);
    return label ? [{ edgeId: edge.id, label }] : [];
  });
}

function buildRelationSummary(
  store: InMemoryGraphStore,
  symbolId: string,
  selection: SelectionState
): SymbolRelationSummary {
  const selectedEdges = selectRuntimeEdgesForSymbol(store, symbolId, selection);
  const outgoingEdges = selectedEdges.outgoingEdges;
  const incomingEdges = selectedEdges.incomingEdges;
  const requestEdges = outgoingEdges.filter((edge) => edge.kind === 'request');

  switch (selection.mode) {
    case 'outgoing':
      return {
        symbolId,
        outgoingEdgeIds: outgoingEdges.map((edge) => edge.id),
        incomingEdgeIds: [],
        requestEdgeIds: requestEdges.map((edge) => edge.id),
        outgoingEdges: toEdgeDescriptions(store, outgoingEdges),
        incomingEdges: [],
        requestEdges: toEdgeDescriptions(store, requestEdges),
      };
    case 'incoming':
      return {
        symbolId,
        outgoingEdgeIds: [],
        incomingEdgeIds: incomingEdges.map((edge) => edge.id),
        requestEdgeIds: [],
        outgoingEdges: [],
        incomingEdges: toEdgeDescriptions(store, incomingEdges),
        requestEdges: [],
      };
    default:
      return {
        symbolId,
        outgoingEdgeIds: outgoingEdges.map((edge) => edge.id),
        incomingEdgeIds: incomingEdges.map((edge) => edge.id),
        requestEdgeIds: requestEdges.map((edge) => edge.id),
        outgoingEdges: toEdgeDescriptions(store, outgoingEdges),
        incomingEdges: toEdgeDescriptions(store, incomingEdges),
        requestEdges: toEdgeDescriptions(store, requestEdges),
      };
  }
}

export function buildInspectorPayload(
  graph: GoriGraph,
  selection: SelectionState
): InspectorPayload {
  const store = new InMemoryGraphStore();
  store.addGraph(graph);

  const selectedSymbols = selection.selectedSymbolIds
    .map((symbolId) => store.getNode(symbolId))
    .filter((node): node is SymbolNode => node?.kind === 'symbol');

  const resolvedFileId = selection.selectedFileId ?? selectedSymbols[0]?.fileId;
  const fileNode = resolvedFileId ? store.getNode(resolvedFileId) : undefined;

  return {
    ...(fileNode?.kind === 'file' ? { file: fileNode } : {}),
    selectedSymbols,
    relations: selectedSymbols.map((symbol) => buildRelationSummary(store, symbol.id, selection)),
  };
}
