import { describe, expect, it } from 'vitest';

import { buildDocIndex } from '../../src/ui/doc/build-doc-index';

describe('buildDocIndex', () => {
  it('keeps runtime render roots as components instead of promoting them to pages', () => {
    const index = buildDocIndex({
      nodes: [
        {
          id: 'file:src/app.tsx',
          kind: 'file',
          path: 'src/app.tsx',
          name: 'app.tsx',
          exports: [],
        },
        {
          id: 'file:src/user-menu.tsx',
          kind: 'file',
          path: 'src/user-menu.tsx',
          name: 'user-menu.tsx',
          exports: [],
        },
        {
          id: 'symbol:src/app.tsx#App',
          kind: 'symbol',
          fileId: 'file:src/app.tsx',
          name: 'App',
          symbolType: 'component',
          exported: true,
        },
        {
          id: 'symbol:src/user-menu.tsx#UserMenu',
          kind: 'symbol',
          fileId: 'file:src/user-menu.tsx',
          name: 'UserMenu',
          symbolType: 'component',
          exported: true,
        },
      ],
      edges: [
        {
          id: 'render:symbol:src/app.tsx#App->symbol:src/user-menu.tsx#UserMenu',
          kind: 'render',
          source: 'symbol:src/app.tsx#App',
          target: 'symbol:src/user-menu.tsx#UserMenu',
        },
      ],
    });

    expect(index.pages).toEqual([]);
    expect(index.components.map((entry) => ({ name: entry.name, category: entry.category }))).toEqual([
      { name: 'App', category: 'component' },
      { name: 'UserMenu', category: 'component' },
    ]);
  });
});
