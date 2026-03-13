export type SelectionMode = 'both' | 'outgoing' | 'incoming';

export type SelectionState = {
  selectedFileId?: string;
  selectedSymbolIds: string[];
  mode: SelectionMode;
  hop: number;
};
