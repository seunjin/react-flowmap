import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { App } from './app';
import { DashboardPage } from './pages/home/ui/home-page';
import { ReportsPage } from './pages/reports/ui/reports-page';

const rootRoute = createRootRoute({ component: App });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

const routeTree = rootRoute.addChildren([homeRoute, reportsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}
