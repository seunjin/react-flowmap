import { describe, expect, it } from 'vitest';

import type { DocEntry } from '../../src/ui/doc/build-doc-index';
import {
  buildDebugSnapshot,
  buildHybridGraphEntries,
} from '../../src/ui/graph-window/GraphWindow';
import type { RfmRoute } from '../../src/ui/inspector/types';

function makeEntry(overrides: Partial<DocEntry> & { symbolId: string; name: string }): DocEntry {
  return {
    filePath: 'src/dummy.tsx',
    category: 'component',
    executionKind: 'live',
    graphNodeKind: 'component',
    role: 'component',
    source: 'runtime',
    renders: [],
    renderedBy: [],
    uses: [],
    usedBy: [],
    apiCalls: [],
    ...overrides,
  };
}

function makeRoute(overrides: Partial<RfmRoute> & { filePath: string; componentName: string }): RfmRoute {
  return {
    router: 'next',
    urlPath: '/',
    type: 'layout',
    nodeKind: 'route',
    executionKind: 'static',
    isServer: true,
    ...overrides,
  };
}

describe('graph window hybrid Next graph', () => {
  it('merges a static client boundary into the single live runtime node from the same file', () => {
    const header = makeEntry({
      symbolId: 'symbol:src/components/layout/header.tsx#Header',
      name: 'Header',
      filePath: 'src/components/layout/header.tsx',
    });
    const rootLayout = makeRoute({
      filePath: 'src/app/layout.tsx',
      componentName: 'RootLayout',
      children: [
        {
          filePath: 'src/components/layout/header.tsx',
          componentName: 'header',
          nodeKind: 'client-boundary',
          executionKind: 'live',
          isServer: false,
        },
      ],
    });

    const entries = buildHybridGraphEntries([header], [rootLayout]);
    const names = entries.map((entry) => entry.name).sort();
    const routeEntry = entries.find((entry) => entry.name === 'RootLayout');
    const headerEntry = entries.find((entry) => entry.name === 'Header');

    expect(names).toEqual(['Header', 'RootLayout']);
    expect(routeEntry?.renders.map((ref) => ref.symbolId)).toEqual([
      'symbol:src/components/layout/header.tsx#Header',
    ]);
    expect(headerEntry?.renderedBy.map((ref) => ref.symbolId)).toEqual([
      'route:src/app/layout.tsx',
    ]);
  });

  it('copies a debug snapshot without including live prop values', () => {
    const searchProvider = makeEntry({
      symbolId: 'symbol:src/components/search-context.tsx#SearchProvider',
      name: 'SearchProvider',
      filePath: 'src/components/search-context.tsx',
    });
    const route = makeRoute({
      filePath: 'src/app/layout.tsx',
      componentName: 'RootLayout',
      children: [
        {
          filePath: 'src/components/search-context.tsx',
          componentName: 'search-context',
          nodeKind: 'client-boundary',
          executionKind: 'live',
          isServer: false,
        },
      ],
    });
    const graphEntries = buildHybridGraphEntries([searchProvider], [route]);

    const snapshot = buildDebugSnapshot({
      allEntries: [searchProvider],
      graphEntries,
      selectedId: searchProvider.symbolId,
      currentPath: '/',
      routes: [route],
      activeRoutes: [route],
      staticJsx: {},
      fiberRelations: {},
      observedStaticOwnerKeys: [],
      propTypesMap: {
        [searchProvider.symbolId]: {
          props: {
            query: { type: 'string', optional: false },
          },
        },
      },
    });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.type).toBe('react-flowmap-debug-snapshot');
    expect(snapshot.diagnostics).toEqual([
      {
        type: 'client-boundary-name-mismatch',
        route: '/',
        filePath: 'src/components/search-context.tsx',
        staticName: 'search-context',
        liveNames: ['SearchProvider'],
      },
    ]);
    expect(serialized).toContain('symbol:src/components/search-context.tsx#SearchProvider');
    expect(serialized).not.toContain('secret-live-value');
  });

  it('marks observed static DOM owners separately from declared-only static candidates', () => {
    const route = makeRoute({
      filePath: 'src/app/page.tsx',
      componentName: 'DashboardPage',
      children: [
        {
          filePath: 'src/app/_components/PostCard.tsx',
          componentName: 'PostCard',
          nodeKind: 'server-component',
          executionKind: 'static',
          isServer: true,
        },
        {
          filePath: 'src/app/_components/PostAside.tsx',
          componentName: 'PostAside',
          nodeKind: 'server-component',
          executionKind: 'static',
          isServer: true,
        },
      ],
    });

    const entries = buildHybridGraphEntries([], [route], [
      'src/app/_components/PostCard.tsx#PostCard',
    ]);
    const postCard = entries.find((entry) => entry.name === 'PostCard');
    const postAside = entries.find((entry) => entry.name === 'PostAside');

    expect(postCard?.symbolId).toBe('static:src/app/_components/PostCard.tsx#PostCard');
    expect(postCard?.ownershipKind).toBe('STATIC-DOM');
    expect(postAside?.ownershipKind).toBe('STATIC-DECLARED');
  });
});
