import type { GoriGraph } from '../../core/types/graph.js';

export type TraceEdgeKind = 'render' | 'use' | 'call' | 'request';

export type TraceNode = {
  id: string;
  edgeKind: TraceEdgeKind;
  symbolId: string;
  name: string;
  filePath: string;
  apiMethod?: string;
  apiPath?: string;
  children: TraceNode[];
  isCircular?: boolean;
};

export type TraceRoot = {
  symbolId: string;
  name: string;
  filePath: string;
  children: TraceNode[];
};

export function buildTraceTrees(graph: GoriGraph): TraceRoot[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const runtimeEdges = graph.edges.filter((e) => e.kind !== 'contains');

  // outgoing: sourceId → edges
  const outgoingMap = new Map<string, typeof runtimeEdges>();
  const hasIncoming = new Set<string>();

  for (const edge of runtimeEdges) {
    outgoingMap.set(edge.source, [...(outgoingMap.get(edge.source) ?? []), edge]);
    hasIncoming.add(edge.target);
  }

  // 루트 = source이지만 어떤 엣지의 target도 아닌 심볼
  const allSources = new Set(runtimeEdges.map((e) => e.source));
  const rootIds = [...allSources].filter((id) => !hasIncoming.has(id));

  function makeNode(
    symbolId: string,
    edgeKind: TraceEdgeKind,
    edgeId: string,
    visited: Set<string>
  ): TraceNode {
    const node = nodeById.get(symbolId);
    let name = symbolId;
    let filePath = '';
    let apiMethod: string | undefined;
    let apiPath: string | undefined;

    if (node?.kind === 'symbol') {
      name = node.name;
      const fileNode = nodeById.get(node.fileId);
      if (fileNode?.kind === 'file') filePath = fileNode.path;
    } else if (node?.kind === 'api') {
      apiMethod = node.method;
      apiPath = node.path;
      name = `${node.method} ${node.path}`;
    } else if (node?.kind === 'file') {
      name = node.name;
      filePath = node.path;
    }

    const isCircular = visited.has(symbolId);
    const children: TraceNode[] = [];

    if (!isCircular) {
      const newVisited = new Set([...visited, symbolId]);
      const edges = outgoingMap.get(symbolId) ?? [];
      // 같은 target+kind 중복 제거
      const seen = new Set<string>();
      for (const edge of edges) {
        const key = `${edge.target}:${edge.kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        children.push(makeNode(edge.target, edge.kind as TraceEdgeKind, edge.id, newVisited));
      }
    }

    return {
      id: edgeId,
      edgeKind,
      symbolId,
      name,
      filePath,
      ...(apiMethod !== undefined ? { apiMethod } : {}),
      ...(apiPath !== undefined ? { apiPath } : {}),
      children,
      ...(isCircular ? { isCircular: true } : {}),
    };
  }

  const roots: TraceRoot[] = [];

  for (const rootId of rootIds) {
    const node = nodeById.get(rootId);
    if (!node || node.kind !== 'symbol') continue;

    const fileNode = nodeById.get(node.fileId);
    const filePath = fileNode?.kind === 'file' ? fileNode.path : '';

    const visited = new Set([rootId]);
    const edges = outgoingMap.get(rootId) ?? [];
    const seen = new Set<string>();
    const children: TraceNode[] = [];

    for (const edge of edges) {
      const key = `${edge.target}:${edge.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      children.push(makeNode(edge.target, edge.kind as TraceEdgeKind, edge.id, visited));
    }

    roots.push({ symbolId: rootId, name: node.name, filePath, children });
  }

  return roots;
}
