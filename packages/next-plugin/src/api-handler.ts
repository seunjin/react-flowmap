/**
 * Next.js용 /__rfm-open API 핸들러
 *
 * App Router:  app/api/__rfm-open/route.ts
 * Pages Router: pages/api/__rfm-open.ts
 *
 * @example App Router
 * ```ts
 * // app/api/__rfm-open/route.ts
 * export { GET } from '@react-flowmap/next-plugin/api-handler';
 * ```
 *
 * @example Pages Router
 * ```ts
 * // pages/api/__rfm-open.ts
 * export { default } from '@react-flowmap/next-plugin/api-handler';
 * ```
 */

import { exec } from 'node:child_process';
import { resolve } from 'node:path';

const editorCmd =
  process.env['VITE_EDITOR'] ??
  process.env['RFM_EDITOR'] ??
  process.env['EDITOR'] ??
  'code';

function openInEditor(absPath: string, line: number, editor: string): void {
  const target = `${absPath}:${line}`;
  const vscodeFamily = ['code', 'cursor', 'antigravity', 'windsurf', 'codium', 'vscodium'];
  const isVscodeFamily = vscodeFamily.some(e => editor === e || editor.endsWith(`/${e}`));

  const cmd = isVscodeFamily
    ? `"${editor}" -g "${target}"`
    : editor === 'zed'
      ? `zed "${target}"`
      : `"${editor}" "${absPath}"`;

  const extraPaths = [
    `${process.env['HOME'] ?? ''}/.antigravity/antigravity/bin`,
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${process.env['HOME'] ?? ''}/.local/bin`,
  ].join(':');

  exec(cmd, { env: { ...process.env, PATH: `${extraPaths}:${process.env['PATH'] ?? ''}` } }, () => {});
}

// ─── App Router handler ────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  const line = parseInt(searchParams.get('line') ?? '1', 10) || 1;

  if (!file) {
    return Response.json({ ok: false, error: 'missing file' }, { status: 400 });
  }

  const absPath = resolve(process.cwd(), file);
  openInEditor(absPath, line, editorCmd);

  return Response.json({ ok: true, file: absPath, line, editor: editorCmd });
}

// ─── Pages Router handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any): void {
  const file = req.query?.file as string | undefined;
  const line = parseInt(req.query?.line ?? '1', 10) || 1;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!file) {
    res.status(400).json({ ok: false, error: 'missing file' });
    return;
  }

  const absPath = resolve(process.cwd(), file);
  openInEditor(absPath, line, editorCmd);
  res.status(200).json({ ok: true, file: absPath, line, editor: editorCmd });
}
