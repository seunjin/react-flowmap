import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { scanAppDirectory } from '../../src/next-plugin/scan-app-dir';

const tempRoots: string[] = [];

function makeTempProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'rfm-next-scan-'));
  tempRoots.push(root);
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        baseUrl: '.',
      },
      include: ['src'],
    }),
  );
  return root;
}

function writeProjectFile(root: string, relativePath: string, source: string): void {
  const absPath = join(root, relativePath);
  mkdirSync(join(absPath, '..'), { recursive: true });
  writeFileSync(absPath, source);
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe('scanAppDirectory', () => {
  it('normalizes route groups and dynamic segments into route metadata', () => {
    const root = makeTempProject();
    writeProjectFile(
      root,
      'src/app/(marketing)/blog/[slug]/page.tsx',
      `
type BlogPageProps = {
  params: { slug: string };
  preview?: boolean;
};

export default function BlogPage({ params, preview }: BlogPageProps) {
  return <main>{params.slug}{preview}</main>;
}
`.trim(),
    );

    expect(scanAppDirectory(root)).toEqual([
      {
        router: 'next',
        urlPath: '/blog/[slug]',
        filePath: 'src/app/(marketing)/blog/[slug]/page.tsx',
        type: 'page',
        componentName: 'BlogPage',
        nodeKind: 'route',
        executionKind: 'static',
        isServer: true,
        propTypes: {
          params: { type: '{ slug: string; }', optional: false },
          preview: { type: 'boolean', optional: true },
        },
      },
    ]);
  });

  it('ignores private app folders as routes', () => {
    const root = makeTempProject();
    writeProjectFile(
      root,
      'src/app/page.tsx',
      'export default function HomePage() { return <main />; }',
    );
    writeProjectFile(
      root,
      'src/app/_private/page.tsx',
      'export default function PrivatePage() { return <main />; }',
    );

    expect(scanAppDirectory(root).map((route) => route.filePath)).toEqual([
      'src/app/page.tsx',
    ]);
  });

  it('builds a server import tree and stops at client boundaries', () => {
    const root = makeTempProject();
    writeProjectFile(
      root,
      'src/app/page.tsx',
      `
import ServerPanel from './_components/ServerPanel';

export default function DashboardPage() {
  return <ServerPanel />;
}
`.trim(),
    );
    writeProjectFile(
      root,
      'src/app/_components/ServerPanel.tsx',
      `
import ClientCard from './ClientCard';

export default function ServerPanel() {
  return <section><ClientCard /></section>;
}
`.trim(),
    );
    writeProjectFile(
      root,
      'src/app/_components/ClientCard.tsx',
      `
'use client';

import ClientLeaf from './ClientLeaf';

export default function ClientCard() {
  return <ClientLeaf />;
}
`.trim(),
    );
    writeProjectFile(
      root,
      'src/app/_components/ClientLeaf.tsx',
      `
'use client';

export default function ClientLeaf() {
  return <span />;
}
`.trim(),
    );

    expect(scanAppDirectory(root)).toEqual([
      {
        router: 'next',
        urlPath: '/',
        filePath: 'src/app/page.tsx',
        type: 'page',
        componentName: 'DashboardPage',
        nodeKind: 'route',
        executionKind: 'static',
        isServer: true,
        children: [
          {
            filePath: 'src/app/_components/ServerPanel.tsx',
            componentName: 'ServerPanel',
            nodeKind: 'server-component',
            executionKind: 'static',
            isServer: true,
            children: [
              {
                filePath: 'src/app/_components/ClientCard.tsx',
                componentName: 'ClientCard',
                nodeKind: 'client-boundary',
                executionKind: 'live',
                isServer: false,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('uses named import specifiers for client boundary names', () => {
    const root = makeTempProject();
    writeProjectFile(
      root,
      'src/app/page.tsx',
      `
import { Header as SiteHeader } from './_components/header';

export default function HomePage() {
  return <SiteHeader />;
}
`.trim(),
    );
    writeProjectFile(
      root,
      'src/app/_components/header.tsx',
      `
'use client';

export function Header() {
  return <header />;
}
`.trim(),
    );

    expect(scanAppDirectory(root)[0]?.children).toEqual([
      {
        filePath: 'src/app/_components/header.tsx',
        componentName: 'Header',
        nodeKind: 'client-boundary',
        executionKind: 'live',
        isServer: false,
      },
    ]);
  });
});
