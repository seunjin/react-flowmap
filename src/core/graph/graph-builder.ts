import { createApiId } from '../ids/create-api-id.js';
import { createFileId } from '../ids/create-file-id.js';
import { parseFileId } from '../ids/parse-file-id.js';
import { parseSymbolId } from '../ids/parse-symbol-id.js';
import { createRuntimeEdgeIdFromEvent } from './create-runtime-edge-id-from-event.js';
import type {
  ApiNode,
  FileNode,
  FlowmapEdge,
  FlowmapGraph,
  FlowmapNode,
  RuntimeEdge,
  SymbolNode,
} from '../types/graph.js';
import type { ExportRef } from '../types/static-metadata.js';
import type { RuntimeEvent } from '../types/runtime-events.js';

function getFileName(path: string): string {
  const segments = path.split('/');
  return segments.at(-1) ?? path;
}

function inferSymbolType(symbolName: string): SymbolNode['symbolType'] {
  if (/^use[A-Z0-9_]/.test(symbolName)) {
    return 'hook';
  }

  if (/^[A-Z]/.test(symbolName)) {
    return 'component';
  }

  return 'function';
}

export type GraphBuilderState = {
  nodes: Map<string, FlowmapNode>;
  edges: Map<string, FlowmapEdge>;
};

export function createGraphBuilderState(): GraphBuilderState {
  return {
    nodes: new Map<string, FlowmapNode>(),
    edges: new Map<string, FlowmapEdge>(),
  };
}

function addNode(state: GraphBuilderState, node: FlowmapNode): boolean {
  if (!state.nodes.has(node.id)) {
    state.nodes.set(node.id, node);
    return true;
  }

  return false;
}

function addEdge(state: GraphBuilderState, edge: FlowmapEdge): boolean {
  if (!state.edges.has(edge.id)) {
    state.edges.set(edge.id, edge);
    return true;
  }

  return false;
}

function ensureFileNode(state: GraphBuilderState, fileIdOrPath: string): { node: FileNode; changed: boolean } {
  const normalizedFileId = fileIdOrPath.startsWith('file:')
    ? fileIdOrPath
    : createFileId(fileIdOrPath);
  const filePath = parseFileId(normalizedFileId);
  const existing = state.nodes.get(normalizedFileId);

  if (existing?.kind === 'file') {
    return { node: existing, changed: false };
  }

  const node: FileNode = {
    id: normalizedFileId,
    kind: 'file',
    path: filePath,
    name: getFileName(filePath),
    exports: [],
  };

  return { node, changed: addNode(state, node) };
}

function ensureFileExportRef(fileNode: FileNode, symbolNode: SymbolNode): boolean {
  const alreadyPresent = fileNode.exports.some((entry) => entry.symbolId === symbolNode.id);

  if (alreadyPresent) {
    return false;
  }

  const exportRef: ExportRef = {
    symbolId: symbolNode.id,
    name: symbolNode.name,
    symbolType: symbolNode.symbolType,
    exported: symbolNode.exported,
  };

  fileNode.exports.push(exportRef);
  return true;
}

function ensureSymbolNode(state: GraphBuilderState, symbolId: string): { node?: SymbolNode; changed: boolean } {
  const existing = state.nodes.get(symbolId);

  if (existing?.kind === 'symbol') {
    const fileNode = state.nodes.get(existing.fileId);
    let changed = false;

    if (fileNode?.kind === 'file') {
      changed = ensureFileExportRef(fileNode, existing);
    }

    return { node: existing, changed };
  }

  const parsed = parseSymbolId(symbolId);

  if (!parsed) {
    return { changed: false };
  }

  const fileResult = ensureFileNode(state, parsed.filePath);
  const fileNode = fileResult.node;

  const node: SymbolNode = {
    id: symbolId,
    kind: 'symbol',
    fileId: fileNode.id,
    name: parsed.symbolName,
    symbolType: inferSymbolType(parsed.symbolName),
    exported: false,
  };

  const nodeChanged = addNode(state, node);
  const exportChanged = ensureFileExportRef(fileNode, node);
  const containsChanged = addEdge(state, {
    id: `contains:${fileNode.id}->${symbolId}`,
    kind: 'contains',
    source: fileNode.id,
    target: symbolId,
  });

  return { node, changed: fileResult.changed || nodeChanged || exportChanged || containsChanged };
}

function ensureApiNode(state: GraphBuilderState, method: ApiNode['method'], path: string): { node: ApiNode; changed: boolean } {
  const apiId = createApiId(method, path);
  const existing = state.nodes.get(apiId);

  if (existing?.kind === 'api') {
    return { node: existing, changed: false };
  }

  const node: ApiNode = {
    id: apiId,
    kind: 'api',
    method,
    path,
    label: `${method} ${path}`,
  };

  return { node, changed: addNode(state, node) };
}

function addRuntimeEdge(state: GraphBuilderState, edge: RuntimeEdge): boolean {
  return addEdge(state, edge);
}

function applyRequestSummaryToApiNode(
  state: GraphBuilderState,
  apiNode: ApiNode,
  event: Extract<RuntimeEvent, { eventType: 'request' }>,
): boolean {
  const nextNode: ApiNode = {
    id: apiNode.id,
    kind: 'api',
    method: apiNode.method,
    path: apiNode.path,
    label: apiNode.label,
    requestCount: (apiNode.requestCount ?? 0) + 1,
    lastSeenAt: event.timestamp,
    lastOutcome: event.outcome,
    ...(event.status !== undefined ? { lastStatus: event.status } : {}),
    ...(event.durationMs !== undefined ? { lastDurationMs: event.durationMs } : {}),
    ...(event.errorName !== undefined ? { lastErrorName: event.errorName } : {}),
    ...(event.errorMessage !== undefined ? { lastErrorMessage: event.errorMessage } : {}),
  };

  state.nodes.set(apiNode.id, nextNode);
  return true;
}

function applyRequestSummaryToEdge(
  state: GraphBuilderState,
  event: Extract<RuntimeEvent, { eventType: 'request' }>,
  sourceId: string,
  targetId: string,
): boolean {
  const edgeId = createRuntimeEdgeIdFromEvent(event);
  const existing = state.edges.get(edgeId);

  if (existing?.kind === 'request') {
    state.edges.set(edgeId, {
      id: existing.id,
      kind: 'request',
      source: existing.source,
      target: existing.target,
      count: (existing.count ?? 1) + 1,
      lastSeenAt: event.timestamp,
      lastOutcome: event.outcome,
      ...(event.status !== undefined ? { lastStatus: event.status } : {}),
      ...(event.durationMs !== undefined ? { lastDurationMs: event.durationMs } : {}),
      ...(event.errorName !== undefined ? { lastErrorName: event.errorName } : {}),
      ...(event.errorMessage !== undefined ? { lastErrorMessage: event.errorMessage } : {}),
    });
    return true;
  }

  return addRuntimeEdge(state, {
    id: edgeId,
    kind: 'request',
    source: sourceId,
    target: targetId,
    count: 1,
    lastSeenAt: event.timestamp,
    lastOutcome: event.outcome,
    ...(event.status !== undefined ? { lastStatus: event.status } : {}),
    ...(event.durationMs !== undefined ? { lastDurationMs: event.durationMs } : {}),
    ...(event.errorName !== undefined ? { lastErrorName: event.errorName } : {}),
    ...(event.errorMessage !== undefined ? { lastErrorMessage: event.errorMessage } : {}),
  });
}

function applyRuntimeEvent(state: GraphBuilderState, event: RuntimeEvent): boolean {
  switch (event.eventType) {
    case 'render': {
      const fileChanged = ensureFileNode(state, event.fileId).changed;
      const targetResult = ensureSymbolNode(state, event.targetSymbolId);
      let changed = fileChanged || targetResult.changed;

      if (event.sourceSymbolId) {
        const sourceResult = ensureSymbolNode(state, event.sourceSymbolId);
        const target = targetResult.node;
        const source = sourceResult.node;

        changed = sourceResult.changed || changed;

        if (source && target) {
          changed = addRuntimeEdge(state, {
            id: createRuntimeEdgeIdFromEvent(event),
            kind: 'render',
            source: source.id,
            target: target.id,
          }) || changed;
        }
      }

      return changed;
    }
    case 'use': {
      const source = ensureSymbolNode(state, event.sourceSymbolId);
      const target = ensureSymbolNode(state, event.targetSymbolId);
      let changed = source.changed || target.changed;

      if (source.node && target.node) {
        changed = addRuntimeEdge(state, {
          id: createRuntimeEdgeIdFromEvent(event),
          kind: 'use',
          source: source.node.id,
          target: target.node.id,
        }) || changed;
      }

      return changed;
    }
    case 'call': {
      const source = ensureSymbolNode(state, event.sourceSymbolId);
      const target = ensureSymbolNode(state, event.targetSymbolId);
      let changed = source.changed || target.changed;

      if (source.node && target.node) {
        changed = addRuntimeEdge(state, {
          id: createRuntimeEdgeIdFromEvent(event),
          kind: 'call',
          source: source.node.id,
          target: target.node.id,
        }) || changed;
      }

      return changed;
    }
    case 'request': {
      const source = ensureSymbolNode(state, event.sourceSymbolId);
      const api = ensureApiNode(state, event.method, event.path);
      let changed = source.changed || api.changed;

      changed = applyRequestSummaryToApiNode(state, api.node, event) || changed;

      if (source.node) {
        changed = applyRequestSummaryToEdge(state, event, source.node.id, api.node.id) || changed;
      }

      return changed;
    }
    default: {
      const exhaustive: never = event;
      throw new Error(`Unsupported runtime event: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function applyRuntimeEvents(state: GraphBuilderState, events: RuntimeEvent[]): boolean {
  let changed = false;

  for (const event of events) {
    changed = applyRuntimeEvent(state, event) || changed;
  }

  return changed;
}

export function buildGraphFromState(state: GraphBuilderState): FlowmapGraph {
  return {
    nodes: [...state.nodes.values()],
    edges: [...state.edges.values()],
  };
}

export function buildGraph(events: RuntimeEvent[]): FlowmapGraph {
  const state = createGraphBuilderState();
  applyRuntimeEvents(state, events);
  return buildGraphFromState(state);
}
