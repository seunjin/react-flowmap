import { describe, expect, it } from 'vitest';

import { buildInspectorPayload } from '../../src/core/inspector/build-inspector-payload';
import type { SelectionState } from '../../src/core/types/selection';
import { requestUserFlow } from '../fixtures/request-user-flow';

describe('buildInspectorPayload', () => {
  it('builds relation summaries for the selected symbol and resolves its file', () => {
    const selection: SelectionState = {
      selectedSymbolIds: ['symbol:src/hooks/use-user.ts#useUser'],
      selectedFileId: 'file:src/hooks/use-user.ts',
      mode: 'both',
      hop: 1,
    };

    const payload = buildInspectorPayload(requestUserFlow, selection);

    expect(payload.file).toMatchObject({
      id: 'file:src/hooks/use-user.ts',
      kind: 'file',
    });
    expect(payload.selectedSymbols).toEqual([
      {
        id: 'symbol:src/hooks/use-user.ts#useUser',
        kind: 'symbol',
        fileId: 'file:src/hooks/use-user.ts',
        name: 'useUser',
        symbolType: 'hook',
        exported: true,
      },
    ]);
    expect(payload.relations).toEqual([
      {
        symbolId: 'symbol:src/hooks/use-user.ts#useUser',
        outgoingEdgeIds: [
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
        incomingEdgeIds: [
          'contains:file:src/hooks/use-user.ts->symbol:src/hooks/use-user.ts#useUser',
          'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
        ],
        requestEdgeIds: [],
        outgoingEdges: [
          {
            edgeId: 'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
            label: 'useUser --call--> fetchUser',
          },
        ],
        incomingEdges: [
          {
            edgeId: 'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
            label: 'UserPage --use--> useUser',
          },
        ],
        requestEdges: [],
      },
    ]);
  });

  it('captures request edges for selected request-producing symbols', () => {
    const selection: SelectionState = {
      selectedSymbolIds: ['symbol:src/api/user.ts#fetchUser'],
      mode: 'outgoing',
      hop: 1,
    };

    const payload = buildInspectorPayload(requestUserFlow, selection);

    expect(payload.file).toMatchObject({
      id: 'file:src/api/user.ts',
      kind: 'file',
    });
    expect(payload.relations).toEqual([
      {
        symbolId: 'symbol:src/api/user.ts#fetchUser',
        outgoingEdgeIds: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
        incomingEdgeIds: [
          'contains:file:src/api/user.ts->symbol:src/api/user.ts#fetchUser',
          'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
        ],
        requestEdgeIds: ['request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user'],
        outgoingEdges: [
          {
            edgeId: 'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
            label: 'fetchUser --request--> GET /api/user',
          },
        ],
        incomingEdges: [
          {
            edgeId: 'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
            label: 'useUser --call--> fetchUser',
          },
        ],
        requestEdges: [
          {
            edgeId: 'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
            label: 'fetchUser --request--> GET /api/user',
          },
        ],
      },
    ]);
  });
});
