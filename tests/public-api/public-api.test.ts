import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';
import * as publicApi from '../../src/index';
import * as nextApi from '../../src/next-plugin/index';
import * as viteApi from '../../src/vite-plugin/index';

describe('public package API', () => {
  it('keeps the package subpath export map explicit', () => {
    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './graph-window',
      './next',
      './rfm-context',
      './vite',
    ]);

    expect(packageJson.exports).not.toHaveProperty('./babel-plugin');
    expect(packageJson.exports).not.toHaveProperty('./editor-server');
  });

  it('keeps package subpaths resolvable for config loaders that use default conditions', () => {
    for (const [subpath, entry] of Object.entries(packageJson.exports)) {
      expect(entry.default, subpath).toBe(entry.import);
    }
  });

  it('exposes the primary app integration API from the root package', () => {
    expect(typeof publicApi.ReactFlowMap).toBe('function');
  });

  it('keeps inspector implementation components out of the root package API', () => {
    expect(publicApi).not.toHaveProperty('ComponentOverlay');
    expect(publicApi).not.toHaveProperty('InspectButton');
    expect(publicApi).not.toHaveProperty('EntryDetail');
  });

  it('exposes advanced graph/runtime/doc helpers from the root package', () => {
    expect(typeof publicApi.createFileId).toBe('function');
    expect(typeof publicApi.createSymbolId).toBe('function');
    expect(typeof publicApi.createApiId).toBe('function');
    expect(typeof publicApi.buildGraph).toBe('function');
    expect(typeof publicApi.InMemoryGraphStore).toBe('function');
    expect(typeof publicApi.RuntimeCollector).toBe('function');
    expect(typeof publicApi.RuntimeSession).toBe('function');
    expect(typeof publicApi.buildDocIndex).toBe('function');
  });

  it('exposes framework plugin entrypoints from their subpaths', () => {
    expect(typeof viteApi.flowmapInspect).toBe('function');
    expect(typeof nextApi.withFlowmap).toBe('function');
    expect(typeof nextApi.openInEditor).toBe('function');
  });
});
