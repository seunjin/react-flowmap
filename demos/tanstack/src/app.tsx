import { useEffect, useRef } from 'react';
import { Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ReactFlowMap } from 'react-flowmap';
import './app/styles/globals.css';

// ─── Mock API ────────────────────────────────────────────────────────────────

const registeredIds = new Set<string>();

function installMockApi() {
  const original = globalThis.fetch;

  const mock: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string' ? new URL(input, 'http://localhost')
      : input instanceof URL ? input
      : new URL((input as Request).url);
    const method = (init?.method ?? 'GET').toUpperCase();

    const checkIdMatch = url.pathname.match(/^\/users\/check-id\/(.+)$/);
    if (checkIdMatch && method === 'GET') {
      const userId = decodeURIComponent(checkIdMatch[1]!);
      return new Response(
        JSON.stringify({ code: 200, data: { available: !registeredIds.has(userId), userId } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.pathname === '/signup' && method === 'POST') {
      const body = JSON.parse(init?.body as string ?? '{}') as { userId: string };
      if (registeredIds.has(body.userId)) {
        return new Response(
          JSON.stringify({ code: 500, message: '이미 사용 중인 아이디입니다.' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      registeredIds.add(body.userId);
      return new Response(
        JSON.stringify({ code: 200, data: { userId: body.userId }, message: '회원가입이 완료되었습니다.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return original(input, init);
  };

  globalThis.fetch = mock;
  return () => { globalThis.fetch = original; };
}

// ─── QueryClient ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const uninstallRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    uninstallRef.current = installMockApi();
    return () => { uninstallRef.current?.(); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" />
      <ReactFlowMap />
    </QueryClientProvider>
  );
}
