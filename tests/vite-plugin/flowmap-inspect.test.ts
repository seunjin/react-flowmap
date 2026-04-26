import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Plugin, ResolvedConfig, TransformResult } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

import { flowmapInspect } from '../../src/vite-plugin/index';

const tempRoots: string[] = [];

type TransformHook = (
  code: string,
  id: string,
) => TransformResult | null | Promise<TransformResult | null>;

function makeTempProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'rfm-vite-plugin-'));
  tempRoots.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
      },
      include: ['src'],
    }),
  );
  return root;
}

function runConfigResolved(plugin: Plugin, config: Pick<ResolvedConfig, 'root' | 'command'>): void {
  const hook = plugin.configResolved;
  if (typeof hook !== 'function') {
    throw new Error('Expected configResolved hook to be a function.');
  }
  hook.call({} as ThisParameterType<typeof hook>, config as ResolvedConfig);
}

function getTransformHook(plugin: Plugin): TransformHook {
  const hook = plugin.transform;
  if (typeof hook === 'function') return hook as TransformHook;
  throw new Error('Expected transform hook to be a function.');
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe('flowmapInspect', () => {
  it('does not inject runtime or static owner markers during production builds', async () => {
    const root = makeTempProject();
    const filePath = join(root, 'src/app.tsx');
    const source = `
export function App() {
  return <main><h1>Dashboard</h1></main>;
}
`.trim();
    writeFileSync(filePath, source);

    const plugin = flowmapInspect();
    runConfigResolved(plugin, { root, command: 'build' });
    const result = await getTransformHook(plugin)(source, filePath);

    expect(result).toBeNull();
  });
});
