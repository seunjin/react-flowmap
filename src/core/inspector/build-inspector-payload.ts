import { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';
import type { GoriGraph, SymbolNode } from '../types/graph.js';
import type { InspectorPayload } from '../types/inspector.js';
import type { SelectionState } from '../types/selection.js';

import { summarizeSymbolRelations } from './summarize-symbol-relations.js';

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
    relations: selectedSymbols.map((symbol) => summarizeSymbolRelations(store, symbol.id)),
  };
}
