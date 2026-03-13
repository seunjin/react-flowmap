export function createSymbolId(path: string, symbolName: string): string {
  return `symbol:${path}#${symbolName}`;
}
