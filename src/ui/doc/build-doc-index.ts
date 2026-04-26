import type { FlowmapGraph, RequestOutcome, SymbolNode } from '../../core/types/graph.js';

export type DocRef = {
  symbolId: string;
  name: string;
  filePath: string;
};

export type ApiRef = {
  apiId: string;
  method: string;
  path: string;
  viaChain: DocRef[]; // 중간 경로 (비어있으면 직접 호출)
  requestCount?: number;
  lastStatus?: number;
  lastDurationMs?: number;
  lastOutcome?: RequestOutcome;
  lastErrorName?: string;
  lastErrorMessage?: string;
};

export type DocEntry = {
  symbolId: string;
  name: string;
  filePath: string;
  category: 'page' | 'component' | 'hook' | 'function';
  executionKind?: 'static' | 'live';
  ownershipKind?: 'LIVE' | 'STATIC-DOM' | 'STATIC-DECLARED';
  graphNodeKind?: 'route' | 'component';
  role?: 'layout' | 'page' | 'loading' | 'error' | 'not-found' | 'template' | 'component';
  source?: 'runtime' | 'route' | 'static-import';
  renders: DocRef[];
  renderedBy: DocRef[];
  uses: DocRef[];
  usedBy: DocRef[];
  apiCalls: ApiRef[];
};

export type ApiDocEntry = {
  apiId: string;
  method: string;
  path: string;
  callerChains: DocRef[][]; // 각 체인 = root → 직접 호출자
  requestCount?: number;
  lastStatus?: number;
  lastDurationMs?: number;
  lastOutcome?: RequestOutcome;
  lastErrorName?: string;
  lastErrorMessage?: string;
};

export type DocIndex = {
  pages: DocEntry[];
  components: DocEntry[];
  hooks: DocEntry[];
  apis: ApiDocEntry[];
};

export function buildDocIndex(graph: FlowmapGraph): DocIndex {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const runtimeEdges = graph.edges.filter((e) => e.kind !== 'contains');

  const outgoing = new Map<string, typeof runtimeEdges>();
  const incoming = new Map<string, typeof runtimeEdges>();
  for (const edge of runtimeEdges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }

  function toRef(symbolId: string): DocRef | null {
    const node = nodeById.get(symbolId);
    if (!node || node.kind !== 'symbol') return null;
    const file = nodeById.get(node.fileId);
    return { symbolId, name: node.name, filePath: file?.kind === 'file' ? file.path : '' };
  }

  // 특정 심볼에서 도달 가능한 API 호출을 forward DFS로 탐색
  // chain: 현재 심볼까지 오는 데 거친 중간 노드들
  function findApiCalls(
    symbolId: string,
    chain: DocRef[],
    visited: Set<string>
  ): ApiRef[] {
    if (visited.has(symbolId)) return [];
    const newVisited = new Set([...visited, symbolId]);
    const results: ApiRef[] = [];

    for (const edge of outgoing.get(symbolId) ?? []) {
      if (edge.kind === 'request') {
        const api = nodeById.get(edge.target);
        if (api?.kind === 'api') {
          results.push({
            apiId: api.id,
            method: api.method,
            path: api.path,
            viaChain: chain,
            ...(api.requestCount !== undefined ? { requestCount: api.requestCount } : {}),
            ...(api.lastStatus !== undefined ? { lastStatus: api.lastStatus } : {}),
            ...(api.lastDurationMs !== undefined ? { lastDurationMs: api.lastDurationMs } : {}),
            ...(api.lastOutcome !== undefined ? { lastOutcome: api.lastOutcome } : {}),
            ...(api.lastErrorName !== undefined ? { lastErrorName: api.lastErrorName } : {}),
            ...(api.lastErrorMessage !== undefined ? { lastErrorMessage: api.lastErrorMessage } : {}),
          });
        }
      } else {
        const ref = toRef(edge.target);
        const childChain = ref ? [...chain, ref] : chain;
        results.push(...findApiCalls(edge.target, childChain, newVisited));
      }
    }
    return results;
  }

  // API 노드를 역방향으로 추적해 root까지의 체인 반환
  function traceBack(symbolId: string, visited: Set<string>): DocRef[][] {
    const ref = toRef(symbolId);
    if (!ref) return [];
    const inc = incoming.get(symbolId) ?? [];
    if (inc.length === 0) return [[ref]];
    const newVisited = new Set([...visited, symbolId]);
    const chains: DocRef[][] = [];
    for (const e of inc) {
      if (newVisited.has(e.source)) { chains.push([ref]); continue; }
      for (const parent of traceBack(e.source, newVisited)) {
        chains.push([...parent, ref]);
      }
    }
    return chains;
  }

  // 카테고리 분류
  const hasIncomingRender = new Set(
    runtimeEdges.filter((e) => e.kind === 'render').map((e) => e.target)
  );
  const hasOutgoingRender = new Set(
    runtimeEdges.filter((e) => e.kind === 'render').map((e) => e.source)
  );
  const isHookTarget = new Set(
    runtimeEdges.filter((e) => e.kind === 'use').map((e) => e.target)
  );

  function categorize(id: string): DocEntry['category'] {
    if (hasIncomingRender.has(id) || hasOutgoingRender.has(id)) return 'component';
    if (isHookTarget.has(id)) return 'hook';
    return 'function';
  }

  const symbolNodes = graph.nodes.filter((n): n is SymbolNode => n.kind === 'symbol');

  const allEntries: DocEntry[] = symbolNodes.map((sym) => {
    const file = nodeById.get(sym.fileId);
    const filePath = file?.kind === 'file' ? file.path : '';
    const out = outgoing.get(sym.id) ?? [];
    const inc = incoming.get(sym.id) ?? [];

    // API 호출: 중복 제거 (apiId 기준 첫 번째만)
    const rawApiCalls = findApiCalls(sym.id, [], new Set([sym.id]));
    const apiCallMap = new Map<string, ApiRef>();
    for (const a of rawApiCalls) {
      if (!apiCallMap.has(a.apiId)) apiCallMap.set(a.apiId, a);
    }

    return {
      symbolId: sym.id,
      name: sym.name,
      filePath,
      category: categorize(sym.id),
      executionKind: 'live',
      ownershipKind: 'LIVE',
      graphNodeKind: 'component',
      role: 'component',
      source: 'runtime',
      renders: out.filter((e) => e.kind === 'render').map((e) => toRef(e.target)).filter(Boolean) as DocRef[],
      renderedBy: inc.filter((e) => e.kind === 'render').map((e) => toRef(e.source)).filter(Boolean) as DocRef[],
      uses: out.filter((e) => e.kind === 'use').map((e) => toRef(e.target)).filter(Boolean) as DocRef[],
      usedBy: inc.filter((e) => e.kind === 'use').map((e) => toRef(e.source)).filter(Boolean) as DocRef[],
      apiCalls: [...apiCallMap.values()],
    };
  });

  // API 엔드포인트 역추적
  const apis: ApiDocEntry[] = graph.nodes
    .filter((n) => n.kind === 'api')
    .map((n) => {
      if (n.kind !== 'api') return null;
      const directCallers = incoming.get(n.id) ?? [];
      const chains: DocRef[][] = [];
      const seen = new Set<string>();
      for (const { source } of directCallers) {
        for (const chain of traceBack(source, new Set([source]))) {
          const key = chain.map((r) => r.symbolId).join('>');
          if (!seen.has(key)) { seen.add(key); chains.push(chain); }
        }
      }
      return {
        apiId: n.id,
        method: n.method,
        path: n.path,
        callerChains: chains,
        ...(n.requestCount !== undefined ? { requestCount: n.requestCount } : {}),
        ...(n.lastStatus !== undefined ? { lastStatus: n.lastStatus } : {}),
        ...(n.lastDurationMs !== undefined ? { lastDurationMs: n.lastDurationMs } : {}),
        ...(n.lastOutcome !== undefined ? { lastOutcome: n.lastOutcome } : {}),
        ...(n.lastErrorName !== undefined ? { lastErrorName: n.lastErrorName } : {}),
        ...(n.lastErrorMessage !== undefined ? { lastErrorMessage: n.lastErrorMessage } : {}),
      };
    })
    .filter(Boolean) as ApiDocEntry[];

  return {
    pages: allEntries.filter((e) => e.category === 'page'),
    components: allEntries.filter((e) => e.category === 'component'),
    hooks: allEntries.filter((e) => e.category === 'hook'),
    apis,
  };
}
