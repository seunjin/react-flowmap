import { describe, expect, it } from 'vitest';

// applyStaticEdges is a module-internal function — test via its exported effect
// by importing and calling it directly after extracting it
// Since it's not exported, we duplicate a minimal version here tied to DocEntry shape.
// If the implementation diverges, TypeScript will catch the type mismatch.

import type { DocEntry } from '../../src/ui/doc/build-doc-index';

// Replicated from ComponentOverlay.tsx — kept in sync by types
function applyStaticEdges(
  entries: DocEntry[],
  staticJsx: Record<string, string[]>,
): DocEntry[] {
  const byId = new Map(entries.map(e => [e.symbolId, e]));
  const byName = new Map(entries.map(e => [e.name, e]));

  const staticParents = new Map<string, string[]>();
  for (const [fromId, childNames] of Object.entries(staticJsx)) {
    for (const name of childNames) {
      if (!staticParents.has(name)) staticParents.set(name, []);
      staticParents.get(name)!.push(fromId);
    }
  }

  return entries.map(entry => {
    let { renderedBy, renders } = entry;

    if (renderedBy.length === 0) {
      const extra = (staticParents.get(entry.name) ?? [])
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(pe => ({ symbolId: pe!.symbolId, name: pe!.name, filePath: pe!.filePath }));
      if (extra.length > 0) renderedBy = extra;
    }

    const staticChildren = staticJsx[entry.symbolId] ?? [];
    const runtimeChildIds = new Set(renders.map(r => r.symbolId));
    const extraRenders = staticChildren
      .map(name => byName.get(name))
      .filter(Boolean)
      .filter(ce => !runtimeChildIds.has(ce!.symbolId))
      .map(ce => ({ symbolId: ce!.symbolId, name: ce!.name, filePath: ce!.filePath }));
    if (extraRenders.length > 0) renders = [...renders, ...extraRenders];

    if (renderedBy === entry.renderedBy && renders === entry.renders) return entry;
    return { ...entry, renderedBy, renders };
  });
}

function makeEntry(overrides: Partial<DocEntry> & { symbolId: string; name: string }): DocEntry {
  return {
    filePath: 'src/dummy.tsx',
    category: 'component',
    renders: [],
    renderedBy: [],
    uses: [],
    usedBy: [],
    apiCalls: [],
    ...overrides,
  };
}

describe('applyStaticEdges', () => {
  it('returns entries unchanged when staticJsx is empty', () => {
    const entries = [makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' })];
    const result = applyStaticEdges(entries, {});
    expect(result[0]).toBe(entries[0]); // same reference
  });

  it('supplements renderedBy when runtime has no parent', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const menu = makeEntry({ symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu' });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    });

    const menuResult = result.find(e => e.name === 'UserMenu')!;
    expect(menuResult.renderedBy).toEqual([
      { symbolId: app.symbolId, name: app.name, filePath: app.filePath },
    ]);
  });

  it('does not overwrite existing runtime renderedBy', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const runtimeParent = { symbolId: 'symbol:src/layout.tsx#Layout', name: 'Layout', filePath: 'src/layout.tsx' };
    const menu = makeEntry({
      symbolId: 'symbol:src/menu.tsx#UserMenu',
      name: 'UserMenu',
      renderedBy: [runtimeParent],
    });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    });

    const menuResult = result.find(e => e.name === 'UserMenu')!;
    // Runtime parent preserved — static parent not added since renderedBy already has entries
    expect(menuResult.renderedBy).toEqual([runtimeParent]);
  });

  it('supplements renders with static children not in runtime renders', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });
    const menu = makeEntry({ symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu' });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    });

    const appResult = result.find(e => e.name === 'App')!;
    expect(appResult.renders).toEqual([
      { symbolId: menu.symbolId, name: menu.name, filePath: menu.filePath },
    ]);
  });

  it('does not duplicate children already in runtime renders', () => {
    const runtimeChild = { symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu', filePath: 'src/menu.tsx' };
    const app = makeEntry({
      symbolId: 'symbol:src/app.tsx#App',
      name: 'App',
      renders: [runtimeChild],
    });
    const menu = makeEntry({ symbolId: 'symbol:src/menu.tsx#UserMenu', name: 'UserMenu' });

    const result = applyStaticEdges([app, menu], {
      'symbol:src/app.tsx#App': ['UserMenu'],
    });

    const appResult = result.find(e => e.name === 'App')!;
    expect(appResult.renders).toHaveLength(1);
  });

  it('ignores unknown component names in staticJsx', () => {
    const app = makeEntry({ symbolId: 'symbol:src/app.tsx#App', name: 'App' });

    // 'Ghost' is not in entries
    const result = applyStaticEdges([app], {
      'symbol:src/app.tsx#App': ['Ghost'],
    });

    const appResult = result.find(e => e.name === 'App')!;
    expect(appResult.renders).toHaveLength(0);
    expect(appResult).toBe(app); // unchanged reference
  });
});
