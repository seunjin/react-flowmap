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

function collectOutgoingEdgeLayers(
  store: InMemoryGraphStore,
  selectedSymbolIds: string[],
  hop: number
): RuntimeEdge[][] {
  const layers: RuntimeEdge[][] = [];
  let frontier = new Set(selectedSymbolIds);
  const visitedSymbols = new Set(selectedSymbolIds);

  for (let depth = 0; depth < hop; depth += 1) {
    const nextFrontier = new Set<string>();
    const layer = new Map<string, RuntimeEdge>();

    for (const symbolId of frontier) {
      for (const edge of store.getOutgoingEdges(symbolId)) {
        if (edge.kind === 'contains') {
          continue;
        }

        layer.set(edge.id, edge);

        const targetNode = store.getNode(edge.target);
        if (targetNode?.kind === 'symbol' && !visitedSymbols.has(targetNode.id)) {
          visitedSymbols.add(targetNode.id);
          nextFrontier.add(targetNode.id);
        }
      }
    }

    layers.push([...layer.values()]);

    frontier = nextFrontier;
    if (frontier.size === 0) {
      break;
    }
  }

  return layers;
}

function collectIncomingEdgeLayers(
  store: InMemoryGraphStore,
  selectedSymbolIds: string[],
  hop: number
): RuntimeEdge[][] {
  const layers: RuntimeEdge[][] = [];
  let frontier = new Set(selectedSymbolIds);
  const visitedSymbols = new Set(selectedSymbolIds);

  for (let depth = 0; depth < hop; depth += 1) {
    const nextFrontier = new Set<string>();
    const layer = new Map<string, RuntimeEdge>();

    for (const symbolId of frontier) {
      for (const edge of store.getIncomingEdges(symbolId)) {
        if (edge.kind === 'contains') {
          continue;
        }

        layer.set(edge.id, edge);

        const sourceNode = store.getNode(edge.source);
        if (sourceNode?.kind === 'symbol' && !visitedSymbols.has(sourceNode.id)) {
          visitedSymbols.add(sourceNode.id);
          nextFrontier.add(sourceNode.id);
        }
      }
    }

    layers.push([...layer.values()]);

    frontier = nextFrontier;
    if (frontier.size === 0) {
      break;
    }
  }

  return layers;
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
  outgoingLayers: RuntimeEdge[][];
  incomingLayers: RuntimeEdge[][];
} {
  const allowedEdgeKinds = normalizeEdgeKinds(selection);
  const hop = normalizeHop(selection);
  const outgoingLayers = collectOutgoingEdgeLayers(store, [symbolId], hop);
  const incomingLayers = collectIncomingEdgeLayers(store, [symbolId], hop);

  return {
    outgoingEdges: filterAllowed(outgoingLayers.flat(), allowedEdgeKinds),
    incomingEdges: filterAllowed(incomingLayers.flat(), allowedEdgeKinds),
    outgoingLayers: outgoingLayers.map((layer) => filterAllowed(layer, allowedEdgeKinds)),
    incomingLayers: incomingLayers.map((layer) => filterAllowed(layer, allowedEdgeKinds)),
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
