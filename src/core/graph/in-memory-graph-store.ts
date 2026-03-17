import type {
  ApiNode,
  FileNode,
  FlowmapEdge,
  FlowmapGraph,
  FlowmapNode,
  RuntimeEdge,
  SymbolNode,
} from '../types/graph.js';

import type { GraphStore } from './graph-store.js';

export class InMemoryGraphStore implements GraphStore {
  private readonly nodes = new Map<string, FlowmapNode>();
  private readonly edges = new Map<string, FlowmapEdge>();
  private readonly outgoing = new Map<string, FlowmapEdge[]>();
  private readonly incoming = new Map<string, FlowmapEdge[]>();

  addNode(node: FlowmapNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: FlowmapEdge): void {
    this.edges.set(edge.id, edge);
    this.outgoing.set(edge.source, [...(this.outgoing.get(edge.source) ?? []), edge]);
    this.incoming.set(edge.target, [...(this.incoming.get(edge.target) ?? []), edge]);
  }

  addGraph(graph: FlowmapGraph): void {
    for (const node of graph.nodes) {
      this.addNode(node);
    }

    for (const edge of graph.edges) {
      this.addEdge(edge);
    }
  }

  getNode(id: string): FlowmapNode | undefined {
    return this.nodes.get(id);
  }

  getGraph(): FlowmapGraph {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()],
    };
  }

  getFileNodes(): FileNode[] {
    return [...this.nodes.values()].filter((node): node is FileNode => node.kind === 'file');
  }

  getApiNodes(): ApiNode[] {
    return [...this.nodes.values()].filter((node): node is ApiNode => node.kind === 'api');
  }

  getSymbolsForFile(fileId: string): SymbolNode[] {
    return [...this.nodes.values()].filter(
      (node): node is SymbolNode => node.kind === 'symbol' && node.fileId === fileId
    );
  }

  getFileForSymbol(symbolId: string): FileNode | undefined {
    const node = this.nodes.get(symbolId);

    if (!node || node.kind !== 'symbol') {
      return undefined;
    }

    const parent = this.nodes.get(node.fileId);
    return parent?.kind === 'file' ? parent : undefined;
  }

  getEdgesByKind(kind: FlowmapEdge['kind']): FlowmapEdge[] {
    return [...this.edges.values()].filter((edge) => edge.kind === kind);
  }

  getRuntimeEdges(): RuntimeEdge[] {
    return [...this.edges.values()].filter(
      (edge): edge is RuntimeEdge => edge.kind !== 'contains'
    );
  }

  getOutgoingEdges(nodeId: string): FlowmapEdge[] {
    return this.outgoing.get(nodeId) ?? [];
  }

  getIncomingEdges(nodeId: string): FlowmapEdge[] {
    return this.incoming.get(nodeId) ?? [];
  }
}
