import { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';
import type { GoriGraph, SymbolNode } from '../types/graph.js';
import type { InspectorPayload, SymbolRelationSummary } from '../types/inspector.js';
import type { RuntimeEdgeKind, SelectionState } from '../types/selection.js';

import { summarizeSymbolRelations } from './summarize-symbol-relations.js';

function applySelectionToRelation(
  relation: SymbolRelationSummary,
  selection: SelectionState
): SymbolRelationSummary {
  const allowedKinds = new Set(selection.selectedEdgeKinds);
  const outgoingIds = relation.outgoingEdgeIds.filter((edgeId) => allowedKinds.has(edgeId.split(':', 1)[0] as RuntimeEdgeKind));
  const incomingIds = relation.incomingEdgeIds.filter((edgeId) => allowedKinds.has(edgeId.split(':', 1)[0] as RuntimeEdgeKind));
  const requestIds = relation.requestEdgeIds.filter(() => allowedKinds.has('request'));
  const outgoingEdges = relation.outgoingEdges.filter((edge) =>
    allowedKinds.has(edge.edgeId.split(':', 1)[0] as RuntimeEdgeKind)
  );
  const incomingEdges = relation.incomingEdges.filter((edge) =>
    allowedKinds.has(edge.edgeId.split(':', 1)[0] as RuntimeEdgeKind)
  );
  const requestEdges = relation.requestEdges.filter(() => allowedKinds.has('request'));

  switch (selection.mode) {
    case 'outgoing':
      return {
        ...relation,
        outgoingEdgeIds: outgoingIds,
        incomingEdgeIds: [],
        requestEdgeIds: requestIds,
        outgoingEdges,
        incomingEdges: [],
        requestEdges,
      };
    case 'incoming':
      return {
        ...relation,
        outgoingEdgeIds: [],
        incomingEdgeIds: incomingIds,
        requestEdgeIds: [],
        outgoingEdges: [],
        incomingEdges,
        requestEdges: [],
      };
    default:
      return {
        ...relation,
        outgoingEdgeIds: outgoingIds,
        incomingEdgeIds: incomingIds,
        requestEdgeIds: requestIds,
        outgoingEdges,
        incomingEdges,
        requestEdges,
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
    relations: selectedSymbols.map((symbol) =>
      applySelectionToRelation(summarizeSymbolRelations(store, symbol.id), selection)
    ),
  };
}
