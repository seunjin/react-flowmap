import { describe, expect, it } from 'vitest';

import { filterNodeExports } from '../../src/ui/react-flow/filter-node-exports';

const exportsFixture = [
  {
    symbolId: 'symbol:src/pages/user-page.tsx#UserPage',
    name: 'UserPage',
    symbolType: 'component' as const,
    exported: true,
  },
  {
    symbolId: 'symbol:src/hooks/use-user.ts#useUser',
    name: 'useUser',
    symbolType: 'hook' as const,
    exported: true,
  },
  {
    symbolId: 'symbol:src/api/user.ts#fetchUser',
    name: 'fetchUser',
    symbolType: 'function' as const,
    exported: true,
  },
];

describe('filterNodeExports', () => {
  it('filters by query against export name and symbol type', () => {
    expect(
      filterNodeExports({
        exports: exportsFixture,
        query: 'user',
        selectedOnly: false,
        selectedSymbolIds: [],
      }).map((item) => item.name)
    ).toEqual(['UserPage', 'useUser', 'fetchUser']);

    expect(
      filterNodeExports({
        exports: exportsFixture,
        query: 'hook',
        selectedOnly: false,
        selectedSymbolIds: [],
      }).map((item) => item.name)
    ).toEqual(['useUser']);
  });

  it('can limit the list to selected exports only', () => {
    expect(
      filterNodeExports({
        exports: exportsFixture,
        query: '',
        selectedOnly: true,
        selectedSymbolIds: ['symbol:src/hooks/use-user.ts#useUser'],
      }).map((item) => item.name)
    ).toEqual(['useUser']);
  });
});
