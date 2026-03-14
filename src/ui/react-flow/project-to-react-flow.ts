import type { FileEdgeLayer, FileLevelView } from '../../core/types/projection.js';
import type { ExportRef } from '../../core/types/static-metadata.js';

export type ReactFlowPosition = {
  x: number;
  y: number;
};

export type ReactFlowNodeData = {
  kind: 'file' | 'api';
  label: string;
  subtitle: string;
  fileId?: string;
  symbolIds?: string[];
  exports?: ExportRef[];
  selectedSymbolIds?: string[];
  isSelected?: boolean;
  onToggleSymbol?: (symbolId: string) => void;
  exportCount?: number;
};

export type ReactFlowNode = {
  id: string;
  type: 'file' | 'api';
  position: ReactFlowPosition;
  data: ReactFlowNodeData;
};

export type ReactFlowEdgeData = {
  relationTypes: string[];
  supportingEdges: string[];
};

export type ReactFlowEdge = {
  id: string;
  source: string;
  target: string;
  type: 'fileRelation';
  label: string;
  data: ReactFlowEdgeData;
};

export type ReactFlowGraph = {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
};

export type ReactFlowProjectionOptions = {
  columnGap?: number;
  rowGap?: number;
};

const DEFAULT_COLUMN_GAP = 320;
const DEFAULT_ROW_GAP = 56;
const FILE_NODE_BASE_HEIGHT = 112;
const FILE_NODE_EXPORT_SECTION_HEIGHT = 40;
const FILE_NODE_EXPORT_ROW_HEIGHT = 44;
const API_NODE_HEIGHT = 96;

function assignLayerMap(view: FileLevelView, edgeLayers: FileEdgeLayer[]): Map<string, number> {
  const layerByNodeId = new Map<string, number>();

  if (edgeLayers.length === 0) {
    view.fileNodes.forEach((node) => layerByNodeId.set(node.id, 0));
    view.apiNodes.forEach((node) => layerByNodeId.set(node.id, 1));
    return layerByNodeId;
  }

  edgeLayers
    .slice()
    .sort((left, right) => left.hop - right.hop)
    .forEach((layer) => {
      for (const edge of layer.edges) {
        if (!layerByNodeId.has(edge.sourceFileId)) {
          layerByNodeId.set(edge.sourceFileId, Math.max(layer.hop - 1, 0));
        }

        const currentTargetLayer = layerByNodeId.get(edge.targetFileId);
        if (currentTargetLayer === undefined || currentTargetLayer < layer.hop) {
          layerByNodeId.set(edge.targetFileId, layer.hop);
        }
      }
    });

  view.fileNodes.forEach((node) => {
    if (!layerByNodeId.has(node.id)) {
      layerByNodeId.set(node.id, 0);
    }
  });

  view.apiNodes.forEach((node) => {
    if (!layerByNodeId.has(node.id)) {
      const maxFileLayer = Math.max(0, ...layerByNodeId.values());
      layerByNodeId.set(node.id, maxFileLayer + 1);
    }
  });

  return layerByNodeId;
}

function buildPositionMap(
  view: FileLevelView,
  edgeLayers: FileEdgeLayer[],
  options?: ReactFlowProjectionOptions
): Map<string, ReactFlowPosition> {
  const columnGap = options?.columnGap ?? DEFAULT_COLUMN_GAP;
  const rowGap = options?.rowGap ?? DEFAULT_ROW_GAP;
  const layerByNodeId = assignLayerMap(view, edgeLayers);
  const nodes = [...view.fileNodes, ...view.apiNodes];
  const groupedByLayer = new Map<number, typeof nodes>();

  nodes
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach((node) => {
      const layer = layerByNodeId.get(node.id) ?? 0;
      groupedByLayer.set(layer, [...(groupedByLayer.get(layer) ?? []), node]);
    });

  const positionById = new Map<string, ReactFlowPosition>();

  [...groupedByLayer.entries()]
    .sort((left, right) => left[0] - right[0])
    .forEach(([layer, layerNodes]) => {
      let currentY = 0;

      layerNodes.forEach((node) => {
        positionById.set(node.id, {
          x: layer * columnGap,
          y: currentY,
        });

        currentY += estimateNodeHeight(node) + rowGap;
      });
    });

  return positionById;
}

function estimateNodeHeight(node: FileLevelView['fileNodes'][number] | FileLevelView['apiNodes'][number]): number {
  if (node.kind === 'api') {
    return API_NODE_HEIGHT;
  }

  if (node.exports.length === 0) {
    return FILE_NODE_BASE_HEIGHT;
  }

  return (
    FILE_NODE_BASE_HEIGHT +
    FILE_NODE_EXPORT_SECTION_HEIGHT +
    node.exports.length * FILE_NODE_EXPORT_ROW_HEIGHT
  );
}

export function projectToReactFlow(
  view: FileLevelView,
  edgeLayers: FileEdgeLayer[] = [],
  options?: ReactFlowProjectionOptions
): ReactFlowGraph {
  const positionById = buildPositionMap(view, edgeLayers, options);

  const nodes: ReactFlowNode[] = [
    ...view.fileNodes.map((node) => ({
      id: node.id,
      type: 'file' as const,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
      data: {
        kind: 'file' as const,
        label: node.name,
        subtitle: node.path,
        fileId: node.id,
        symbolIds: node.exports.map((item) => item.symbolId),
        exports: node.exports,
        exportCount: node.exports.length,
      },
    })),
    ...view.apiNodes.map((node) => ({
      id: node.id,
      type: 'api' as const,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
      data: {
        kind: 'api' as const,
        label: node.label,
        subtitle: node.path,
      },
    })),
  ];

  const edges: ReactFlowEdge[] = view.fileEdges.map((edge) => ({
    id: edge.id,
    source: edge.sourceFileId,
    target: edge.targetFileId,
    type: 'fileRelation',
    label: edge.relationTypes.join(', '),
    data: {
      relationTypes: edge.relationTypes,
      supportingEdges: edge.supportingEdges,
    },
  }));

  return { nodes, edges };
}
