import { describe, expect, it } from 'vitest';

import type { DocEntry } from '../../src/ui/doc/build-doc-index';
import { applyStaticEdges } from '../../src/ui/inspector/ComponentOverlay';

function makeEntry(overrides: Partial<DocEntry> & { symbolId: string; name: string }): DocEntry {
  return {
    filePath: 'src/dummy.tsx',
    category: 'component',
    renders: [],
    renderedBy: [],
    uses: [],
    usedBy: [],
    apiCalls: [],
    ...overrides,
  };
}

describe('applyStaticEdges', () => {
  it('returns entries unchanged when staticJsx is empty', () => {
    const entries = [makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' })];
    const result = applyStaticEdges(entries, {}, {});
    expect(result[0]).toBe(entries[0]); // same reference
  });

  it('supplements renderedBy when runtime has no parent', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const menu = makeEntry({ symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu' });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    }, {});

    const menuResult = result.find(e => e.name === 'UserMenu')!;
    expect(menuResult.renderedBy).toEqual([
      { symbolId: app.symbolId, name: app.name, filePath: app.filePath },
    ]);
  });

  it('does not overwrite existing runtime renderedBy', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const runtimeParent = { symbolId: 'symbol:src/layout.tsx#Layout', name: 'Layout', filePath: 'src/layout.tsx' };
    const menu = makeEntry({
      symbolId: 'symbol:src/menu.tsx#UserMenu',
      name: 'UserMenu',
      renderedBy: [runtimeParent],
    });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    }, {});

    const menuResult = result.find(e => e.name === 'UserMenu')!;
    // Runtime parent preserved — static parent not added since renderedBy already has entries
    expect(menuResult.renderedBy).toEqual([runtimeParent]);
  });

  it('supplements renders with static children not in runtime renders', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const menu = makeEntry({ symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu' });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    }, {});

    const appResult = result.find(e => e.name === 'App')!;
    expect(appResult.renders).toEqual([
      { symbolId: menu.symbolId, name: menu.name, filePath: menu.filePath },
    ]);
  });

  it('does not duplicate children already in runtime renders', () => {
    const runtimeChild = { symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu', filePath: 'src/menu.tsx' };
    const app = makeEntry({
      symbolId: 'symbol:src/app.tsx#App',
      name: 'App',
      renders: [runtimeChild],
    });
    const menu = makeEntry({ symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu' });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    }, {});

    const appResult = result.find(e => e.name === 'App')!;
    expect(appResult.renders).toHaveLength(1);
  });

  it('ignores unknown component names in staticJsx', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });

    // 'Ghost' is not in entries
    const result = applyStaticEdges([app], {
      'symbol:src/app.tsx#App': ['Ghost'],
    }, {});

    const appResult = result.find(e => e.name === 'App')!;
    expect(appResult.renders).toHaveLength(0);
    expect(appResult).toBe(app); // unchanged reference
  });

  it('does not add static edges when fiber ownership already exists', () => {
    const appRouter = makeEntry({ symbolId: 'symbol:src/router.tsx#AppRouter', name: 'AppRouter' });
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const homePage = makeEntry({ symbolId: 'symbol:src/pages/home-page.tsx#HomePage', name: 'HomePage' });

    const result = applyStaticEdges(
      [appRouter, app, homePage],
      {
        'symbol:src/router.tsx#AppRouter': ['HomePage'],
      },
      {
        'symbol:src/router.tsx#AppRouter': ['symbol:src/app.tsx#App'],
        'symbol:src/app.tsx#App': ['symbol:src/pages/home-page.tsx#HomePage'],
      },
    );

    const homePageResult = result.find((entry) => entry.name === 'HomePage')!;
    const appRouterResult = result.find((entry) => entry.name === 'AppRouter')!;

    expect(homePageResult.renderedBy).toEqual([]);
    expect(appRouterResult.renders).toEqual([]);
  });
});
