import type { FileEdgeLayer, FileLevelView } from '../../core/types/projection.js';
import type { ExportRef } from '../../core/types/static-metadata.js';

export type ReactFlowPosition = {
  x: number;
  y: number;
};

export type FolderFileEntry = {
  fileId: string;
  name: string;    // relative path within the folder card key (e.g. "feed/use-feed.ts")
  exportCount: number;
  depCount: number;
  symbolIds: string[];
};

export type ReactFlowNodeData = {
  kind: 'file' | 'api' | 'folder' | 'folder-card';
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
  depCount?: number;
  method?: string;
  apiEndpoints?: Array<{ method: string; path: string }>;
  folderFiles?: FolderFileEntry[];
  width?: number;
  height?: number;
  isAncestor?: boolean;
  fsdLayer?: number;
};

export type ReactFlowNode = {
  id: string;
  type: 'file' | 'api' | 'folder' | 'folder-card';
  position: ReactFlowPosition;
  data: ReactFlowNodeData;
};

export type ReactFlowEdgeData = {
  relationTypes: string[];
  supportingEdges: string[];
  isViolation?: boolean;
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
  viewMode?: 'folder' | 'arch-health' | 'api-flow';
};

// ─── FSD 레이어 순서 ──────────────────────────────────────────────────────────
// pages(0) → widgets(1) → features(2) → entities(3) → shared/lib/ui(4) → api(5)
// source 레이어 > target 레이어이면 위반 (아래 레이어가 위 레이어를 참조)
const FSD_LAYER_ORDER: Record<string, number> = {
  pages: 0, widgets: 1, features: 2, entities: 3,
  shared: 4, lib: 4, ui: 4, api: 5,
};

const FSD_LAYER_ACCENT: Record<number, { bg: string; border: string; color: string }> = {
  0: { bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7' },  // pages  — sky
  1: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },  // widgets — green
  2: { bg: '#fefce8', border: '#fde68a', color: '#b45309' },  // features — amber
  3: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },  // entities — orange
  4: { bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },  // shared   — violet
  5: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },  // api      — blue
};

function getFsdLayer(folderCardKey: string): number | undefined {
  const label = getFolderLabel(folderCardKey);
  return FSD_LAYER_ORDER[label];
}

const DEFAULT_COLUMN_GAP = 160;
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

// Extra vertical gap inserted between file nodes that belong to different folder groups.
// This prevents folder background rectangles from visually overlapping.
const INTER_FOLDER_EXTRA_GAP = FOLDER_NODE_PADDING * 2 + FOLDER_NODE_HEADER_HEIGHT;

function nodeFolderGroup(node: FileLevelView['fileNodes'][number] | FileLevelView['apiNodes'][number]): string {
  if (node.kind === 'api') return '\uffff__api__'; // sort api nodes last
  return getFolderPath(node.path);
}

function computeFolderBarycenter(
  nodes: Array<FileLevelView['fileNodes'][number] | FileLevelView['apiNodes'][number]>,
  neighborPositions: Map<string, number>,
  allFileEdges: Array<{ sourceFileId: string; targetFileId: string }>
): number | null {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const ys: number[] = [];

  for (const edge of allFileEdges) {
    if (nodeIds.has(edge.sourceFileId)) {
      const y = neighborPositions.get(edge.targetFileId);
      if (y !== undefined) ys.push(y);
    }
    if (nodeIds.has(edge.targetFileId)) {
      const y = neighborPositions.get(edge.sourceFileId);
      if (y !== undefined) ys.push(y);
    }
  }

  if (ys.length === 0) return null;
  return ys.reduce((a, b) => a + b, 0) / ys.length;
}

function buildPositionMap(
  view: FileLevelView,
  edgeLayers: FileEdgeLayer[],
  options?: ReactFlowProjectionOptions
): Map<string, ReactFlowPosition> {
  const columnGap = options?.columnGap ?? DEFAULT_COLUMN_GAP;
  const rowGap = options?.rowGap ?? DEFAULT_ROW_GAP;
  const layerByNodeId = assignLayerMap(view, edgeLayers);

  const allFileEdges = edgeLayers.flatMap((layer) => layer.edges);

  const nodes = [...view.fileNodes, ...view.apiNodes];
  const groupedByLayer = new Map<number, typeof nodes>();

  nodes.forEach((node) => {
    const layer = layerByNodeId.get(node.id) ?? 0;
    groupedByLayer.set(layer, [...(groupedByLayer.get(layer) ?? []), node]);
  });

  const positionById = new Map<string, ReactFlowPosition>();
  let currentX = 0;
  let prevLayerCenterY = new Map<string, number>();

  [...groupedByLayer.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([, layerNodes]) => {
      // Group by folder
      const folderGroups = new Map<string, typeof layerNodes>();
      layerNodes.forEach((node) => {
        const folder = nodeFolderGroup(node);
        folderGroups.set(folder, [...(folderGroups.get(folder) ?? []), node]);
      });

      // Sort folder groups by barycentric score, fall back to folder name
      const sortedGroups = [...folderGroups.entries()].sort(([folderA, nodesA], [folderB, nodesB]) => {
        const scoreA = computeFolderBarycenter(nodesA, prevLayerCenterY, allFileEdges);
        const scoreB = computeFolderBarycenter(nodesB, prevLayerCenterY, allFileEdges);
        if (scoreA === null && scoreB === null) return folderA.localeCompare(folderB);
        if (scoreA === null) return 1;
        if (scoreB === null) return -1;
        return scoreA - scoreB;
      });

      let currentY = INITIAL_LAYER_TOP;
      let prevFolder: string | undefined;
      const layerCenterY = new Map<string, number>();

      sortedGroups.forEach(([folder, groupNodes]) => {
        if (prevFolder !== undefined && folder !== prevFolder) {
          currentY += INTER_FOLDER_EXTRA_GAP;
        }
        prevFolder = folder;

        groupNodes.sort((a, b) => a.id.localeCompare(b.id));

        groupNodes.forEach((node) => {
          positionById.set(node.id, { x: currentX, y: currentY });
          layerCenterY.set(node.id, currentY + estimateNodeHeight(node) / 2);
          currentY += estimateNodeHeight(node) + rowGap;
        });
      });

      prevLayerCenterY = layerCenterY;
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

function getCommonRoot(folderPaths: string[]): string {
  if (folderPaths.length === 0) return '';
  const split = folderPaths.map((p) => p.split('/'));
  const first = split[0] ?? [];
  let depth = 0;
  while (first[depth] !== undefined && split.every((p) => p[depth] === first[depth])) {
    depth++;
  }
  return first.slice(0, depth).join('/');
}

const ANCESTOR_EXTRA_PADDING = 20;

function buildFolderNodes(
  view: FileLevelView,
  positionById: Map<string, ReactFlowPosition>
): ReactFlowNode[] {
  const filesByFolder = new Map<string, FileLevelView['fileNodes']>();

  view.fileNodes.forEach((node) => {
    const folderPath = getFolderPath(node.path);
    filesByFolder.set(folderPath, [...(filesByFolder.get(folderPath) ?? []), node]);
  });

  type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

  const immediateBoundsMap = new Map<string, Bounds>();

  const immediateNodes: ReactFlowNode[] = [...filesByFolder.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([folderPath, folderFiles]) => {
      const bounds = folderFiles.reduce(
        (current, fileNode) => {
          const position = positionById.get(fileNode.id) ?? { x: 0, y: 0 };
          return {
            minX: Math.min(current.minX, position.x),
            minY: Math.min(current.minY, position.y),
            maxX: Math.max(current.maxX, position.x + FILE_NODE_WIDTH),
            maxY: Math.max(current.maxY, position.y + estimateNodeHeight(fileNode)),
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
      const position = {
        x: bounds.minX - FOLDER_NODE_PADDING,
        y: Math.max(bounds.minY - FOLDER_NODE_HEADER_HEIGHT - FOLDER_NODE_PADDING, 0),
      };

      immediateBoundsMap.set(folderPath, {
        minX: position.x,
        minY: position.y,
        maxX: position.x + width,
        maxY: position.y + height,
      });

      return {
        id: `folder:${folderPath}`,
        type: 'folder' as const,
        position,
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

  // Build ancestor folder boxes one level above immediate folders when depth > 1.
  // Key by ancestorPath + column (minX) so ancestors spanning different columns are NOT merged.
  const commonRoot = getCommonRoot([...filesByFolder.keys()]);
  const rootDepth = commonRoot ? commonRoot.split('/').length : 0;

  type AncestorEntry = Bounds & { ancestorPath: string };
  const ancestorBounds = new Map<string, AncestorEntry>();

  for (const [folderPath, b] of immediateBoundsMap) {
    const segments = folderPath.split('/');
    if (segments.length - rootDepth < 2) continue;
    const ancestorPath = segments.slice(0, rootDepth + 1).join('/');
    // Include column (rounded minX) in key so cross-column folders stay separate
    const key = `${ancestorPath}:${Math.round(b.minX)}`;
    const existing = ancestorBounds.get(key);
    ancestorBounds.set(key, {
      minX: Math.min(existing?.minX ?? Infinity, b.minX),
      minY: Math.min(existing?.minY ?? Infinity, b.minY),
      maxX: Math.max(existing?.maxX ?? -Infinity, b.maxX),
      maxY: Math.max(existing?.maxY ?? -Infinity, b.maxY),
      ancestorPath,
    });
  }

  const ANCESTOR_H_PAD = 4;  // horizontal: just enough to visually wrap
  const ANCESTOR_V_PAD = ANCESTOR_EXTRA_PADDING; // vertical: space for label
  const ancestorNodes: ReactFlowNode[] = [...ancestorBounds.values()].map((entry) => ({
    id: `folder:${entry.ancestorPath}:${Math.round(entry.minX)}`,
    type: 'folder' as const,
    position: { x: entry.minX - ANCESTOR_H_PAD, y: entry.minY - ANCESTOR_V_PAD },
    data: {
      kind: 'folder' as const,
      label: getFolderLabel(entry.ancestorPath),
      subtitle: entry.ancestorPath,
      folderPath: entry.ancestorPath,
      width: entry.maxX - entry.minX + ANCESTOR_H_PAD * 2,
      height: entry.maxY - entry.minY + ANCESTOR_V_PAD * 2,
      isAncestor: true,
    },
  }));

  return [...ancestorNodes, ...immediateNodes];
}

export { FSD_LAYER_ACCENT };

// ─── Folder-card view constants ───────────────────────────────────────────────
const FOLDER_CARD_HEADER_HEIGHT = 36;
const FOLDER_CARD_ROW_HEIGHT = 26;
const FOLDER_CARD_BOTTOM_PAD = 8;
const FOLDER_CARD_WIDTH = 260;

function estimateFolderCardHeight(fileCount: number): number {
  return FOLDER_CARD_HEADER_HEIGHT + fileCount * FOLDER_CARD_ROW_HEIGHT + FOLDER_CARD_BOTTOM_PAD;
}

/**
 * Returns the folder card grouping key for a file.
 * Files nested 2+ levels below the common root are grouped at root+1 (the FSD layer folder).
 * Files at root+1 depth use their immediate folder.
 */
function getFolderCardKey(filePath: string, commonRoot: string): string {
  const rootDepth = commonRoot ? commonRoot.split('/').length : 0;
  const folder = getFolderPath(filePath);
  const segments = folder.split('/');
  if (segments.length - rootDepth >= 2) {
    return segments.slice(0, rootDepth + 1).join('/');
  }
  return folder;
}

function projectToReactFlowFolderView(
  view: FileLevelView,
  edgeLayers: FileEdgeLayer[],
  options?: ReactFlowProjectionOptions
): ReactFlowGraph {
  const columnGap = options?.columnGap ?? DEFAULT_COLUMN_GAP;
  const rowGap = options?.rowGap ?? DEFAULT_ROW_GAP;

  // Compute common root across all file paths
  const commonRoot = getCommonRoot(view.fileNodes.map((n) => getFolderPath(n.path)));

  // Group files by folder-card key (FSD layer level)
  const filesByCard = new Map<string, FileLevelView['fileNodes']>();
  view.fileNodes.forEach((node) => {
    const key = getFolderCardKey(node.path, commonRoot);
    filesByCard.set(key, [...(filesByCard.get(key) ?? []), node]);
  });

  // Dep counts
  const depCountById = new Map<string, number>();
  view.fileEdges.forEach((edge) => {
    depCountById.set(edge.sourceFileId, (depCountById.get(edge.sourceFileId) ?? 0) + 1);
  });

  // Layer assignment via file edges
  const layerByFileId = assignLayerMap(view, edgeLayers);

  // Each folder card → min layer of its files
  const layerByCard = new Map<string, number>();
  filesByCard.forEach((files, cardKey) => {
    const layers = files.map((f) => layerByFileId.get(f.id) ?? 0);
    layerByCard.set(cardKey, Math.min(...layers));
  });

  // Group cards by layer
  const cardsByLayer = new Map<number, string[]>();
  layerByCard.forEach((layer, cardKey) => {
    cardsByLayer.set(layer, [...(cardsByLayer.get(layer) ?? []), cardKey]);
  });

  // API nodes → max file layer + 1
  const maxFileLayer = Math.max(0, ...[...layerByCard.values()]);
  const apiLayer = maxFileLayer + 1;

  // Compute positions
  const positionById = new Map<string, ReactFlowPosition>();
  const allLayers = new Set([...cardsByLayer.keys(), ...(view.apiNodes.length > 0 ? [apiLayer] : [])]);
  let currentX = 0;

  [...allLayers].sort((a, b) => a - b).forEach((layer) => {
    let currentY = INITIAL_LAYER_TOP;
    const cards = [...(cardsByLayer.get(layer) ?? [])].sort();

    cards.forEach((cardKey) => {
      positionById.set(`folder-card:${cardKey}`, { x: currentX, y: currentY });
      const files = filesByCard.get(cardKey) ?? [];
      currentY += estimateFolderCardHeight(files.length) + rowGap;
    });

    if (layer === apiLayer) {
      view.apiNodes.forEach((node) => {
        positionById.set(node.id, { x: currentX, y: currentY });
        currentY += API_NODE_HEIGHT + rowGap;
      });
    }

    currentX += FOLDER_CARD_WIDTH + columnGap;
  });

  // Build folder-card nodes
  const folderCardNodes: ReactFlowNode[] = [...filesByCard.entries()].map(([cardKey, files]) => ({
    id: `folder-card:${cardKey}`,
    type: 'folder-card' as const,
    position: positionById.get(`folder-card:${cardKey}`) ?? { x: 0, y: 0 },
    data: {
      kind: 'folder-card' as const,
      label: getFolderLabel(cardKey),
      subtitle: cardKey,
      folderPath: cardKey,
      symbolIds: files.flatMap((f) => f.exports.map((e) => e.symbolId)),
      folderFiles: files.map((f) => ({
        fileId: f.id,
        name: f.path.startsWith(cardKey + '/') ? f.path.slice(cardKey.length + 1) : f.name,
        exportCount: f.exports.length,
        depCount: depCountById.get(f.id) ?? 0,
        symbolIds: f.exports.map((e) => e.symbolId),
      })),
    },
  }));

  // API nodes (canvas will merge into collection)
  const apiNodes: ReactFlowNode[] = view.apiNodes.map((node) => ({
    id: node.id,
    type: 'api' as const,
    position: positionById.get(node.id) ?? { x: 0, y: 0 },
    data: { kind: 'api' as const, label: node.label, subtitle: node.path, method: node.method },
  }));

  // Remap edges: file→file to folderCard→folderCard, skip self-loops, deduplicate
  const fileFolderMap = new Map<string, string>();
  view.fileNodes.forEach((n) => {
    fileFolderMap.set(n.id, `folder-card:${getFolderCardKey(n.path, commonRoot)}`);
  });

  const edgeByKey = new Map<string, ReactFlowEdge>();
  view.fileEdges.forEach((edge) => {
    const sourceId = fileFolderMap.get(edge.sourceFileId) ?? edge.sourceFileId;
    const targetId = fileFolderMap.get(edge.targetFileId) ?? edge.targetFileId;
    if (sourceId === targetId) return;

    const key = `${sourceId}->${targetId}`;
    const existing = edgeByKey.get(key);
    edgeByKey.set(key, {
      id: existing?.id ?? key,
      source: sourceId,
      target: targetId,
      type: 'fileRelation',
      label: existing
        ? [...new Set([...existing.label.split(', '), ...edge.relationTypes])].join(', ')
        : edge.relationTypes.join(', '),
      data: {
        relationTypes: existing
          ? [...new Set([...existing.data.relationTypes, ...edge.relationTypes])]
          : edge.relationTypes,
        supportingEdges: existing
          ? [...new Set([...existing.data.supportingEdges, ...edge.supportingEdges])]
          : edge.supportingEdges,
      },
    });
  });

  return { nodes: [...folderCardNodes, ...apiNodes], edges: [...edgeByKey.values()] };
}

// ─── Architecture Health View ────────────────────────────────────────────────
// 폴더 카드 뷰와 동일하지만 컬럼 순서를 FSD 레이어 순서로 고정하고
// 레이어 위반 엣지(상위 레이어 → 하위 레이어)를 isViolation 플래그로 표시합니다.
function projectToReactFlowArchHealth(
  view: FileLevelView,
  _edgeLayers: FileEdgeLayer[],
  options?: ReactFlowProjectionOptions
): ReactFlowGraph {
  const columnGap = options?.columnGap ?? DEFAULT_COLUMN_GAP;
  const rowGap = options?.rowGap ?? DEFAULT_ROW_GAP;

  const commonRoot = getCommonRoot(view.fileNodes.map((n) => getFolderPath(n.path)));

  // 파일 → 폴더 카드 키 매핑
  const filesByCard = new Map<string, FileLevelView['fileNodes']>();
  view.fileNodes.forEach((node) => {
    const key = getFolderCardKey(node.path, commonRoot);
    filesByCard.set(key, [...(filesByCard.get(key) ?? []), node]);
  });

  const depCountById = new Map<string, number>();
  view.fileEdges.forEach((edge) => {
    depCountById.set(edge.sourceFileId, (depCountById.get(edge.sourceFileId) ?? 0) + 1);
  });

  // FSD 레이어 기준으로 카드 그룹화 (레이어 미지정 카드는 999로)
  const cardsByFsdLayer = new Map<number, string[]>();
  filesByCard.forEach((_, cardKey) => {
    const layer = getFsdLayer(cardKey) ?? 999;
    cardsByFsdLayer.set(layer, [...(cardsByFsdLayer.get(layer) ?? []), cardKey]);
  });

  const hasApi = view.apiNodes.length > 0;
  const apiColumn = hasApi
    ? Math.max(5, ...[...cardsByFsdLayer.keys()]) + (cardsByFsdLayer.has(5) ? 0 : 0)
    : -1;
  // API 노드는 마지막 열(FSD api = 5 또는 그보다 큰 열)에 배치
  const allFsdLayers = [
    ...[...cardsByFsdLayer.keys()].sort((a, b) => a - b),
    ...(hasApi && !cardsByFsdLayer.has(5) ? [5] : []),
  ].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

  // 위치 계산
  const positionById = new Map<string, ReactFlowPosition>();
  let currentX = 0;

  allFsdLayers.forEach((fsdLayer) => {
    let currentY = INITIAL_LAYER_TOP;
    const cards = [...(cardsByFsdLayer.get(fsdLayer) ?? [])].sort();

    cards.forEach((cardKey) => {
      positionById.set(`folder-card:${cardKey}`, { x: currentX, y: currentY });
      currentY += estimateFolderCardHeight((filesByCard.get(cardKey) ?? []).length) + rowGap;
    });

    if (hasApi && fsdLayer === (cardsByFsdLayer.has(5) ? 5 : Math.max(...allFsdLayers))) {
      view.apiNodes.forEach((node) => {
        positionById.set(node.id, { x: currentX, y: currentY });
        currentY += API_NODE_HEIGHT + rowGap;
      });
    }

    currentX += FOLDER_CARD_WIDTH + columnGap;
  });
  void apiColumn;

  // 카드 ID → FSD 레이어 매핑 (위반 판정용)
  const cardFsdLayerMap = new Map<string, number>();
  filesByCard.forEach((_, cardKey) => {
    const layer = getFsdLayer(cardKey);
    if (layer !== undefined) cardFsdLayerMap.set(`folder-card:${cardKey}`, layer);
  });

  // 폴더 카드 노드
  const folderCardNodes: ReactFlowNode[] = [...filesByCard.entries()].map(([cardKey, files]) => ({
    id: `folder-card:${cardKey}`,
    type: 'folder-card' as const,
    position: positionById.get(`folder-card:${cardKey}`) ?? { x: 0, y: 0 },
    data: {
      kind: 'folder-card' as const,
      label: getFolderLabel(cardKey),
      subtitle: cardKey,
      folderPath: cardKey,
      ...(getFsdLayer(cardKey) !== undefined ? { fsdLayer: getFsdLayer(cardKey) as number } : {}),
      symbolIds: files.flatMap((f) => f.exports.map((e) => e.symbolId)),
      folderFiles: files.map((f) => ({
        fileId: f.id,
        name: f.path.startsWith(cardKey + '/') ? f.path.slice(cardKey.length + 1) : f.name,
        exportCount: f.exports.length,
        depCount: depCountById.get(f.id) ?? 0,
        symbolIds: f.exports.map((e) => e.symbolId),
      })),
    },
  }));

  const apiNodes: ReactFlowNode[] = view.apiNodes.map((node) => ({
    id: node.id,
    type: 'api' as const,
    position: positionById.get(node.id) ?? { x: 0, y: 0 },
    data: { kind: 'api' as const, label: node.label, subtitle: node.path, method: node.method },
  }));

  // 엣지 빌드 + 위반 감지
  const fileFolderMap = new Map<string, string>();
  view.fileNodes.forEach((n) => {
    fileFolderMap.set(n.id, `folder-card:${getFolderCardKey(n.path, commonRoot)}`);
  });

  const edgeByKey = new Map<string, ReactFlowEdge>();
  view.fileEdges.forEach((edge) => {
    const sourceId = fileFolderMap.get(edge.sourceFileId) ?? edge.sourceFileId;
    const targetId = fileFolderMap.get(edge.targetFileId) ?? edge.targetFileId;
    if (sourceId === targetId) return;

    const srcLayer = cardFsdLayerMap.get(sourceId);
    const tgtLayer = cardFsdLayerMap.get(targetId);
    // 낮은 레이어 번호(=상위 계층)가 높은 레이어 번호를 참조하는 건 정상
    // 높은 레이어 번호가 낮은 레이어 번호를 참조하면 위반
    const isViolation = srcLayer !== undefined && tgtLayer !== undefined && srcLayer > tgtLayer;

    const key = `${sourceId}->${targetId}`;
    const existing = edgeByKey.get(key);
    edgeByKey.set(key, {
      id: existing?.id ?? key,
      source: sourceId,
      target: targetId,
      type: 'fileRelation',
      label: existing
        ? [...new Set([...existing.label.split(', '), ...edge.relationTypes])].join(', ')
        : edge.relationTypes.join(', '),
      data: {
        relationTypes: existing
          ? [...new Set([...existing.data.relationTypes, ...edge.relationTypes])]
          : edge.relationTypes,
        supportingEdges: existing
          ? [...new Set([...existing.data.supportingEdges, ...edge.supportingEdges])]
          : edge.supportingEdges,
        isViolation: (existing?.data.isViolation ?? false) || isViolation,
      },
    });
  });

  return { nodes: [...folderCardNodes, ...apiNodes], edges: [...edgeByKey.values()] };
}

// ─── API Flow View ────────────────────────────────────────────────────────────
// request 관계만 추려서 "누가 어떤 API를 호출하는가"를 보여줍니다.
// 왼쪽: request를 발생시키는 폴더 카드, 오른쪽: API 컬렉션
function projectToReactFlowApiFlow(
  view: FileLevelView,
  options?: ReactFlowProjectionOptions
): ReactFlowGraph {
  const columnGap = options?.columnGap ?? DEFAULT_COLUMN_GAP;
  const rowGap = options?.rowGap ?? DEFAULT_ROW_GAP;

  // request 엣지만 필터
  const requestEdges = view.fileEdges.filter((e) => e.relationTypes.includes('request'));

  if (requestEdges.length === 0 && view.apiNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const commonRoot = getCommonRoot(view.fileNodes.map((n) => getFolderPath(n.path)));

  // request를 보내는 파일만 포함
  const callerFileIds = new Set(requestEdges.map((e) => e.sourceFileId));
  const callerFiles = view.fileNodes.filter((n) => callerFileIds.has(n.id));

  // 폴더 카드 그룹화
  const filesByCard = new Map<string, FileLevelView['fileNodes']>();
  callerFiles.forEach((node) => {
    const key = getFolderCardKey(node.path, commonRoot);
    filesByCard.set(key, [...(filesByCard.get(key) ?? []), node]);
  });

  // 위치: 왼쪽(호출자) | 오른쪽(API)
  const positionById = new Map<string, ReactFlowPosition>();
  let currentY = INITIAL_LAYER_TOP;

  [...filesByCard.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([cardKey, files]) => {
    positionById.set(`folder-card:${cardKey}`, { x: 0, y: currentY });
    currentY += estimateFolderCardHeight(files.length) + rowGap;
  });

  const apiX = FOLDER_CARD_WIDTH + columnGap;
  currentY = INITIAL_LAYER_TOP;
  view.apiNodes.forEach((node) => {
    positionById.set(node.id, { x: apiX, y: currentY });
    currentY += API_NODE_HEIGHT + rowGap;
  });

  const depCountById = new Map<string, number>();
  requestEdges.forEach((edge) => {
    depCountById.set(edge.sourceFileId, (depCountById.get(edge.sourceFileId) ?? 0) + 1);
  });

  const folderCardNodes: ReactFlowNode[] = [...filesByCard.entries()].map(([cardKey, files]) => ({
    id: `folder-card:${cardKey}`,
    type: 'folder-card' as const,
    position: positionById.get(`folder-card:${cardKey}`) ?? { x: 0, y: 0 },
    data: {
      kind: 'folder-card' as const,
      label: getFolderLabel(cardKey),
      subtitle: cardKey,
      folderPath: cardKey,
      ...(getFsdLayer(cardKey) !== undefined ? { fsdLayer: getFsdLayer(cardKey) as number } : {}),
      symbolIds: files.flatMap((f) => f.exports.map((e) => e.symbolId)),
      folderFiles: files.map((f) => ({
        fileId: f.id,
        name: f.path.startsWith(cardKey + '/') ? f.path.slice(cardKey.length + 1) : f.name,
        exportCount: f.exports.length,
        depCount: depCountById.get(f.id) ?? 0,
        symbolIds: f.exports.map((e) => e.symbolId),
      })),
    },
  }));

  const apiNodes: ReactFlowNode[] = view.apiNodes.map((node) => ({
    id: node.id,
    type: 'api' as const,
    position: positionById.get(node.id) ?? { x: 0, y: 0 },
    data: { kind: 'api' as const, label: node.label, subtitle: node.path, method: node.method },
  }));

  // 엣지: 폴더 카드 → API 노드, 중복 제거
  const fileFolderMap = new Map<string, string>();
  callerFiles.forEach((n) => {
    fileFolderMap.set(n.id, `folder-card:${getFolderCardKey(n.path, commonRoot)}`);
  });

  const edgeByKey = new Map<string, ReactFlowEdge>();
  requestEdges.forEach((edge) => {
    const sourceId = fileFolderMap.get(edge.sourceFileId) ?? edge.sourceFileId;
    const targetId = edge.targetFileId; // API node id
    if (sourceId === targetId) return;

    const key = `${sourceId}->${targetId}`;
    const existing = edgeByKey.get(key);
    edgeByKey.set(key, {
      id: existing?.id ?? key,
      source: sourceId,
      target: targetId,
      type: 'fileRelation',
      label: 'request',
      data: {
        relationTypes: ['request'],
        supportingEdges: existing
          ? [...new Set([...existing.data.supportingEdges, ...edge.supportingEdges])]
          : edge.supportingEdges,
      },
    });
  });

  return { nodes: [...folderCardNodes, ...apiNodes], edges: [...edgeByKey.values()] };
}

export function projectToReactFlow(
  view: FileLevelView,
  edgeLayers: FileEdgeLayer[] = [],
  options?: ReactFlowProjectionOptions
): ReactFlowGraph {
  if (options?.viewMode === 'arch-health') {
    return projectToReactFlowArchHealth(view, edgeLayers, options);
  }
  if (options?.viewMode === 'api-flow') {
    return projectToReactFlowApiFlow(view, options);
  }
  if (options?.viewMode === 'folder') {
    return projectToReactFlowFolderView(view, edgeLayers, options);
  }

  const positionById = buildPositionMap(view, edgeLayers, options);
  const folderNodes = buildFolderNodes(view, positionById);

  // Count outgoing file dependencies per node (how many files this node imports from)
  const depCountById = new Map<string, number>();
  view.fileEdges.forEach((edge) => {
    depCountById.set(edge.sourceFileId, (depCountById.get(edge.sourceFileId) ?? 0) + 1);
  });

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
        depCount: depCountById.get(node.id) ?? 0,
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
        method: node.method,
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
