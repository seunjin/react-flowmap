import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { App } from './app';
import { HomePage } from './pages/home/ui/home-page';
import { SignupPage } from './pages/signup/ui/signup-page';

const rootRoute = createRootRoute({ component: App });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
});

const routeTree = rootRoute.addChildren([homeRoute, signupRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}
