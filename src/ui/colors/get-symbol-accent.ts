export type SymbolAccent = {
  solid: string;
  soft: string;
  border: string;
};

function hashSymbolId(symbolId: string): number {
  let hash = 0;

  for (let index = 0; index < symbolId.length; index += 1) {
    hash = (hash * 31 + symbolId.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getSymbolAccent(symbolId: string): SymbolAccent {
  const hue = hashSymbolId(symbolId) % 360;

  return {
    solid: `hsl(${hue} 72% 38%)`,
    soft: `hsl(${hue} 90% 96%)`,
    border: `hsl(${hue} 68% 54%)`,
  };
}
