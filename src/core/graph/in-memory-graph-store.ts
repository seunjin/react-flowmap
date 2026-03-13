import type { GoriEdge, GoriGraph, GoriNode, SymbolNode } from '../types/graph.js';

import type { GraphStore } from './graph-store.js';

export class InMemoryGraphStore implements GraphStore {
  private readonly nodes = new Map<string, GoriNode>();
  private readonly edges = new Map<string, GoriEdge>();
  private readonly outgoing = new Map<string, GoriEdge[]>();
  private readonly incoming = new Map<string, GoriEdge[]>();

  addNode(node: GoriNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GoriEdge): void {
    this.edges.set(edge.id, edge);
    this.outgoing.set(edge.source, [...(this.outgoing.get(edge.source) ?? []), edge]);
    this.incoming.set(edge.target, [...(this.incoming.get(edge.target) ?? []), edge]);
  }

  addGraph(graph: GoriGraph): void {
    for (const node of graph.nodes) {
      this.addNode(node);
    }

    for (const edge of graph.edges) {
      this.addEdge(edge);
    }
  }

  getNode(id: string): GoriNode | undefined {
    return this.nodes.get(id);
  }

  getGraph(): GoriGraph {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()],
    };
  }

  getSymbolsForFile(fileId: string): SymbolNode[] {
    return [...this.nodes.values()].filter(
      (node): node is SymbolNode => node.kind === 'symbol' && node.fileId === fileId
    );
  }

  getOutgoingEdges(nodeId: string): GoriEdge[] {
    return this.outgoing.get(nodeId) ?? [];
  }

  getIncomingEdges(nodeId: string): GoriEdge[] {
    return this.incoming.get(nodeId) ?? [];
  }
}
