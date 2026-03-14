import type { FileEdgeLayer, FileLevelView } from '../../core/types/projection.js';
import type { ExportRef } from '../../core/types/static-metadata.js';

export type ReactFlowPosition = {
  x: number;
  y: number;
};

export type ReactFlowNodeData = {
  kind: 'file' | 'api' | 'folder';
  label: string;
  subtitle: string;
  fileId?: string;
  folderPath?: string;
  symbolIds?: string[];
  exports?: ExportRef[];
  selectedSymbolIds?: string[];
  isSelected?: boolean;
  onToggleSymbol?: (symbolId: string) => void;
  exportCount?: number;
  width?: number;
  height?: number;
};

export type ReactFlowNode = {
  id: string;
  type: 'file' | 'api' | 'folder';
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

const DEFAULT_COLUMN_GAP = 72;
const DEFAULT_ROW_GAP = 56;
const FILE_NODE_BASE_HEIGHT = 112;
const FILE_NODE_EXPORT_SECTION_HEIGHT = 40;
const FILE_NODE_EXPORT_ROW_HEIGHT = 44;
const FILE_NODE_WIDTH = 320;
const API_NODE_HEIGHT = 96;
const API_NODE_WIDTH = 320;
const FOLDER_NODE_PADDING = 18;
const FOLDER_NODE_HEADER_HEIGHT = 34;
const INITIAL_LAYER_TOP = 64;

function getFolderPath(filePath: string): string {
  const segments = filePath.split('/');
  return segments.slice(0, -1).join('/') || '.';
}

function getFolderLabel(folderPath: string): string {
  const segments = folderPath.split('/');
  return segments.at(-1) ?? folderPath;
}

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
  let currentX = 0;

  [...groupedByLayer.entries()]
    .sort((left, right) => left[0] - right[0])
    .forEach(([, layerNodes]) => {
      let currentY = INITIAL_LAYER_TOP;

      layerNodes.forEach((node) => {
        positionById.set(node.id, {
          x: currentX,
          y: currentY,
        });

        currentY += estimateNodeHeight(node) + rowGap;
      });

      currentX += estimateLayerWidth(layerNodes) + columnGap;
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

function estimateNodeWidth(node: FileLevelView['fileNodes'][number] | FileLevelView['apiNodes'][number]): number {
  if (node.kind === 'api') {
    return API_NODE_WIDTH;
  }

  return FILE_NODE_WIDTH + FOLDER_NODE_PADDING * 2;
}

function estimateLayerWidth(
  layerNodes: Array<FileLevelView['fileNodes'][number] | FileLevelView['apiNodes'][number]>
): number {
  return Math.max(...layerNodes.map((node) => estimateNodeWidth(node)));
}

function buildFolderNodes(
  view: FileLevelView,
  positionById: Map<string, ReactFlowPosition>
): ReactFlowNode[] {
  const filesByFolder = new Map<string, FileLevelView['fileNodes']>();

  view.fileNodes.forEach((node) => {
    const folderPath = getFolderPath(node.path);
    filesByFolder.set(folderPath, [...(filesByFolder.get(folderPath) ?? []), node]);
  });

  return [...filesByFolder.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([folderPath, folderFiles]) => {
      const bounds = folderFiles.reduce(
        (current, fileNode) => {
          const position = positionById.get(fileNode.id) ?? { x: 0, y: 0 };
          const nextMinX = Math.min(current.minX, position.x);
          const nextMinY = Math.min(current.minY, position.y);
          const nextMaxX = Math.max(current.maxX, position.x + FILE_NODE_WIDTH);
          const nextMaxY = Math.max(current.maxY, position.y + estimateNodeHeight(fileNode));

          return {
            minX: nextMinX,
            minY: nextMinY,
            maxX: nextMaxX,
            maxY: nextMaxY,
          };
        },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        }
      );

      const width = bounds.maxX - bounds.minX + FOLDER_NODE_PADDING * 2;
      const height =
        bounds.maxY - bounds.minY + FOLDER_NODE_PADDING * 2 + FOLDER_NODE_HEADER_HEIGHT;

      return {
        id: `folder:${folderPath}`,
        type: 'folder' as const,
        position: {
          x: bounds.minX - FOLDER_NODE_PADDING,
          y: Math.max(bounds.minY - FOLDER_NODE_HEADER_HEIGHT - FOLDER_NODE_PADDING, 0),
        },
        data: {
          kind: 'folder' as const,
          label: getFolderLabel(folderPath),
          subtitle: folderPath,
          folderPath,
          width,
          height,
        },
      };
    });
}

export function projectToReactFlow(
  view: FileLevelView,
  edgeLayers: FileEdgeLayer[] = [],
  options?: ReactFlowProjectionOptions
): ReactFlowGraph {
  const positionById = buildPositionMap(view, edgeLayers, options);
  const folderNodes = buildFolderNodes(view, positionById);

  const nodes: ReactFlowNode[] = [
    ...folderNodes,
    ...view.fileNodes.map((node) => ({
      id: node.id,
      type: 'file' as const,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
      data: {
        kind: 'file' as const,
        label: node.name,
        subtitle: node.path,
        fileId: node.id,
        folderPath: getFolderPath(node.path),
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
