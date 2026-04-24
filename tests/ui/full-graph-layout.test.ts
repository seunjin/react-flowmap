import { describe, expect, it } from 'vitest';

import type { DocEntry } from '../../src/ui/doc/build-doc-index';
import { buildLayout } from '../../src/ui/graph-window/FullGraph';

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

describe('full graph layout', () => {
  it('hides competing static declaration edges when ownership edges exist', () => {
    const appRouter = makeEntry({
      symbolId: 'symbol:src/router.tsx#AppRouter',
      name: 'AppRouter',
      filePath: 'src/router.tsx',
      renders: [
        { symbolId: 'symbol:src/app.tsx#App', name: 'App', filePath: 'src/app.tsx' },
      ],
    });
    const app = makeEntry({
      symbolId: 'symbol:src/app.tsx#App',
      name: 'App',
      filePath: 'src/app.tsx',
    });
    const homePage = makeEntry({
      symbolId: 'symbol:src/pages/home-page.tsx#HomePage',
      name: 'HomePage',
      filePath: 'src/pages/home-page.tsx',
    });

    const layout = buildLayout(
      [appRouter, app, homePage],
      {
        'symbol:src/router.tsx#AppRouter': ['HomePage'],
      },
      {
        'symbol:src/app.tsx#App': ['symbol:src/pages/home-page.tsx#HomePage'],
      },
    );

    expect(
      layout.edges.map((edge) => `${edge.fromId}->${edge.toId}`),
    ).toEqual([
      'symbol:src/router.tsx#AppRouter->symbol:src/app.tsx#App',
      'symbol:src/app.tsx#App->symbol:src/pages/home-page.tsx#HomePage',
    ]);
  });
});
