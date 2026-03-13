export type SymbolType = 'component' | 'hook' | 'function' | 'constant';

export type ImportRef = {
  sourceFilePath: string;
  importedName: string;
  localName?: string;
  importedFrom: string;
  kind: 'named' | 'default' | 'namespace' | 'type';
};

export type ExportRef = {
  symbolId: string;
  name: string;
  symbolType: SymbolType;
  exported: boolean;
};

export type FileStaticMetadata = {
  fileId: string;
  path: string;
  imports: ImportRef[];
  exports: ExportRef[];
};
