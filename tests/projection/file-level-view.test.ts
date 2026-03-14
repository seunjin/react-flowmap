import { describe, expect, it } from 'vitest';

import { projectToFileLevelView } from '../../src/core/projection/project-to-file-level-view';
import type { SelectionState } from '../../src/core/types/selection';
import { requestUserFlow } from '../fixtures/request-user-flow';
import { sameFileCallFlow } from '../fixtures/same-file-call';

describe('projectToFileLevelView', () => {
  it('projects runtime edges into file-level edges with supporting edge metadata', () => {
    const view = projectToFileLevelView(requestUserFlow);

    expect(view.fileNodes).toHaveLength(3);
    expect(view.apiNodes).toHaveLength(1);
    expect(view.fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        sourceFileId: 'file:src/hooks/use-user.ts',
        targetFileId: 'file:src/api/user.ts',
        relationTypes: ['call'],
        supportingEdges: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
      },
      {
        id: 'file-edge:file:src/api/user.ts->api:GET:/api/user',
        sourceFileId: 'file:src/api/user.ts',
        targetFileId: 'api:GET:/api/user',
        relationTypes: ['request'],
        supportingEdges: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
      },
    ]);
  });

  it('does not leak same-file runtime relationships into file-level edges', () => {
    const view = projectToFileLevelView(sameFileCallFlow);

    expect(view.fileNodes).toHaveLength(1);
    expect(view.fileEdges).toEqual([]);
  });

  it('filters projected edges by selection mode using direct 1-hop symbol relationships', () => {
    const outgoingSelection: SelectionState = {
      selectedSymbolIds: ['symbol:src/hooks/use-user.ts#useUser'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'outgoing',
      hop: 1,
    };

    const incomingSelection: SelectionState = {
      selectedSymbolIds: ['symbol:src/hooks/use-user.ts#useUser'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'incoming',
      hop: 1,
    };

    const bothSelection: SelectionState = {
      selectedSymbolIds: ['symbol:src/hooks/use-user.ts#useUser'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'both',
      hop: 1,
    };

    expect(projectToFileLevelView(requestUserFlow, outgoingSelection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        sourceFileId: 'file:src/hooks/use-user.ts',
        targetFileId: 'file:src/api/user.ts',
        relationTypes: ['call'],
        supportingEdges: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
      },
    ]);

    expect(projectToFileLevelView(requestUserFlow, incomingSelection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
    ]);

    expect(projectToFileLevelView(requestUserFlow, bothSelection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        sourceFileId: 'file:src/hooks/use-user.ts',
        targetFileId: 'file:src/api/user.ts',
        relationTypes: ['call'],
        supportingEdges: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
      },
    ]);
  });

  it('expands outgoing selections across multiple hops', () => {
    const twoHopSelection: SelectionState = {
      selectedSymbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'outgoing',
      hop: 2,
    };

    const threeHopSelection: SelectionState = {
      selectedSymbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'outgoing',
      hop: 3,
    };

    expect(projectToFileLevelView(requestUserFlow, twoHopSelection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        sourceFileId: 'file:src/hooks/use-user.ts',
        targetFileId: 'file:src/api/user.ts',
        relationTypes: ['call'],
        supportingEdges: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
      },
    ]);

    expect(projectToFileLevelView(requestUserFlow, threeHopSelection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        sourceFileId: 'file:src/hooks/use-user.ts',
        targetFileId: 'file:src/api/user.ts',
        relationTypes: ['call'],
        supportingEdges: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
      },
      {
        id: 'file-edge:file:src/api/user.ts->api:GET:/api/user',
        sourceFileId: 'file:src/api/user.ts',
        targetFileId: 'api:GET:/api/user',
        relationTypes: ['request'],
        supportingEdges: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
      },
    ]);
  });

  it('expands incoming selections across multiple hops', () => {
    const twoHopSelection: SelectionState = {
      selectedSymbolIds: ['symbol:src/api/user.ts#fetchUser'],
      selectedEdgeKinds: ['render', 'use', 'call', 'request'],
      mode: 'incoming',
      hop: 2,
    };

    expect(projectToFileLevelView(requestUserFlow, twoHopSelection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
      {
        id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
        sourceFileId: 'file:src/hooks/use-user.ts',
        targetFileId: 'file:src/api/user.ts',
        relationTypes: ['call'],
        supportingEdges: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
      },
    ]);
  });

  it('filters projected edges by selected runtime edge kinds', () => {
    const selection: SelectionState = {
      selectedSymbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
      selectedEdgeKinds: ['use', 'request'],
      mode: 'outgoing',
      hop: 3,
    };

    expect(projectToFileLevelView(requestUserFlow, selection).fileEdges).toEqual([
      {
        id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
        sourceFileId: 'file:src/pages/user-page.tsx',
        targetFileId: 'file:src/hooks/use-user.ts',
        relationTypes: ['use'],
        supportingEdges: [
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
      },
      {
        id: 'file-edge:file:src/api/user.ts->api:GET:/api/user',
        sourceFileId: 'file:src/api/user.ts',
        targetFileId: 'api:GET:/api/user',
        relationTypes: ['request'],
        supportingEdges: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
      },
    ]);
  });
});
