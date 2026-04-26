import { useEffect } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowMap } from 'react-flowmap';
import { DemoHeader } from '@/shared/demo-ui';
import './app/styles/globals.css';

function installDemoApi() {
  const originalFetch = globalThis.fetch;
  let sequence = 50;

  const demoFetch: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? new URL(input, 'http://localhost')
        : input instanceof URL
          ? input
          : new URL((input as Request).url);

    if (url.pathname === '/api/flowmap-summary') {
      sequence += 1;
      return new Response(
        JSON.stringify({
          sequence,
          framework: url.searchParams.get('framework') ?? 'TanStack Router',
          updatedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return originalFetch(input, init);
  };

  globalThis.fetch = demoFetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

export function App() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => installDemoApi(), []);

  const activeRoute = pathname.startsWith('/reports') ? 'reports' : 'dashboard';

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ minHeight: '100vh', background: '#f4f7fb' }}>
        <DemoHeader
          activeRoute={activeRoute}
          frameworkLabel="TanStack Router"
          onNavigate={(path) => { void navigate({ to: path }); }}
        />
        <main style={{ width: 'min(1120px, calc(100vw - 32px))', margin: '0 auto', padding: '34px 0 72px' }}>
          <Outlet />
        </main>
        <ReactFlowMap />
      </div>
    </QueryClientProvider>
  );
}
