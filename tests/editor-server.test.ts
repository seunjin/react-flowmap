import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveEditorCommandFromRequest,
  resolveProjectFile,
} from '../src/editor-server';

const tempRoots: string[] = [];

function makeTempRoot(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('resolveProjectFile', () => {
  it('resolves a relative file inside the project root', () => {
    const root = makeTempRoot('rfm-root-');
    mkdirSync(join(root, 'src'));
    const filePath = join(root, 'src/app.tsx');
    writeFileSync(filePath, '');

    expect(resolveProjectFile(root, 'src/app.tsx')).toEqual({
      ok: true,
      absPath: filePath,
    });
  });

  it('resolves an absolute file inside the project root', () => {
    const root = makeTempRoot('rfm-root-');
    mkdirSync(join(root, 'src'));
    const filePath = join(root, 'src/app.tsx');
    writeFileSync(filePath, '');

    expect(resolveProjectFile(root, filePath)).toEqual({
      ok: true,
      absPath: filePath,
    });
  });

  it('rejects a relative path outside the project root', () => {
    const root = makeTempRoot('rfm-root-');

    expect(resolveProjectFile(root, '../outside.tsx')).toEqual({
      ok: false,
      error: 'outside project root',
    });
  });

  it('rejects an absolute path outside the project root', () => {
    const root = makeTempRoot('rfm-root-');
    const outside = resolve(tmpdir(), 'rfm-outside.tsx');

    expect(resolveProjectFile(root, outside)).toEqual({
      ok: false,
      error: 'outside project root',
    });
  });

  it('rejects an existing symlink that escapes the project root', () => {
    const root = makeTempRoot('rfm-root-');
    const outside = makeTempRoot('rfm-outside-');
    const outsideFile = join(outside, 'secret.tsx');
    const linkPath = join(root, 'linked.tsx');
    writeFileSync(outsideFile, '');
    symlinkSync(outsideFile, linkPath);

    expect(resolveProjectFile(root, 'linked.tsx')).toEqual({
      ok: false,
      error: 'outside project root',
    });
  });

  it('allows an existing file inside a symlinked project root', () => {
    const realRoot = makeTempRoot('rfm-real-root-');
    const linkParent = makeTempRoot('rfm-link-parent-');
    const linkRoot = join(linkParent, 'project');
    mkdirSync(join(realRoot, 'src'));
    const filePath = join(realRoot, 'src/app.tsx');
    writeFileSync(filePath, '');
    symlinkSync(realRoot, linkRoot, 'dir');

    expect(resolveProjectFile(linkRoot, filePath)).toEqual({
      ok: true,
      absPath: filePath,
    });
  });

  it('rejects a missing file parameter', () => {
    const root = makeTempRoot('rfm-root-');

    expect(resolveProjectFile(root, null)).toEqual({
      ok: false,
      error: 'missing file',
    });
  });
});

describe('resolveEditorCommandFromRequest', () => {
  it('uses a known editor selected by the browser', () => {
    expect(resolveEditorCommandFromRequest('cursor', 'code')).toBe('cursor');
  });

  it('normalizes known editor binary paths', () => {
    expect(resolveEditorCommandFromRequest('/usr/local/bin/code', 'cursor')).toBe('code');
  });

  it('falls back to the project editor for unknown request values', () => {
    expect(resolveEditorCommandFromRequest('unknown-editor', 'custom-editor')).toBe('custom-editor');
  });

  it('does not treat an arbitrary request value as a shell command', () => {
    expect(resolveEditorCommandFromRequest('code" --bad', 'cursor')).toBe('cursor');
  });
});
