import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ReactFlowMap } from 'react-flowmap';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <ReactFlowMap />
        <Scripts />
      </body>
    </html>
  );
}
