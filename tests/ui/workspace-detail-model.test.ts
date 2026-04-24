import { describe, expect, it } from 'vitest';

import type { DocEntry } from '../../src/ui/doc/build-doc-index';
import type { RfmNextRoute } from '../../src/ui/inspector/types';
import { getEntryScreenContext, getRouteScreenContext } from '../../src/ui/graph-window/workspace-detail-model';

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

function makeRoute(overrides: Partial<RfmNextRoute> & { filePath: string; componentName: string }): RfmNextRoute {
  return {
    urlPath: '/',
    type: 'page',
    isServer: true,
    ...overrides,
  };
}

describe('workspace detail model', () => {
  it('finds the active owner route for a selected component in the current screen', () => {
    const layoutRoute = makeRoute({
      filePath: 'src/app/dashboard/layout.tsx',
      componentName: 'DashboardLayout',
      type: 'layout',
      urlPath: '/dashboard',
      children: [
        { filePath: 'src/components/dashboard-shell.tsx', componentName: 'DashboardShell', isServer: false },
      ],
    });
    const pageRoute = makeRoute({
      filePath: 'src/app/dashboard/settings/page.tsx',
      componentName: 'DashboardSettingsPage',
      urlPath: '/dashboard/settings',
      children: [
        { filePath: 'src/components/settings-panel.tsx', componentName: 'SettingsPanel', isServer: false },
      ],
    });
    const selectedEntry = makeEntry({
      symbolId: 'symbol:src/components/settings-panel.tsx#SettingsPanel',
      name: 'SettingsPanel',
      filePath: 'src/components/settings-panel.tsx',
    });

    expect(
      getEntryScreenContext(selectedEntry, [layoutRoute, pageRoute], '/dashboard/settings'),
    ).toEqual({
      route: pageRoute,
      parentLayout: layoutRoute,
    });
  });

  it('matches dynamic routes when deriving current screen context', () => {
    const layoutRoute = makeRoute({
      filePath: 'src/app/dashboard/layout.tsx',
      componentName: 'DashboardLayout',
      type: 'layout',
      urlPath: '/dashboard',
    });
    const dynamicPageRoute = makeRoute({
      filePath: 'src/app/dashboard/settings/[id]/page.tsx',
      componentName: 'DashboardSettingsDetailPage',
      urlPath: '/dashboard/settings/[id]',
      children: [
        { filePath: 'src/components/setting-detail.tsx', componentName: 'SettingDetail', isServer: false },
      ],
    });
    const selectedEntry = makeEntry({
      symbolId: 'symbol:src/components/setting-detail.tsx#SettingDetail',
      name: 'SettingDetail',
      filePath: 'src/components/setting-detail.tsx',
    });

    expect(
      getEntryScreenContext(selectedEntry, [layoutRoute, dynamicPageRoute], '/dashboard/settings/42'),
    ).toEqual({
      route: dynamicPageRoute,
      parentLayout: layoutRoute,
    });
  });

  it('returns parent layout for route detail context', () => {
    const rootLayout = makeRoute({
      filePath: 'src/app/layout.tsx',
      componentName: 'RootLayout',
      type: 'layout',
      urlPath: '/',
    });
    const dashboardLayout = makeRoute({
      filePath: 'src/app/dashboard/layout.tsx',
      componentName: 'DashboardLayout',
      type: 'layout',
      urlPath: '/dashboard',
    });
    const dashboardPage = makeRoute({
      filePath: 'src/app/dashboard/page.tsx',
      componentName: 'DashboardPage',
      urlPath: '/dashboard',
    });

    expect(
      getRouteScreenContext(dashboardPage, [rootLayout, dashboardLayout, dashboardPage]),
    ).toEqual({
      parentLayout: dashboardLayout,
    });
  });
});
