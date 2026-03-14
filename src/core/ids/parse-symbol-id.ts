export type ParsedSymbolId = {
  filePath: string;
  symbolName: string;
};

export function parseSymbolId(symbolId: string): ParsedSymbolId | undefined {
  if (!symbolId.startsWith('symbol:')) {
    return undefined;
  }

  const body = symbolId.slice('symbol:'.length);
  const hashIndex = body.lastIndexOf('#');

  if (hashIndex === -1) {
    return undefined;
  }

  const filePath = body.slice(0, hashIndex);
  const symbolName = body.slice(hashIndex + 1);

  if (!filePath || !symbolName) {
    return undefined;
  }

  return {
    filePath,
    symbolName,
  };
}
