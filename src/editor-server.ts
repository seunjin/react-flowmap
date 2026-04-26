import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import { getEditorCommand, normalizeKnownEditorId } from './editor.js';

export type ProjectFileResolution =
  | { ok: true; absPath: string }
  | { ok: false; error: 'missing file' | 'outside project root' };

function isPathInsideRoot(rootAbsPath: string, targetAbsPath: string): boolean {
  const relPath = relative(rootAbsPath, targetAbsPath);
  return relPath === '' || (!relPath.startsWith('..') && !isAbsolute(relPath));
}

export function resolveProjectFile(root: string, file: string | null): ProjectFileResolution {
  if (!file) return { ok: false, error: 'missing file' };

  const rootAbsPath = resolve(root);
  const requestedAbsPath = resolve(rootAbsPath, file);

  if (existsSync(requestedAbsPath)) {
    const rootRealPath = realpathSync.native(rootAbsPath);
    const requestedRealPath = realpathSync.native(requestedAbsPath);
    if (!isPathInsideRoot(rootRealPath, requestedRealPath)) {
      return { ok: false, error: 'outside project root' };
    }

    return { ok: true, absPath: requestedAbsPath };
  }

  if (!isPathInsideRoot(rootAbsPath, requestedAbsPath)) {
    return { ok: false, error: 'outside project root' };
  }

  return { ok: true, absPath: requestedAbsPath };
}

export function resolveEditorCommandFromRequest(
  editorParam: string | null,
  projectEditorCommand: string,
): string {
  const selected = normalizeKnownEditorId(editorParam);
  return selected ? getEditorCommand(selected) : projectEditorCommand;
}
