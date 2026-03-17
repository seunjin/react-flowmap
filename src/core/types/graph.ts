import type { ExportRef, SymbolType } from './static-metadata.js';

export type FileNode = {
  id: string;
  kind: 'file';
  path: string;
  name: string;
  exports: ExportRef[];
};

export type SymbolNode = {
  id: string;
  kind: 'symbol';
  fileId: string;
  name: string;
  symbolType: SymbolType;
  exported: boolean;
};

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiNode = {
  id: string;
  kind: 'api';
  method: ApiMethod;
  path: string;
  label: string;
};

export type FlowmapNode = FileNode | SymbolNode | ApiNode;

export type ContainsEdge = {
  id: string;
  kind: 'contains';
  source: string;
  target: string;
};

export type RenderEdge = {
  id: string;
  kind: 'render';
  source: string;
  target: string;
};

export type UseEdge = {
  id: string;
  kind: 'use';
  source: string;
  target: string;
};

export type CallEdge = {
  id: string;
  kind: 'call';
  source: string;
  target: string;
};

export type RequestEdge = {
  id: string;
  kind: 'request';
  source: string;
  target: string;
};

export type FlowmapEdge =
  | ContainsEdge
  | RenderEdge
  | UseEdge
  | CallEdge
  | RequestEdge;

export type RuntimeEdge = Exclude<FlowmapEdge, ContainsEdge>;

export type FlowmapGraph = {
  nodes: FlowmapNode[];
  edges: FlowmapEdge[];
};
