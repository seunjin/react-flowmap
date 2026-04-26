import { createContext, useContext, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ReactFlowMap } from 'react-flowmap';
import { DemoHeader } from './widgets/demo-ui';

type AppContextValue = { onCartUpdated: () => void };

const AppCtx = createContext<AppContextValue>({ onCartUpdated: () => {} });

export const useAppContext = () => useContext(AppCtx);

const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { margin: 0; min-height: 100%; width: 100%; }
  body {
    background: #f4f7fb;
    color: #111827;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  button, input { font: inherit; }
`;

function installDemoApi() {
  const originalFetch = globalThis.fetch;
  let sequence = 40;

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
          framework: url.searchParams.get('framework') ?? 'Vite React',
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

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = globalStyle;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => {
      el.remove();
    };
  }, []);

  useEffect(() => installDemoApi(), []);

  const activeRoute = location.pathname.startsWith('/reports') ? 'reports' : 'dashboard';

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <DemoHeader
        activeRoute={activeRoute}
        frameworkLabel="Vite React"
        onNavigate={(path) => navigate(path)}
      />
      <main style={{ width: 'min(1120px, calc(100vw - 32px))', margin: '0 auto', padding: '34px 0 72px' }}>
        <AppCtx.Provider value={{ onCartUpdated: () => {} }}>
          <Outlet />
        </AppCtx.Provider>
      </main>
      <ReactFlowMap />
    </div>
  );
}
