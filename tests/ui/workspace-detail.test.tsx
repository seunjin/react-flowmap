import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import type { DocEntry } from '../../src/ui/doc/build-doc-index';
import { WorkspaceDetail } from '../../src/ui/graph-window/WorkspaceDetail';
import type { PropTypesMap } from '../../src/ui/inspector/channel';
import type { RfmRoute } from '../../src/ui/inspector/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cleanup: Array<() => void> = [];

function makeEntry(overrides: Partial<DocEntry> & { symbolId: string; name: string }): DocEntry {
  return {
    filePath: 'src/app/page.tsx',
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
    type: 'page',
    nodeKind: 'route',
    executionKind: 'static',
    isServer: true,
    ...overrides,
  };
}

function renderWorkspaceDetail(props: {
  entry: DocEntry | null;
  route: RfmRoute | null;
  contextRoute?: RfmRoute | null;
  parentLayout?: RfmRoute | null;
  liveProps?: Record<string, unknown> | null;
  propTypesMap?: PropTypesMap;
}): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(
      <WorkspaceDetail
        entry={props.entry}
        route={props.route}
        contextRoute={props.contextRoute ?? null}
        parentLayout={props.parentLayout ?? null}
        props={props.liveProps ?? null}
        propTypesMap={props.propTypesMap ?? {}}
      />,
    );
  });

  cleanup.push(() => {
    act(() => root.unmount());
    container.remove();
  });

  return container;
}

afterEach(() => {
  while (cleanup.length > 0) {
    cleanup.pop()?.();
  }
});

describe('WorkspaceDetail', () => {
  it('shows static route metadata without rendering live props', () => {
    const route = makeRoute({
      filePath: 'src/app/reports/[id]/page.tsx',
      componentName: 'ReportPage',
      urlPath: '/reports/[id]',
      propTypes: {
        params: { type: '{ id: string; }', optional: false },
      },
    });
    const entry = makeEntry({
      symbolId: 'symbol:src/app/reports/[id]/page.tsx#ReportPage',
      name: 'ReportPage',
      filePath: route.filePath,
      executionKind: 'static',
      graphNodeKind: 'route',
      role: 'page',
      source: 'route',
    });

    const container = renderWorkspaceDetail({
      entry,
      route,
      contextRoute: route,
      liveProps: { liveOnly: 'secret-live-value' },
    });
    const text = container.textContent ?? '';

    expect(text).toContain('Runtime Data');
    expect(text).toContain('Static route file. Live props are not available');
    expect(text).toContain('Static Prop Types');
    expect(text).toContain('params');
    expect(text).not.toContain('liveOnly');
    expect(text).not.toContain('secret-live-value');
    expect(text).not.toContain('Syncing live props');
  });

  it('shows server import nodes as static-only instead of live prop panels', () => {
    const entry = makeEntry({
      symbolId: 'symbol:src/app/_components/ServerPanel.tsx#ServerPanel',
      name: 'ServerPanel',
      filePath: 'src/app/_components/ServerPanel.tsx',
      executionKind: 'static',
      ownershipKind: 'STATIC-DOM',
      source: 'static-import',
    });

    const container = renderWorkspaceDetail({
      entry,
      route: null,
      liveProps: { liveOnly: 'secret-live-value' },
    });
    const text = container.textContent ?? '';

    expect(text).toContain('Runtime Data');
    expect(text).toContain('Static DOM owner. Live props are not available');
    expect(text).not.toContain('liveOnly');
    expect(text).not.toContain('secret-live-value');
    expect(text).not.toContain('Syncing live props');
    expect(text).not.toContain('No props.');
  });

  it('explains declared-only static candidates without pretending they were picked from DOM', () => {
    const entry = makeEntry({
      symbolId: 'static:src/app/_components/ServerPanel.tsx#ServerPanel',
      name: 'ServerPanel',
      filePath: 'src/app/_components/ServerPanel.tsx',
      executionKind: 'static',
      ownershipKind: 'STATIC-DECLARED',
      source: 'static-import',
    });

    const container = renderWorkspaceDetail({
      entry,
      route: null,
      liveProps: { liveOnly: 'secret-live-value' },
    });
    const text = container.textContent ?? '';

    expect(text).toContain('Static declaration candidate');
    expect(text).toContain('was not directly observed in the current DOM');
    expect(text).not.toContain('liveOnly');
  });
});
