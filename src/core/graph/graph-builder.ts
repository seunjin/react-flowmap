import { createApiId } from '../ids/create-api-id.js';
import { createFileId } from '../ids/create-file-id.js';
import { parseFileId } from '../ids/parse-file-id.js';
import { parseSymbolId } from '../ids/parse-symbol-id.js';
import type {
  ApiNode,
  FileNode,
  GoriEdge,
  GoriGraph,
  GoriNode,
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

type BuilderState = {
  nodes: Map<string, GoriNode>;
  edges: Map<string, GoriEdge>;
};

function addNode(state: BuilderState, node: GoriNode): void {
  if (!state.nodes.has(node.id)) {
    state.nodes.set(node.id, node);
  }
}

function addEdge(state: BuilderState, edge: GoriEdge): void {
  if (!state.edges.has(edge.id)) {
    state.edges.set(edge.id, edge);
  }
}

function ensureFileNode(state: BuilderState, fileIdOrPath: string): FileNode {
  const normalizedFileId = fileIdOrPath.startsWith('file:')
    ? fileIdOrPath
    : createFileId(fileIdOrPath);
  const filePath = parseFileId(normalizedFileId);
  const existing = state.nodes.get(normalizedFileId);

  if (existing?.kind === 'file') {
    return existing;
  }

  const node: FileNode = {
    id: normalizedFileId,
    kind: 'file',
    path: filePath,
    name: getFileName(filePath),
    exports: [],
  };

  addNode(state, node);
  return node;
}

function ensureFileExportRef(fileNode: FileNode, symbolNode: SymbolNode): void {
  const alreadyPresent = fileNode.exports.some((entry) => entry.symbolId === symbolNode.id);

  if (alreadyPresent) {
    return;
  }

  const exportRef: ExportRef = {
    symbolId: symbolNode.id,
    name: symbolNode.name,
    symbolType: symbolNode.symbolType,
    exported: symbolNode.exported,
  };

  fileNode.exports.push(exportRef);
}

function ensureSymbolNode(state: BuilderState, symbolId: string): SymbolNode | undefined {
  const existing = state.nodes.get(symbolId);

  if (existing?.kind === 'symbol') {
    const fileNode = state.nodes.get(existing.fileId);

    if (fileNode?.kind === 'file') {
      ensureFileExportRef(fileNode, existing);
    }

    return existing;
  }

  const parsed = parseSymbolId(symbolId);

  if (!parsed) {
    return undefined;
  }

  const fileNode = ensureFileNode(state, parsed.filePath);

  const node: SymbolNode = {
    id: symbolId,
    kind: 'symbol',
    fileId: fileNode.id,
    name: parsed.symbolName,
    symbolType: inferSymbolType(parsed.symbolName),
    exported: false,
  };

  addNode(state, node);
  ensureFileExportRef(fileNode, node);
  addEdge(state, {
    id: `contains:${fileNode.id}->${symbolId}`,
    kind: 'contains',
    source: fileNode.id,
    target: symbolId,
  });

  return node;
}

function ensureApiNode(state: BuilderState, method: ApiNode['method'], path: string): ApiNode {
  const apiId = createApiId(method, path);
  const existing = state.nodes.get(apiId);

  if (existing?.kind === 'api') {
    return existing;
  }

  const node: ApiNode = {
    id: apiId,
    kind: 'api',
    method,
    path,
    label: `${method} ${path}`,
  };

  addNode(state, node);
  return node;
}

function addRuntimeEdge(state: BuilderState, edge: RuntimeEdge): void {
  addEdge(state, edge);
}

export function buildGraph(events: RuntimeEvent[]): GoriGraph {
  const state: BuilderState = {
    nodes: new Map<string, GoriNode>(),
    edges: new Map<string, GoriEdge>(),
  };

  for (const event of events) {
    switch (event.eventType) {
      case 'render': {
        ensureFileNode(state, event.fileId);
        ensureSymbolNode(state, event.targetSymbolId);

        if (event.sourceSymbolId) {
          const source = ensureSymbolNode(state, event.sourceSymbolId);
          const target = ensureSymbolNode(state, event.targetSymbolId);

          if (source && target) {
            addRuntimeEdge(state, {
              id: `render:${source.id}->${target.id}`,
              kind: 'render',
              source: source.id,
              target: target.id,
            });
          }
        }
        break;
      }
      case 'use': {
        const source = ensureSymbolNode(state, event.sourceSymbolId);
        const target = ensureSymbolNode(state, event.targetSymbolId);

        if (source && target) {
          addRuntimeEdge(state, {
            id: `use:${source.id}->${target.id}`,
            kind: 'use',
            source: source.id,
            target: target.id,
          });
        }
        break;
      }
      case 'call': {
        const source = ensureSymbolNode(state, event.sourceSymbolId);
        const target = ensureSymbolNode(state, event.targetSymbolId);

        if (source && target) {
          addRuntimeEdge(state, {
            id: `call:${source.id}->${target.id}`,
            kind: 'call',
            source: source.id,
            target: target.id,
          });
        }
        break;
      }
      case 'request': {
        const source = ensureSymbolNode(state, event.sourceSymbolId);
        const api = ensureApiNode(state, event.method, event.path);

        if (source) {
          addRuntimeEdge(state, {
            id: `request:${source.id}->${api.id}`,
            kind: 'request',
            source: source.id,
            target: api.id,
          });
        }
        break;
      }
      default: {
        const exhaustive: never = event;
        throw new Error(`Unsupported runtime event: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  return {
    nodes: [...state.nodes.values()],
    edges: [...state.edges.values()],
  };
}
