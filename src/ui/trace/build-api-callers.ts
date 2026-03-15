import type { GoriGraph } from '../../core/types/graph.js';

export type TraceEdgeKind = 'render' | 'use' | 'call' | 'request';

export type ChainNode = {
  symbolId: string;
  name: string;
  filePath: string;
  outgoingEdgeKind: TraceEdgeKind; // 다음 노드로 가는 엣지 종류
};

export type ApiCallerChain = {
  nodes: ChainNode[]; // root(페이지) → API 직접 호출자까지 순서대로
};

export type ApiCallGroup = {
  apiId: string;
  method: string;
  path: string;
  chains: ApiCallerChain[];
};

export function buildApiCallers(graph: GoriGraph): ApiCallGroup[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const runtimeEdges = graph.edges.filter((e) => e.kind !== 'contains');

  // incoming: targetId → [{sourceId, edgeKind}]
  const incomingMap = new Map<string, Array<{ sourceId: string; edgeKind: string }>>();
  for (const edge of runtimeEdges) {
    const list = incomingMap.get(edge.target) ?? [];
    list.push({ sourceId: edge.source, edgeKind: edge.kind });
    incomingMap.set(edge.target, list);
  }

  function getInfo(symbolId: string): { name: string; filePath: string } {
    const node = nodeById.get(symbolId);
    if (node?.kind === 'symbol') {
      const fileNode = nodeById.get(node.fileId);
      return { name: node.name, filePath: fileNode?.kind === 'file' ? fileNode.path : '' };
    }
    return { name: symbolId, filePath: '' };
  }

  // symbolId에서 역방향으로 DFS → root까지의 체인 목록 반환
  // outgoingEdgeKind: symbolId → 다음(자식) 노드로 가는 엣지 종류
  function findPaths(
    symbolId: string,
    outgoingEdgeKind: string,
    visited: Set<string>
  ): ChainNode[][] {
    const { name, filePath } = getInfo(symbolId);
    const thisNode: ChainNode = {
      symbolId,
      name,
      filePath,
      outgoingEdgeKind: outgoingEdgeKind as TraceEdgeKind,
    };

    const incoming = incomingMap.get(symbolId) ?? [];

    // 루트 노드 (들어오는 엣지 없음)
    if (incoming.length === 0) return [[thisNode]];

    const chains: ChainNode[][] = [];
    const newVisited = new Set([...visited, symbolId]);

    for (const { sourceId, edgeKind } of incoming) {
      if (newVisited.has(sourceId)) {
        chains.push([thisNode]); // 순환 → 여기서 끊음
        continue;
      }
      const parentChains = findPaths(sourceId, edgeKind, newVisited);
      for (const parentChain of parentChains) {
        chains.push([...parentChain, thisNode]);
      }
    }

    return chains;
  }

  const apiNodes = graph.nodes.filter((n) => n.kind === 'api');
  const groups: ApiCallGroup[] = [];

  for (const apiNode of apiNodes) {
    if (apiNode.kind !== 'api') continue;

    const directCallers = incomingMap.get(apiNode.id) ?? [];
    const chains: ApiCallerChain[] = [];
    const seenKeys = new Set<string>();

    for (const { sourceId, edgeKind } of directCallers) {
      const paths = findPaths(sourceId, edgeKind, new Set([sourceId]));
      for (const path of paths) {
        const key = path.map((n) => n.symbolId).join('→');
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        chains.push({ nodes: path });
      }
    }

    groups.push({
      apiId: apiNode.id,
      method: apiNode.method,
      path: apiNode.path,
      chains,
    });
  }

  return groups.sort((a, b) => a.path.localeCompare(b.path));
}
