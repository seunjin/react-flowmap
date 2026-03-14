import type { RuntimeEdge } from './graph.js';

export type SelectionMode = 'both' | 'outgoing' | 'incoming';
export type RuntimeEdgeKind = RuntimeEdge['kind'];

export type SelectionState = {
  selectedFileId?: string;
  selectedSymbolIds: string[];
  selectedEdgeKinds: RuntimeEdgeKind[];
  mode: SelectionMode;
  hop: number;
};
