import { describe, expect, it } from 'vitest';

import { transformFlowmap } from '../../packages/babel-plugin/src/index';

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
