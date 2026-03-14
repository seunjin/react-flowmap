import type { RuntimeEvent } from '../../src/core/types/runtime-events';

export const requestUserFlowEvents: RuntimeEvent[] = [
  {
    id: 'evt-render-user-page',
    eventType: 'render',
    timestamp: 1,
    targetSymbolId: 'symbol:src/pages/user-page.tsx#UserPage',
    fileId: 'file:src/pages/user-page.tsx',
  },
  {
    id: 'evt-use-user',
    eventType: 'use',
    timestamp: 2,
    sourceSymbolId: 'symbol:src/pages/user-page.tsx#UserPage',
    targetSymbolId: 'symbol:src/hooks/use-user.ts#useUser',
  },
  {
    id: 'evt-call-fetch-user',
    eventType: 'call',
    timestamp: 3,
    sourceSymbolId: 'symbol:src/hooks/use-user.ts#useUser',
    targetSymbolId: 'symbol:src/api/user.ts#fetchUser',
  },
  {
    id: 'evt-request-user',
    eventType: 'request',
    timestamp: 4,
    sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
    method: 'GET',
    path: '/api/user',
  },
];
