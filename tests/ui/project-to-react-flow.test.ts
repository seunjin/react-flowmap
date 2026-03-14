import { describe, expect, it } from 'vitest';

import { projectToFileEdgeLayers } from '../../src/core/projection/project-to-file-edge-layers';
import { projectToFileLevelView } from '../../src/core/projection/project-to-file-level-view';
import { projectToReactFlow } from '../../src/ui/react-flow/project-to-react-flow';
import type { FileLevelView } from '../../src/core/types/projection';
import type { SelectionState } from '../../src/core/types/selection';
import { requestUserFlow } from '../fixtures/request-user-flow';

describe('projectToReactFlow', () => {
  it('projects file level view into react flow compatible nodes and edges', () => {
    const selection: SelectionState = {
      selectedSymbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'outgoing',
      hop: 3,
    };
    const view = projectToFileLevelView(requestUserFlow, selection);
    const edgeLayers = projectToFileEdgeLayers(requestUserFlow, selection);
    const graph = projectToReactFlow(view, edgeLayers);

    expect(graph.nodes).toEqual([
      {
        id: 'file:src/pages/user-page.tsx',
        type: 'file',
        position: { x: 0, y: 0 },
        data: {
          kind: 'file',
          label: 'user-page.tsx',
          subtitle: 'src/pages/user-page.tsx',
          fileId: 'file:src/pages/user-page.tsx',
          symbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
          exports: [
            {
              symbolId: 'symbol:src/pages/user-page.tsx#UserPage',
              name: 'UserPage',
              symbolType: 'component',
              exported: true,
            },
          ],
          exportCount: 1,
        },
      },
      {
        id: 'file:src/hooks/use-user.ts',
        type: 'file',
        position: { x: 320, y: 0 },
        data: {
          kind: 'file',
          label: 'use-user.ts',
          subtitle: 'src/hooks/use-user.ts',
          fileId: 'file:src/hooks/use-user.ts',
          symbolIds: ['symbol:src/hooks/use-user.ts#useUser'],
          exports: [
            {
              symbolId: 'symbol:src/hooks/use-user.ts#useUser',
              name: 'useUser',
              symbolType: 'hook',
              exported: true,
            },
          ],
          exportCount: 1,
        },
      },
      {
        id: 'file:src/api/user.ts',
        type: 'file',
        position: { x: 640, y: 0 },
        data: {
          kind: 'file',
          label: 'user.ts',
          subtitle: 'src/api/user.ts',
          fileId: 'file:src/api/user.ts',
          symbolIds: ['symbol:src/api/user.ts#fetchUser'],
          exports: [
            {
              symbolId: 'symbol:src/api/user.ts#fetchUser',
              name: 'fetchUser',
              symbolType: 'function',
              exported: true,
            },
          ],
          exportCount: 1,
        },
      },
      {
        id: 'api:GET:/api/user',
        type: 'api',
        position: { x: 960, y: 0 },
        data: {
          kind: 'api',
          label: 'GET /api/user',
          subtitle: '/api/user',
        },
      },
    ]);

    expect(graph.edges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        source: 'file:src/pages/user-page.tsx',
        target: 'file:src/hooks/use-user.ts',
        type: 'fileRelation',
        label: 'use',
        data: {
          relationTypes: ['use'],
          supportingEdges: [
            'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
          ],
        },
      },
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        source: 'file:src/hooks/use-user.ts',
        target: 'file:src/api/user.ts',
        type: 'fileRelation',
        label: 'call',
        data: {
          relationTypes: ['call'],
          supportingEdges: [
            'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
          ],
        },
      },
      {
        id: 'file-edge:file:src/api/user.ts->api:GET:/api/user',
        source: 'file:src/api/user.ts',
        target: 'api:GET:/api/user',
        type: 'fileRelation',
        label: 'request',
        data: {
          relationTypes: ['request'],
          supportingEdges: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
        },
      },
    ]);
  });

  it('adds vertical spacing based on file node export height', () => {
    const view: FileLevelView = {
      fileNodes: [
        {
          id: 'file:src/files/a.ts',
          kind: 'file',
          path: 'src/files/a.ts',
          name: 'a.ts',
          exports: [
            {
              symbolId: 'symbol:src/files/a.ts#alpha',
              name: 'alpha',
              symbolType: 'function',
              exported: true,
            },
            {
              symbolId: 'symbol:src/files/a.ts#beta',
              name: 'beta',
              symbolType: 'function',
              exported: true,
            },
            {
              symbolId: 'symbol:src/files/a.ts#gamma',
              name: 'gamma',
              symbolType: 'function',
              exported: true,
            },
          ],
        },
        {
          id: 'file:src/files/b.ts',
          kind: 'file',
          path: 'src/files/b.ts',
          name: 'b.ts',
          exports: [
            {
              symbolId: 'symbol:src/files/b.ts#delta',
              name: 'delta',
              symbolType: 'function',
              exported: true,
            },
          ],
        },
      ],
      apiNodes: [],
      fileEdges: [],
    };

    const graph = projectToReactFlow(view);
    const firstNode = graph.nodes.find((node) => node.id === 'file:src/files/a.ts');
    const secondNode = graph.nodes.find((node) => node.id === 'file:src/files/b.ts');

    expect(firstNode?.position).toEqual({ x: 0, y: 0 });
    expect(secondNode?.position).toEqual({ x: 0, y: 340 });
  });
});
