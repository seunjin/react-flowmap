import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { App } from './app';
import { HomePage } from './pages/home-page';
import { ProductPage } from './pages/product-page';
import { CartPage } from './pages/cart-page';

// ─── Routes ──────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: App,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const productRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/product/$productId',
  component: ProductPage,
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartPage,
});

const routeTree = rootRoute.addChildren([homeRoute, productRoute, cartRoute]);

// ─── Router ──────────────────────────────────────────────────────────────────
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
