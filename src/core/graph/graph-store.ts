import type { GoriEdge, GoriGraph, GoriNode, SymbolNode } from '../types/graph.js';

export interface GraphStore {
  addNode(node: GoriNode): void;
  addEdge(edge: GoriEdge): void;
  addGraph(graph: GoriGraph): void;
  getNode(id: string): GoriNode | undefined;
  getGraph(): GoriGraph;
  getSymbolsForFile(fileId: string): SymbolNode[];
  getOutgoingEdges(nodeId: string): GoriEdge[];
  getIncomingEdges(nodeId: string): GoriEdge[];
}
