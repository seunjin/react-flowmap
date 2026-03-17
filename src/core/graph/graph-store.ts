import type {
  ApiNode,
  FileNode,
  FlowmapEdge,
  FlowmapGraph,
  FlowmapNode,
  RuntimeEdge,
  SymbolNode,
} from '../types/graph.js';

export interface GraphStore {
  addNode(node: FlowmapNode): void;
  addEdge(edge: FlowmapEdge): void;
  addGraph(graph: FlowmapGraph): void;
  getNode(id: string): FlowmapNode | undefined;
  getGraph(): FlowmapGraph;
  getFileNodes(): FileNode[];
  getApiNodes(): ApiNode[];
  getSymbolsForFile(fileId: string): SymbolNode[];
  getFileForSymbol(symbolId: string): FileNode | undefined;
  getEdgesByKind(kind: FlowmapEdge['kind']): FlowmapEdge[];
  getRuntimeEdges(): RuntimeEdge[];
  getOutgoingEdges(nodeId: string): FlowmapEdge[];
  getIncomingEdges(nodeId: string): FlowmapEdge[];
}
