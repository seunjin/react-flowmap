import type { ExportRef } from '../../core/types/static-metadata.js';

type FilterNodeExportsInput = {
  exports: ExportRef[];
  query: string;
  selectedOnly: boolean;
  selectedSymbolIds: string[];
};

export function filterNodeExports({
  exports,
  query,
  selectedOnly,
  selectedSymbolIds,
}: FilterNodeExportsInput): ExportRef[] {
  const normalizedQuery = query.trim().toLowerCase();

  return exports.filter((item) => {
    if (selectedOnly && !selectedSymbolIds.includes(item.symbolId)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.symbolType.toLowerCase().includes(normalizedQuery)
    );
  });
}
