import type {
  ApiNode,
  FileNode,
  GoriEdge,
  GoriGraph,
  GoriNode,
  RuntimeEdge,
  SymbolNode,
} from '../types/graph.js';

export interface GraphStore {
  addNode(node: GoriNode): void;
  addEdge(edge: GoriEdge): void;
  addGraph(graph: GoriGraph): void;
  getNode(id: string): GoriNode | undefined;
  getGraph(): GoriGraph;
  getFileNodes(): FileNode[];
  getApiNodes(): ApiNode[];
  getSymbolsForFile(fileId: string): SymbolNode[];
  getFileForSymbol(symbolId: string): FileNode | undefined;
  getEdgesByKind(kind: GoriEdge['kind']): GoriEdge[];
  getRuntimeEdges(): RuntimeEdge[];
  getOutgoingEdges(nodeId: string): GoriEdge[];
  getIncomingEdges(nodeId: string): GoriEdge[];
}
