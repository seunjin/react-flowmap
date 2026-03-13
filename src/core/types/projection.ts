import type { ApiNode, FileNode } from './graph.js';

export type FileEdgeRelationType = 'render' | 'use' | 'call' | 'request';

export type FileEdge = {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  relationTypes: FileEdgeRelationType[];
  supportingEdges: string[];
};

export type FileLevelView = {
  fileNodes: FileNode[];
  apiNodes: ApiNode[];
  fileEdges: FileEdge[];
};
