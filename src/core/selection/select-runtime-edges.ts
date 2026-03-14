import type { RuntimeEdge } from '../types/graph.js';
import type { RuntimeEdgeKind, SelectionState } from '../types/selection.js';
import type { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';

function normalizeHop(selection?: SelectionState): number {
  if (!selection) {
    return 1;
  }

  return Math.max(1, Math.floor(selection.hop));
}

function normalizeEdgeKinds(selection?: SelectionState): Set<RuntimeEdgeKind> {
  if (!selection) {
    return new Set(['render', 'use', 'call', 'request']);
  }

  return new Set(selection.selectedEdgeKinds);
}

function collectOutgoingEdges(
  store: InMemoryGraphStore,
  selectedSymbolIds: string[],
  hop: number
): RuntimeEdge[] {
  const collected = new Map<string, RuntimeEdge>();
  let frontier = new Set(selectedSymbolIds);
  const visitedSymbols = new Set(selectedSymbolIds);

  for (let depth = 0; depth < hop; depth += 1) {
    const nextFrontier = new Set<string>();

    for (const symbolId of frontier) {
      for (const edge of store.getOutgoingEdges(symbolId)) {
        if (edge.kind === 'contains') {
          continue;
        }

        collected.set(edge.id, edge);

        const targetNode = store.getNode(edge.target);
        if (targetNode?.kind === 'symbol' && !visitedSymbols.has(targetNode.id)) {
          visitedSymbols.add(targetNode.id);
          nextFrontier.add(targetNode.id);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.size === 0) {
      break;
    }
  }

  return [...collected.values()];
}

function collectIncomingEdges(
  store: InMemoryGraphStore,
  selectedSymbolIds: string[],
  hop: number
): RuntimeEdge[] {
  const collected = new Map<string, RuntimeEdge>();
  let frontier = new Set(selectedSymbolIds);
  const visitedSymbols = new Set(selectedSymbolIds);

  for (let depth = 0; depth < hop; depth += 1) {
    const nextFrontier = new Set<string>();

    for (const symbolId of frontier) {
      for (const edge of store.getIncomingEdges(symbolId)) {
        if (edge.kind === 'contains') {
          continue;
        }

        collected.set(edge.id, edge);

        const sourceNode = store.getNode(edge.source);
        if (sourceNode?.kind === 'symbol' && !visitedSymbols.has(sourceNode.id)) {
          visitedSymbols.add(sourceNode.id);
          nextFrontier.add(sourceNode.id);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.size === 0) {
      break;
    }
  }

  return [...collected.values()];
}

function filterAllowed(
  edges: RuntimeEdge[],
  allowedEdgeKinds: Set<RuntimeEdgeKind>
): RuntimeEdge[] {
  return edges.filter((edge) => allowedEdgeKinds.has(edge.kind));
}

export function selectRuntimeEdgesForSymbol(
  store: InMemoryGraphStore,
  symbolId: string,
  selection: SelectionState
): {
  outgoingEdges: RuntimeEdge[];
  incomingEdges: RuntimeEdge[];
} {
  const allowedEdgeKinds = normalizeEdgeKinds(selection);
  const hop = normalizeHop(selection);

  return {
    outgoingEdges: filterAllowed(collectOutgoingEdges(store, [symbolId], hop), allowedEdgeKinds),
    incomingEdges: filterAllowed(collectIncomingEdges(store, [symbolId], hop), allowedEdgeKinds),
  };
}

export function selectRuntimeEdges(
  store: InMemoryGraphStore,
  selection?: SelectionState
): RuntimeEdge[] {
  const allowedEdgeKinds = normalizeEdgeKinds(selection);

  if (!selection || selection.selectedSymbolIds.length === 0) {
    return filterAllowed(store.getRuntimeEdges(), allowedEdgeKinds);
  }

  const selected = selection.selectedSymbolIds.flatMap((symbolId) => {
    const relations = selectRuntimeEdgesForSymbol(store, symbolId, selection);

    switch (selection.mode) {
      case 'outgoing':
        return relations.outgoingEdges;
      case 'incoming':
        return relations.incomingEdges;
      default:
        return [...relations.outgoingEdges, ...relations.incomingEdges];
    }
  });

  return [...new Map(selected.map((edge) => [edge.id, edge])).values()];
}
