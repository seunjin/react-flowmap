import { describe, expect, it } from 'vitest';

import { getSymbolAccent } from '../../src/ui/colors/get-symbol-accent';

describe('getSymbolAccent', () => {
  it('returns a stable accent for the same symbol id', () => {
    const first = getSymbolAccent('symbol:src/pages/user-page.tsx#UserPage');
    const second = getSymbolAccent('symbol:src/pages/user-page.tsx#UserPage');

    expect(first).toEqual(second);
  });

  it('returns different accents for different symbol ids', () => {
    const first = getSymbolAccent('symbol:src/pages/user-page.tsx#UserPage');
    const second = getSymbolAccent('symbol:src/hooks/use-user.ts#useUser');

    expect(first).not.toEqual(second);
  });
});
