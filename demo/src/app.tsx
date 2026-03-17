import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';

// ─── App Context (root → children) ───────────────────────────────────────────
type AppContextValue = { onCartUpdated: () => void };
const AppCtx = createContext<AppContextValue>({ onCartUpdated: () => {} });
export const useAppContext = () => useContext(AppCtx);

import { buildGraph, type FlowmapGraph, attachFetchInterceptor, ComponentOverlay } from 'react-flowmap';
import type { RuntimeEvent } from 'react-flowmap';
import { NotificationToast } from './features/notification-toast';
import { UserMenu } from './entities/user/user-menu';
import { demoCollector, demoRuntimeSession } from './rfm-runtime';
import type { Product, CartItem, User } from './shared/types';

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const TOP_BAR_H = 52;
const emptyGraph: FlowmapGraph = { nodes: [], edges: [] };

const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; scrollbar-width: none; }
  *::-webkit-scrollbar { display: none; }
  html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; }
  @keyframes rfm-spin { to { transform: rotate(360deg); } }
  @keyframes rfm-fadein { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: '무선 노이즈캔슬링 헤드폰', price: 79000, originalPrice: 129000, category: 'Electronics', badge: 'sale', emoji: '🎧', description: '최고급 ANC 기술로 주변 소음을 차단하고 몰입감 있는 음악 경험을 제공합니다.', rating: { score: 4.5, count: 2341 } },
  { id: '2', name: '기계식 키보드 TKL', price: 149000, category: 'Electronics', badge: 'new', emoji: '⌨️', description: '체리 MX 스위치 탑재, 컴팩트한 TKL 레이아웃으로 책상 공간을 효율적으로 사용하세요.', rating: { score: 4.8, count: 892 } },
  { id: '3', name: '코튼 베이직 티셔츠', price: 29000, category: 'Clothing', emoji: '👕', description: '100% 유기농 면으로 제작된 부드럽고 편안한 베이직 티셔츠입니다.', rating: { score: 4.2, count: 5127 } },
  { id: '4', name: '러닝화 에어쿠션', price: 89000, originalPrice: 110000, category: 'Sports', badge: 'sale', emoji: '👟', description: '경량 에어쿠션 밑창으로 장거리 러닝에도 피로감을 최소화합니다.', rating: { score: 4.6, count: 1803 } },
  { id: '5', name: '더블월 보온 텀블러', price: 34000, category: 'Kitchen', badge: 'hot', emoji: '☕', description: '12시간 보온, 24시간 보냉 기능의 스테인리스 더블월 진공 텀블러입니다.', rating: { score: 4.9, count: 3456 } },
  { id: '6', name: 'A5 무선 노트북', price: 12000, category: 'Stationery', emoji: '📓', description: '120g 고급 무지 용지, 실 제본 방식으로 완전히 펼쳐지는 노트북입니다.', rating: { score: 3.9, count: 412 } },
];

// ─── App (Root Layout) ────────────────────────────────────────────────────────
export function App() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  void events;
  const [graph, setGraph] = useState<FlowmapGraph>(emptyGraph);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [inspectMode, setInspectMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<string>('');

  const navigate = useNavigate();
  const routerState = useRouterState();
  const activePath = routerState.location.pathname;

  const styleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = globalStyle;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => { el.remove(); };
  }, []);

  // ── 런타임 + Mock API 초기화 ──────────────────────────────────────────────
  useEffect(() => {
    const originalFetch = globalThis.fetch;
    const cartItems: CartItem[] = [];
    let cartIdCounter = 1;

    const demoFetch: typeof fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? new URL(input, 'http://localhost')
          : input instanceof URL
            ? input
            : new URL((input as Request).url);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.pathname === '/api/user' && method === 'GET') {
        return new Response(JSON.stringify({ id: '1', name: 'Flowmap User', email: 'user@react-flowmap.dev' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.pathname === '/api/products' && method === 'GET') {
        return new Response(JSON.stringify(MOCK_PRODUCTS), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      const productMatch = url.pathname.match(/^\/api\/products\/(.+)$/);
      if (productMatch && method === 'GET') {
        const product = MOCK_PRODUCTS.find(p => p.id === productMatch[1]);
        if (!product) return new Response('Not Found', { status: 404 });
        return new Response(JSON.stringify(product), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.pathname === '/api/cart' && method === 'GET') {
        return new Response(JSON.stringify(cartItems), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.pathname === '/api/cart' && method === 'POST') {
        const body = JSON.parse(init?.body as string ?? '{}') as { productId: string; quantity: number };
        const product = MOCK_PRODUCTS.find(p => p.id === body.productId);
        if (!product) return new Response('Not Found', { status: 404 });
        const existing = cartItems.find(c => c.productId === body.productId);
        if (existing) {
          existing.quantity += body.quantity;
          setCartCount(cartItems.reduce((s, c) => s + c.quantity, 0));
          return new Response(JSON.stringify(existing), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const newItem: CartItem = {
          id: String(cartIdCounter++),
          productId: product.id, name: product.name,
          price: product.price, quantity: body.quantity, emoji: product.emoji,
        };
        cartItems.push(newItem);
        setCartCount(cartItems.reduce((s, c) => s + c.quantity, 0));
        return new Response(JSON.stringify(newItem), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      const cartPutMatch = url.pathname.match(/^\/api\/cart\/(.+)$/);
      if (cartPutMatch && method === 'PUT') {
        const item = cartItems.find(c => c.id === cartPutMatch[1]);
        if (!item) return new Response('Not Found', { status: 404 });
        const body = JSON.parse(init?.body as string ?? '{}') as { quantity: number };
        item.quantity = body.quantity;
        setCartCount(cartItems.reduce((s, c) => s + c.quantity, 0));
        return new Response(JSON.stringify(item), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      const cartDelMatch = url.pathname.match(/^\/api\/cart\/(.+)$/);
      if (cartDelMatch && method === 'DELETE') {
        const idx = cartItems.findIndex(c => c.id === cartDelMatch[1]);
        if (idx !== -1) cartItems.splice(idx, 1);
        setCartCount(cartItems.reduce((s, c) => s + c.quantity, 0));
        return new Response(null, { status: 204 });
      }
      return originalFetch(input, init);
    };

    globalThis.fetch = demoFetch;
    demoCollector.reset();
    fetch('/api/user').then(r => r.json()).then(setUser as (v: unknown) => void);

    const detach = attachFetchInterceptor({
      collector: demoCollector,
      getContext: () => demoRuntimeSession.getContext(),
    });
    const unsub = demoCollector.subscribe((nextEvents: RuntimeEvent[]) => {
      setEvents(nextEvents);
      setGraph(buildGraph(nextEvents));
    });
    setRuntimeReady(true);

    return () => {
      setRuntimeReady(false);
      unsub();
      detach();
      globalThis.fetch = originalFetch;
      demoCollector.reset();
    };
  }, []);

  function handleCartUpdated() {
    setCartCount(c => c + 1);
    setToast('장바구니에 추가됐습니다');
  }

  const tabs = [
    { path: '/',      label: '홈'    },
    { path: '/cart',  label: `장바구니${cartCount > 0 ? ` (${cartCount})` : ''}` },
  ] as const;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
      background: '#f8fafc',
    }}>
      {/* ── 상단 바 ──────────────────────────────────────────────────── */}
      <div style={{
        height: TOP_BAR_H, minHeight: TOP_BAR_H,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', borderBottom: '1px solid #e2e8f0',
        background: '#ffffff', flexShrink: 0, gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff',
          }}>R</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Shop</span>
        </div>

        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {tabs.map(({ path, label }) => {
            const isActive = activePath === path || (path !== '/' && activePath.startsWith(path));
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate({ to: path })}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid',
                  borderColor: isActive ? '#3b82f6' : 'transparent',
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer', fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <UserMenu user={user} />
      </div>

      {/* ── 메인 ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 560, margin: '24px auto', padding: '0 16px 80px' }}>
          {runtimeReady && (
            <AppCtx.Provider value={{ onCartUpdated: handleCartUpdated }}>
              <Outlet />
            </AppCtx.Provider>
          )}
        </div>
      </div>

      {/* ── 오버레이 ───────────────────────────────────────────────── */}
      {toast && <NotificationToast message={toast} onDismiss={() => setToast('')} />}
      <ComponentOverlay
        graph={graph}
        active={inspectMode}
        onDeactivate={() => setInspectMode(false)}
        onToggle={() => setInspectMode(p => !p)}
      />
    </div>
  );
}
