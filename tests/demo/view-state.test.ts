import { describe, expect, it } from 'vitest';

import {
  decodeViewState,
  encodeViewState,
  sanitizeViewState,
  type DemoViewState,
} from '../../demo/src/view-state';

const fixture: DemoViewState = {
  activeTab: 'inspector',
  selection: {
    selectedFileId: 'file:src/pages/user-page.tsx',
    selectedSymbolIds: ['symbol:src/pages/user-page.tsx#UserPage'],
    selectedEdgeKinds: ['render', 'use', 'call'],
    mode: 'outgoing',
    hop: 2,
  },
  selectedFlowEdge: {
    edgeId: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
    labels: ['UserPage used useUser'],
    supportingEdgeIds: [
      'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
    ],
  },
};

describe('view state helpers', () => {
  it('round-trips an encoded view state', () => {
    const encoded = encodeViewState(fixture);
    expect(decodeViewState(encoded)).toEqual(fixture);
  });

  it('rejects malformed state payloads', () => {
    expect(
      sanitizeViewState({
        activeTab: 'unknown',
        selection: {
          selectedSymbolIds: [],
          selectedEdgeKinds: ['render'],
          mode: 'both',
          hop: 1,
        },
        selectedFlowEdge: null,
      })
    ).toBeNull();
  });
});
