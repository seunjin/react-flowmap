import { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';
import type { FlowmapGraph, RuntimeEdge } from '../types/graph.js';
import type { SelectionState } from '../types/selection.js';
import type { FileEdge, FileLevelView } from '../types/projection.js';

import { selectRuntimeEdges } from '../selection/select-runtime-edges.js';
import { buildFileEdge } from './build-file-edge.js';

function resolveTargetFileId(store: InMemoryGraphStore, edge: RuntimeEdge): string | undefined {
  const targetNode = store.getNode(edge.target);

  if (!targetNode) {
    return undefined;
  }

  if (targetNode.kind === 'api') {
    return targetNode.id;
  }

  if (targetNode.kind === 'symbol') {
    return store.getFileForSymbol(targetNode.id)?.id;
  }

  return undefined;
}

function resolveSourceFileId(store: InMemoryGraphStore, edge: RuntimeEdge): string | undefined {
  const sourceNode = store.getNode(edge.source);

  if (!sourceNode || sourceNode.kind !== 'symbol') {
    return undefined;
  }

  return store.getFileForSymbol(sourceNode.id)?.id;
}

function toRelationType(edge: RuntimeEdge): FileEdge['relationTypes'][number] {
  return edge.kind;
}

function mergeFileEdges(current: FileEdge, next: RuntimeEdge): FileEdge {
  const relationType = toRelationType(next);

  return {
    ...current,
    relationTypes: current.relationTypes.includes(relationType)
      ? current.relationTypes
      : [...current.relationTypes, relationType],
    supportingEdges: current.supportingEdges.includes(next.id)
      ? current.supportingEdges
      : [...current.supportingEdges, next.id],
  };
}

export function projectToFileLevelView(
  graph: FlowmapGraph,
  selection?: SelectionState
): FileLevelView {
  const store = new InMemoryGraphStore();
  store.addGraph(graph);
  const runtimeEdgeOrder = new Map(
    store.getRuntimeEdges().map((edge, index) => [edge.id, index] as const)
  );

  const fileEdges = new Map<string, FileEdge>();
  const selectedEdges = selectRuntimeEdges(store, selection);

  for (const edge of selectedEdges) {
    const sourceFileId = resolveSourceFileId(store, edge);
    const targetFileId = resolveTargetFileId(store, edge);

    if (!sourceFileId || !targetFileId || sourceFileId === targetFileId) {
      continue;
    }

    const fileEdgeId = `file-edge:${sourceFileId}->${targetFileId}`;
    const existing = fileEdges.get(fileEdgeId);

    if (!existing) {
      fileEdges.set(
        fileEdgeId,
        buildFileEdge({
          sourceFileId,
          targetFileId,
          relationType: toRelationType(edge),
          supportingEdgeId: edge.id,
        })
      );
      continue;
    }

    fileEdges.set(fileEdgeId, mergeFileEdges(existing, edge));
  }

  return {
    fileNodes: graph.nodes.filter(
      (node): node is FileLevelView['fileNodes'][number] => node.kind === 'file'
    ),
    apiNodes: graph.nodes.filter(
      (node): node is FileLevelView['apiNodes'][number] => node.kind === 'api'
    ),
    fileEdges: [...fileEdges.values()].sort((left, right) => {
      const leftOrder = Math.min(
        ...left.supportingEdges.map((edgeId) => runtimeEdgeOrder.get(edgeId) ?? Number.MAX_SAFE_INTEGER)
      );
      const rightOrder = Math.min(
        ...right.supportingEdges.map((edgeId) => runtimeEdgeOrder.get(edgeId) ?? Number.MAX_SAFE_INTEGER)
      );

      return leftOrder - rightOrder;
    }),
  };
}
