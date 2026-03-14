import type { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';
import type { ApiNode, RuntimeEdge, SymbolNode } from '../types/graph.js';

function getNodeLabel(node: SymbolNode | ApiNode): string {
  if (node.kind === 'api') {
    return node.label;
  }

  return node.name;
}

export function describeRuntimeEdge(
  store: InMemoryGraphStore,
  edge: RuntimeEdge
): string | undefined {
  const sourceNode = store.getNode(edge.source);
  const targetNode = store.getNode(edge.target);

  if (!sourceNode || sourceNode.kind !== 'symbol' || !targetNode) {
    return undefined;
  }

  if (targetNode.kind !== 'symbol' && targetNode.kind !== 'api') {
    return undefined;
  }

  return `${getNodeLabel(sourceNode)} --${edge.kind}--> ${getNodeLabel(targetNode)}`;
}
