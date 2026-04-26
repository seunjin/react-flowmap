import { describe, expect, it } from 'vitest';

import { transformFlowmap, transformStaticOwnerMarks } from '../../packages/babel-plugin/src/index';

const OPTS = { relPath: 'src/app.tsx' };

describe('transformFlowmap', () => {
  it('returns null for non-JSX files', () => {
    expect(transformFlowmap('const x = 1;', 'src/util.ts', OPTS)).toBeNull();
  });

  it('returns null for node_modules', () => {
    const code = 'export function Foo() { return <div />; }';
    expect(transformFlowmap(code, 'node_modules/lib/Foo.tsx', OPTS)).toBeNull();
  });

  it('returns null when no uppercase components are found', () => {
    const code = 'export function helper() { return null; }';
    expect(transformFlowmap(code, 'src/util.tsx', OPTS)).toBeNull();
  });

  it('injects __RfmCtx imports and Provider wrapping', () => {
    const code = `
export function App() {
  return <div />;
}
`.trim();
    const result = transformFlowmap(code, 'src/app.tsx', OPTS);
    expect(result).not.toBeNull();
    expect(result!.code).toContain('__RfmCtx');
    expect(result!.code).toContain('__useRfmRecord');
    expect(result!.code).toContain('__RfmCtx.Provider');
  });

  it('adds runtime owner markers to component host roots', () => {
    const code = `
export function UserCard() {
  return <article />;
}
`.trim();
    const result = transformFlowmap(code, 'src/user-card.tsx', {
      relPath: 'src/user-card.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain(
      'data-rfm-owner="symbol:src/user-card.tsx#UserCard"',
    );
    expect(result!.code).toContain('__RfmCtx.Provider');
  });

  it('records symbolId and line in symbolLocs', () => {
    const code = `
export function UserMenu() {
  return <div />;
}
`.trim();
    const result = transformFlowmap(code, 'src/user-menu.tsx', {
      relPath: 'src/user-menu.tsx',
    });
    expect(result).not.toBeNull();
    expect(result!.symbolLocs.has('symbol:src/user-menu.tsx#UserMenu')).toBe(true);
  });

  it('detects relative-import JSX children in staticJsxMap', () => {
    const code = `
import Avatar from './avatar';
import { Button } from './button';
import { formatDate } from '../utils';

export function UserMenu() {
  return (
    <div>
      <Avatar />
      <Button />
    </div>
  );
}
`.trim();
    const result = transformFlowmap(code, 'src/user-menu.tsx', {
      relPath: 'src/user-menu.tsx',
    });
    expect(result).not.toBeNull();
    const children = result!.staticJsxMap.get('symbol:src/user-menu.tsx#UserMenu');
    expect(children).toEqual(['Avatar', 'Button']);
  });

  it('excludes non-relative imports from staticJsxMap', () => {
    const code = `
import { Icon } from 'lucide-react';
import Avatar from './avatar';

export function Header() {
  return <div><Icon /><Avatar /></div>;
}
`.trim();
    const result = transformFlowmap(code, 'src/header.tsx', {
      relPath: 'src/header.tsx',
    });
    expect(result).not.toBeNull();
    const children = result!.staticJsxMap.get('symbol:src/header.tsx#Header');
    // Icon comes from 'lucide-react' (non-relative), Avatar from './avatar' (relative)
    expect(children).toEqual(['Avatar']);
  });

  it('does not add to staticJsxMap when no relative-import JSX children', () => {
    const code = `
import { Icon } from 'lucide-react';

export function Standalone() {
  return <div><Icon /></div>;
}
`.trim();
    const result = transformFlowmap(code, 'src/standalone.tsx', {
      relPath: 'src/standalone.tsx',
    });
    expect(result).not.toBeNull();
    expect(result!.staticJsxMap.has('symbol:src/standalone.tsx#Standalone')).toBe(false);
  });

  it('handles arrow function components', () => {
    const code = `
import Card from './card';

export const ProductList = () => {
  return <Card />;
};
`.trim();
    const result = transformFlowmap(code, 'src/product-list.tsx', {
      relPath: 'src/product-list.tsx',
    });
    expect(result).not.toBeNull();
    const children = result!.staticJsxMap.get('symbol:src/product-list.tsx#ProductList');
    expect(children).toEqual(['Card']);
  });

  it('extracts react-router route manifest entries from nested Route JSX', () => {
    const code = `
import { Route, Routes } from 'react-router-dom';
import { App } from './app';
import { HomePage } from './pages/home-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<HomePage />} />
      </Route>
    </Routes>
  );
}
`.trim();

    const result = transformFlowmap(code, 'src/router.tsx', {
      relPath: 'src/router.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.routeManifestEntries).toEqual([
      {
        id: 'route:src/router.tsx:8:App',
        router: 'react-router',
        urlPath: '/',
        type: 'layout',
        componentName: 'App',
        componentImportSource: './app',
        line: 8,
      },
      {
        id: 'route:src/router.tsx:9:HomePage',
        router: 'react-router',
        urlPath: '/',
        type: 'page',
        componentName: 'HomePage',
        componentImportSource: './pages/home-page',
        line: 9,
      },
    ]);
  });

  it('extracts tanstack route manifest entries from createRoute calls', () => {
    const code = `
import { createRootRoute, createRoute } from '@tanstack/react-router';
import { App } from './app';
import { HomePage } from './pages/home-page';

const rootRoute = createRootRoute({ component: App });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});
`.trim();

    const result = transformFlowmap(code, 'src/router.tsx', {
      relPath: 'src/router.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.routeManifestEntries).toEqual([
      {
        id: 'route:src/router.tsx#rootRoute',
        router: 'tanstack-router',
        urlPath: '/',
        type: 'layout',
        componentName: 'App',
        componentImportSource: './app',
        line: 5,
      },
      {
        id: 'route:src/router.tsx#homeRoute',
        router: 'tanstack-router',
        urlPath: '/',
        type: 'page',
        componentName: 'HomePage',
        componentImportSource: './pages/home-page',
        line: 7,
      },
    ]);
  });

  it('excludes library internal paths by default', () => {
    const code = 'export function Inspector() { return <div />; }';
    expect(transformFlowmap(code, '/project/src/ui/inspector/Inspector.tsx', OPTS)).toBeNull();
    expect(transformFlowmap(code, '/project/src/ui/graph-window/GraphWindow.tsx', OPTS)).toBeNull();
  });

  it('respects custom exclude patterns', () => {
    const code = 'export function Storybook() { return <div />; }';
    const result = transformFlowmap(code, 'src/storybook.tsx', {
      relPath: 'src/storybook.tsx',
      exclude: [/storybook/],
    });
    expect(result).toBeNull();
  });
});

describe('transformStaticOwnerMarks', () => {
  it('adds a static owner marker to server component host roots without runtime imports', () => {
    const code = `
export function ServerOverview() {
  return <section><h2>Overview</h2></section>;
}
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/app/_components/ServerOverview.tsx', {
      relPath: 'src/app/_components/ServerOverview.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain(
      'data-rfm-static-owner="src/app/_components/ServerOverview.tsx#ServerOverview"',
    );
    expect(result!.code).not.toContain('__RfmCtx');
  });

  it('adds markers to arrow function expression roots', () => {
    const code = `
export const ServerWorkflow = () => <section>Workflow</section>;
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/app/_components/ServerWorkflow.tsx', {
      relPath: 'src/app/_components/ServerWorkflow.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain(
      'data-rfm-static-owner="src/app/_components/ServerWorkflow.tsx#ServerWorkflow"',
    );
  });

  it('falls back to host descendants when a server component returns a component wrapper', () => {
    const code = `
import { CardShell } from './CardShell';

export function PostCard() {
  return (
    <CardShell>
      <article>Post</article>
    </CardShell>
  );
}
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/components/post-card.tsx', {
      relPath: 'src/components/post-card.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain(
      'data-rfm-static-owner="src/components/post-card.tsx#PostCard"',
    );
  });

  it('marks Next Link roots directly because Link forwards DOM attributes to the anchor', () => {
    const code = `
import Link from 'next/link';

export function PostCard() {
  return (
    <Link href="/posts/hello">
      <div>Thumb</div>
      <div>Text</div>
    </Link>
  );
}
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/components/post-card.tsx', {
      relPath: 'src/components/post-card.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('<Link href="/posts/hello" data-rfm-static-owner="src/components/post-card.tsx#PostCard">');
    expect(result!.code.match(/data-rfm-static-owner="src\/components\/post-card\.tsx#PostCard"/g)).toHaveLength(1);
  });

  it('adds static owner markers to nested server component roots in the same file', () => {
    const code = `
export function PostCard() {
  return <article>Post</article>;
}

export function PostList() {
  return (
    <section>
      <PostCard />
    </section>
  );
}
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/app/_components/posts.tsx', {
      relPath: 'src/app/_components/posts.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain(
      'data-rfm-static-owner="src/app/_components/posts.tsx#PostCard"',
    );
    expect(result!.code).toContain(
      'data-rfm-static-owner="src/app/_components/posts.tsx#PostList"',
    );
  });

  it('does not mark component-only roots because they do not own a host DOM box', () => {
    const code = `
import { ClientCard } from './ClientCard';

export function ServerShell() {
  return <ClientCard />;
}
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/app/_components/ServerShell.tsx', {
      relPath: 'src/app/_components/ServerShell.tsx',
    });

    expect(result).toBeNull();
  });

  it('injects an early graph window guard into root html returns', () => {
    const code = `
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
`.trim();
    const result = transformStaticOwnerMarks(code, 'src/app/layout.tsx', {
      relPath: 'src/app/layout.tsx',
    });

    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-rfm-graph-window-guard-script');
    expect(result!.code).toContain('data-rfm-graph-window-guard');
    expect(result!.code).toContain("location.search).get('__rfm')!=='graph'");
    expect(result!.code).toContain('data-rfm-static-owner="src/app/layout.tsx#RootLayout"');
  });
});
