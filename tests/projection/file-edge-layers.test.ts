import { describe, expect, it } from 'vitest';

import { projectToFileEdgeLayers } from '../../src/core/projection/project-to-file-edge-layers';
import type { SelectionState } from '../../src/core/types/selection';
import { requestUserFlow } from '../fixtures/request-user-flow';

describe('projectToFileEdgeLayers', () => {
  it('projects outgoing runtime layers into file edge layers', () => {
    const selection: SelectionState = {
      selectedSymbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'outgoing',
      hop: 3,
    };

    expect(projectToFileEdgeLayers(requestUserFlow, selection)).toEqual([
      {
        hop: 1,
        edges: [
          {
            id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
            sourceFileId: 'file:src/pages/user-page.tsx',
            targetFileId: 'file:src/hooks/use-user.ts',
            relationTypes: ['use'],
            supportingEdges: [
              'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
            ],
          },
        ],
      },
      {
        hop: 2,
        edges: [
          {
            id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
            sourceFileId: 'file:src/hooks/use-user.ts',
            targetFileId: 'file:src/api/user.ts',
            relationTypes: ['call'],
            supportingEdges: [
              'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
            ],
          },
        ],
      },
      {
        hop: 3,
        edges: [
          {
            id: 'file-edge:file:src/api/user.ts->api:GET:/api/user',
            sourceFileId: 'file:src/api/user.ts',
            targetFileId: 'api:GET:/api/user',
            relationTypes: ['request'],
            supportingEdges: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
          },
        ],
      },
    ]);
  });

  it('returns no layers when nothing is selected', () => {
    const selection: SelectionState = {
      selectedSymbolIds: [],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'both',
      hop: 3,
    };

    expect(projectToFileEdgeLayers(requestUserFlow, selection)).toEqual([]);
  });
});
