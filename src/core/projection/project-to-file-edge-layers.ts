import { InMemoryGraphStore } from '../graph/in-memory-graph-store.js';
import { selectRuntimeEdgesForSymbol } from '../selection/select-runtime-edges.js';
import type { FlowmapGraph, RuntimeEdge } from '../types/graph.js';
import type { FileEdge, FileEdgeLayer } from '../types/projection.js';
import type { SelectionState } from '../types/selection.js';

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

function mergeFileEdges(current: FileEdge, next: RuntimeEdge): FileEdge {
  return {
    ...current,
    relationTypes: current.relationTypes.includes(next.kind)
      ? current.relationTypes
      : [...current.relationTypes, next.kind],
    supportingEdges: current.supportingEdges.includes(next.id)
      ? current.supportingEdges
      : [...current.supportingEdges, next.id],
  };
}

function toFileEdges(store: InMemoryGraphStore, edges: RuntimeEdge[]): FileEdge[] {
  const fileEdges = new Map<string, FileEdge>();

  for (const edge of edges) {
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
          relationType: edge.kind,
          supportingEdgeId: edge.id,
        })
      );
      continue;
    }

    fileEdges.set(fileEdgeId, mergeFileEdges(existing, edge));
  }

  return [...fileEdges.values()];
}

function getLayerEdgesForSymbol(
  store: InMemoryGraphStore,
  symbolId: string,
  selection: SelectionState
): RuntimeEdge[][] {
  const selected = selectRuntimeEdgesForSymbol(store, symbolId, selection);
  const maxLength = Math.max(selected.outgoingLayers.length, selected.incomingLayers.length);
  const layers: RuntimeEdge[][] = [];

  for (let index = 0; index < maxLength; index += 1) {
    switch (selection.mode) {
      case 'outgoing':
        layers.push(selected.outgoingLayers[index] ?? []);
        break;
      case 'incoming':
        layers.push(selected.incomingLayers[index] ?? []);
        break;
      default:
        layers.push([
          ...(selected.outgoingLayers[index] ?? []),
          ...(selected.incomingLayers[index] ?? []),
        ]);
        break;
    }
  }

  return layers;
}

export function projectToFileEdgeLayers(
  graph: FlowmapGraph,
  selection: SelectionState
): FileEdgeLayer[] {
  if (selection.selectedSymbolIds.length === 0) {
    return [];
  }

  const store = new InMemoryGraphStore();
  store.addGraph(graph);

  const runtimeLayersByHop = new Map<number, RuntimeEdge[]>();

  for (const symbolId of selection.selectedSymbolIds) {
    const layers = getLayerEdgesForSymbol(store, symbolId, selection);

    layers.forEach((layer, index) => {
      runtimeLayersByHop.set(index + 1, [
        ...(runtimeLayersByHop.get(index + 1) ?? []),
        ...layer,
      ]);
    });
  }

  return [...runtimeLayersByHop.entries()]
    .sort((left, right) => left[0] - right[0])
    .flatMap(([hop, edges]) => {
      const dedupedEdges = [...new Map(edges.map((edge) => [edge.id, edge])).values()];
      const fileEdges = toFileEdges(store, dedupedEdges);

      if (fileEdges.length === 0) {
        return [];
      }

      return [
        {
          hop,
          edges: fileEdges,
        },
      ];
    });
}
