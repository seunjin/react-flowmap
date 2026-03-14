import type { FileStaticMetadata } from './static-metadata.js';
import type { FileNode, SymbolNode } from './graph.js';

export type EdgeDescription = {
  edgeId: string;
  label: string;
};

export type SymbolRelationSummary = {
  symbolId: string;
  outgoingEdgeIds: string[];
  incomingEdgeIds: string[];
  requestEdgeIds: string[];
  outgoingEdges: EdgeDescription[];
  incomingEdges: EdgeDescription[];
  requestEdges: EdgeDescription[];
};

export type InspectorPayload = {
  file?: FileNode;
  selectedSymbols: SymbolNode[];
  staticMetadata?: FileStaticMetadata;
  relations: SymbolRelationSummary[];
};
