import type { FileNode, FlowmapGraph, FlowmapNode, RuntimeEdge } from '../types/graph.js';

function isIncludedRuntimeEdge(edge: FlowmapGraph['edges'][number], runtimeEdgeIds: Set<string>): edge is RuntimeEdge {
  return edge.kind !== 'contains' && runtimeEdgeIds.has(edge.id);
}

function createFocusedFileNode(fileNode: FileNode, includedSymbolIds: Set<string>): FileNode {
  return {
    ...fileNode,
    exports: fileNode.exports.filter((item) => includedSymbolIds.has(item.symbolId)),
  };
}

export function focusGraphByRuntimeEdges(
  graph: FlowmapGraph,
  supportingEdgeIds: string[]
): FlowmapGraph {
  if (supportingEdgeIds.length === 0) {
    return graph;
  }

  const runtimeEdgeIds = new Set(supportingEdgeIds);
  const runtimeEdges = graph.edges.filter((edge) => isIncludedRuntimeEdge(edge, runtimeEdgeIds));

  if (runtimeEdges.length === 0) {
    return graph;
  }

  const includedNodeIds = new Set<string>();
  const includedSymbolIds = new Set<string>();
  const fileIdsBySymbolId = new Map<string, string>();

  graph.nodes.forEach((node) => {
    if (node.kind === 'symbol') {
      fileIdsBySymbolId.set(node.id, node.fileId);
    }
  });

  for (const edge of runtimeEdges) {
    includedNodeIds.add(edge.source);
    includedNodeIds.add(edge.target);

    const sourceFileId = fileIdsBySymbolId.get(edge.source);
    const targetFileId = fileIdsBySymbolId.get(edge.target);

    if (sourceFileId) {
      includedNodeIds.add(sourceFileId);
      includedSymbolIds.add(edge.source);
    }

    if (targetFileId) {
      includedNodeIds.add(targetFileId);
      includedSymbolIds.add(edge.target);
    }
  }

  const nodes = graph.nodes.reduce<FlowmapNode[]>((current, node) => {
    if (!includedNodeIds.has(node.id)) {
      return current;
    }

    if (node.kind === 'file') {
      current.push(createFocusedFileNode(node, includedSymbolIds));
      return current;
    }

    current.push(node);
    return current;
  }, []);

  const edges = graph.edges.filter((edge) => {
    if (edge.kind === 'contains') {
      return includedNodeIds.has(edge.source) && includedNodeIds.has(edge.target);
    }

    return runtimeEdgeIds.has(edge.id);
  });

  return { nodes, edges };
}
