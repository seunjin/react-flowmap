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
  it('uses static declarations as fallback edges for otherwise orphan children', () => {
    const app = makeEntry({
      symbolId: 'symbol:src/app.tsx#App',
      name: 'App',
      filePath: 'src/app.tsx',
    });
    const sidebar = makeEntry({
      symbolId: 'symbol:src/sidebar.tsx#Sidebar',
      name: 'Sidebar',
      filePath: 'src/sidebar.tsx',
    });

    const layout = buildLayout(
      [app, sidebar],
      {
        'symbol:src/app.tsx#App': ['Sidebar'],
      },
      {},
    );

    expect(
      layout.edges.map((edge) => `${edge.fromId}->${edge.toId}`),
    ).toEqual([
      'symbol:src/app.tsx#App->symbol:src/sidebar.tsx#Sidebar',
    ]);
  });

  it('hides competing static declaration edges when runtime render ownership exists', () => {
    const router = makeEntry({
      symbolId: 'symbol:src/router.tsx#AppRouter',
      name: 'AppRouter',
      filePath: 'src/router.tsx',
    });
    const layoutRoot = makeEntry({
      symbolId: 'symbol:src/layout.tsx#LayoutRoot',
      name: 'LayoutRoot',
      filePath: 'src/layout.tsx',
      renders: [
        { symbolId: 'symbol:src/pages/home-page.tsx#HomePage', name: 'HomePage', filePath: 'src/pages/home-page.tsx' },
      ],
    });
    const homePage = makeEntry({
      symbolId: 'symbol:src/pages/home-page.tsx#HomePage',
      name: 'HomePage',
      filePath: 'src/pages/home-page.tsx',
    });

    const layout = buildLayout(
      [router, layoutRoot, homePage],
      {
        'symbol:src/router.tsx#AppRouter': ['HomePage'],
      },
      {},
    );

    expect(
      layout.edges.map((edge) => `${edge.fromId}->${edge.toId}`),
    ).toEqual([
      'symbol:src/layout.tsx#LayoutRoot->symbol:src/pages/home-page.tsx#HomePage',
    ]);
  });

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

  it('uses fiber ownership for TanStack Outlet-mediated route components', () => {
    const rootRoute = makeEntry({
      symbolId: 'symbol:src/router.tsx#RootRoute',
      name: 'RootRoute',
      filePath: 'src/router.tsx',
    });
    const app = makeEntry({
      symbolId: 'symbol:src/app.tsx#App',
      name: 'App',
      filePath: 'src/app.tsx',
    });
    const reportsPage = makeEntry({
      symbolId: 'symbol:src/pages/reports/ui/reports-page.tsx#ReportsPage',
      name: 'ReportsPage',
      filePath: 'src/pages/reports/ui/reports-page.tsx',
    });

    const layout = buildLayout(
      [rootRoute, app, reportsPage],
      {
        'symbol:src/router.tsx#RootRoute': ['ReportsPage'],
      },
      {
        'symbol:src/app.tsx#App': ['symbol:src/pages/reports/ui/reports-page.tsx#ReportsPage'],
      },
    );

    expect(
      layout.edges.map((edge) => `${edge.fromId}->${edge.toId}`),
    ).toEqual([
      'symbol:src/app.tsx#App->symbol:src/pages/reports/ui/reports-page.tsx#ReportsPage',
    ]);
  });
});
