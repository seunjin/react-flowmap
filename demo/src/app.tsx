import type { FileLevelView } from '../../src/core/types/projection';

import { GoriCanvas } from '../../src/ui/canvas/gori-canvas';
import { UserPage } from './pages/user-page';

const demoView: FileLevelView = {
  fileNodes: [
    {
      id: 'file:demo/src/pages/user-page.tsx',
      kind: 'file',
      path: 'demo/src/pages/user-page.tsx',
      name: 'user-page.tsx',
      exports: [
        {
          symbolId: 'symbol:demo/src/pages/user-page.tsx#UserPage',
          name: 'UserPage',
          symbolType: 'component',
          exported: true,
        },
      ],
    },
    {
      id: 'file:demo/src/hooks/use-user.ts',
      kind: 'file',
      path: 'demo/src/hooks/use-user.ts',
      name: 'use-user.ts',
      exports: [
        {
          symbolId: 'symbol:demo/src/hooks/use-user.ts#useUser',
          name: 'useUser',
          symbolType: 'hook',
          exported: true,
        },
      ],
    },
    {
      id: 'file:demo/src/api/user.ts',
      kind: 'file',
      path: 'demo/src/api/user.ts',
      name: 'user.ts',
      exports: [
        {
          symbolId: 'symbol:demo/src/api/user.ts#fetchUser',
          name: 'fetchUser',
          symbolType: 'function',
          exported: true,
        },
      ],
    },
  ],
  apiNodes: [
    {
      id: 'api:GET:/api/user',
      kind: 'api',
      method: 'GET',
      path: '/api/user',
      label: 'GET /api/user',
    },
  ],
  fileEdges: [
    {
      id: 'file-edge:file:demo/src/pages/user-page.tsx->file:demo/src/hooks/use-user.ts',
      sourceFileId: 'file:demo/src/pages/user-page.tsx',
      targetFileId: 'file:demo/src/hooks/use-user.ts',
      relationTypes: ['use'],
      supportingEdges: [
        'use:symbol:demo/src/pages/user-page.tsx#UserPage->symbol:demo/src/hooks/use-user.ts#useUser',
      ],
    },
    {
      id: 'file-edge:file:demo/src/hooks/use-user.ts->file:demo/src/api/user.ts',
      sourceFileId: 'file:demo/src/hooks/use-user.ts',
      targetFileId: 'file:demo/src/api/user.ts',
      relationTypes: ['call'],
      supportingEdges: [
        'call:symbol:demo/src/hooks/use-user.ts#useUser->symbol:demo/src/api/user.ts#fetchUser',
      ],
    },
    {
      id: 'file-edge:file:demo/src/api/user.ts->api:GET:/api/user',
      sourceFileId: 'file:demo/src/api/user.ts',
      targetFileId: 'api:GET:/api/user',
      relationTypes: ['request'],
      supportingEdges: ['request:symbol:demo/src/api/user.ts#fetchUser->api:GET:/api/user'],
    },
  ],
};

export function App() {
  return (
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '2rem 1rem 4rem',
        display: 'grid',
        gap: '1.5rem',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0f172a',
        background:
          'radial-gradient(circle at top left, rgba(191,219,254,0.35), transparent 40%)',
      }}
    >
      <header>
        <p
          style={{
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#475569',
          }}
        >
          Gori Phase 0
        </p>
        <h1 style={{ margin: 0 }}>Runtime Graph Bootstrap</h1>
        <p style={{ maxWidth: 720, color: '#334155' }}>
          This demo keeps the initial repository alive while the collector, builder, and projection
          layers are still being implemented.
        </p>
      </header>

      <UserPage />
      <GoriCanvas view={demoView} />
    </main>
  );
}
