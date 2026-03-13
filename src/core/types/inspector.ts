import type { FileStaticMetadata } from './static-metadata.js';
import type { FileNode, SymbolNode } from './graph.js';

export type SymbolRelationSummary = {
  symbolId: string;
  outgoingEdgeIds: string[];
  incomingEdgeIds: string[];
  requestEdgeIds: string[];
};

export type InspectorPayload = {
  file?: FileNode;
  selectedSymbols: SymbolNode[];
  staticMetadata?: FileStaticMetadata;
  relations: SymbolRelationSummary[];
};
