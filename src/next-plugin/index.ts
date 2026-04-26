import { createServer } from 'node:http';
import { exec, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanAppDirectory } from './scan-app-dir.js';
import {
  DEFAULT_EDITOR_ID,
  EDITOR_OPTIONS,
  getEditorCommand,
  getEditorLabel,
  normalizeKnownEditorId,
} from '../editor.js';
import { existsSync } from 'node:fs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextConfig = Record<string, any>;

const _require = createRequire(import.meta.url);
const _pluginDir = dirname(fileURLToPath(import.meta.url));

// ─── 에디터 열기 ──────────────────────────────────────────────────────────────
function buildEditorEnv(): NodeJS.ProcessEnv {
  const extraPaths = [
    `${process.env['HOME'] ?? ''}/.antigravity/antigravity/bin`,
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${process.env['HOME'] ?? ''}/.local/bin`,
  ].join(':');
  return { ...process.env, PATH: `${extraPaths}:${process.env['PATH'] ?? ''}` };
}

function isCommandAvailable(command: string, env: NodeJS.ProcessEnv): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore', env });
    return true;
  } catch {
    return false;
  }
}

function getEditorAvailability(editorCmd: string) {
  const env = buildEditorEnv();
  const projectDefaultId = normalizeKnownEditorId(editorCmd);

  return {
    defaultEditor: projectDefaultId,
    defaultLabel: projectDefaultId ? getEditorLabel(projectDefaultId) : 'Custom',
    editors: EDITOR_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      available:
        isCommandAvailable(option.command, env) ||
        (process.platform === 'darwin' &&
          (option.macAppPaths ?? []).some((appPath) => existsSync(appPath))),
    })),
  };
}

function resolveEditorCommand(editorParam: string | null, editorCmd: string): string {
  const selected = normalizeKnownEditorId(editorParam);
  return selected ? getEditorCommand(selected) : editorParam ?? editorCmd;
}

function openInEditor(absPath: string, line: number, editor: string): void {
  const target = `${absPath}:${line}`;
  const vscodeFamily = ['code', 'cursor', 'antigravity'];
  const isVscodeFamily = vscodeFamily.some(e => editor === e || editor.endsWith(`/${e}`));

  const vimFamily = ['vim', 'vi'];
  const isVimFamily = vimFamily.some(e => editor === e || editor.endsWith(`/${e}`));

  let cmd: string;
  if (isVscodeFamily) {
    cmd = `"${editor}" -g "${target}"`;
  } else if (isVimFamily) {
    // TTY 없이 실행 시 .swp 파일 생성 방지: -n (no swap), +N (line jump)
    // macOS: Terminal.app에서 열어서 실제로 편집 가능하게 함
    if (process.platform === 'darwin') {
      const escaped = absPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      cmd = `osascript -e 'tell application "Terminal" to do script "${editor} +${line} \\"${escaped}\\""' -e 'tell application "Terminal" to activate'`;
    } else {
      cmd = `"${editor}" -n +"${line}" "${absPath}"`;
    }
  } else {
    cmd = `"${editor}" "${absPath}"`;
  }

  const env = buildEditorEnv();

  exec(cmd, { env }, (err) => {
    if (err && isVscodeFamily) {
      exec(
        `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity -g "${target}"`,
        { env },
        () => {},
      );
    }
  });
}

// ─── 사이드카 서버 ─────────────────────────────────────────────────────────────
// HMR 재컴파일 시 중복 실행 방지를 위한 모듈 레벨 싱글톤
let _sidecarStarted = false;

function startSidecar(port: number, root: string, editorCmd: string): void {
  if (_sidecarStarted) return;
  _sidecarStarted = true;

  const server = createServer((req, res) => {
    const pathname = req.url?.split('?')[0] ?? '';
    const qs = req.url?.split('?')[1] ?? '';
    const params = new URLSearchParams(qs);
    const file = params.get('file');
    const editorParam = params.get('editor');
    const line = parseInt(params.get('line') ?? '1', 10) || 1;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (pathname === '/__rfm-editors') {
      res.end(JSON.stringify(getEditorAvailability(editorCmd)));
      return;
    }

    if (!file) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'missing file' }));
      return;
    }

    const resolvedEditor = resolveEditorCommand(editorParam, editorCmd);
    console.log(`[react-flowmap] open: ${file} (editor: ${resolvedEditor})`);
    openInEditor(resolve(root, file), line, resolvedEditor);
    res.end(JSON.stringify({ ok: true }));
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[react-flowmap] sidecar port ${port} already in use — editor open disabled`);
    }
    _sidecarStarted = false;
  });

  server.listen(port, '127.0.0.1', () => {
    // silent start — dev tool
  });

  process.on('exit', () => server.close());
}

// ─── withFlowmap ──────────────────────────────────────────────────────────────
export type WithFlowmapOptions = {
  editor?: string;
  exclude?: RegExp[];
  /** 사이드카 서버 포트 (기본: 51423) */
  sidecarPort?: number;
};

export function withFlowmap(
  nextConfig: NextConfig = {},
  options: WithFlowmapOptions = {},
): NextConfig {
  const root = process.cwd();
  const editorCmd =
    options.editor ?? getEditorCommand(DEFAULT_EDITOR_ID);
  const port = options.sidecarPort ?? 51423;

  const loaderPath = _pluginDir.endsWith('/dist') || _pluginDir.includes('/dist/')
    ? resolve(_pluginDir, 'rfm-loader.cjs')
    : resolve(_pluginDir, 'rfm-loader.cjs');

  return {
    ...nextConfig,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webpack(config: any, ctx: { dev: boolean; isServer: boolean; webpack?: { DefinePlugin: new (defs: Record<string, string>) => unknown } }) {
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, ctx);
      }

      if (!ctx.dev) return config;

      // rfm-loader — 'use client' 파일만 변환
      if (!Array.isArray(config.module)) {
        config.module ??= { rules: [] };
        (config.module.rules as unknown[]).unshift({
          test: /\.[jt]sx$/,
          exclude: /node_modules/,
          use: [
            {
              loader: _require.resolve(loaderPath),
              options: { root, exclude: options.exclude ?? [] },
            },
          ],
          enforce: 'pre',
        });
      }

      // 클라이언트 번들에만 주입 (서버 번들 제외)
      if (!ctx.isServer && ctx.webpack) {
        // 사이드카 서버 시작 — 에디터 열기를 API route 없이 처리
        startSidecar(port, root, editorCmd);

        // 클라이언트에 사이드카 URL + App Router 라우트 트리 주입
        const routes = scanAppDirectory(root);
        config.plugins ??= [];
        config.plugins.push(
          new ctx.webpack.DefinePlugin({
            'globalThis.__rfmOpenUrl': JSON.stringify(`http://127.0.0.1:${port}`),
            'globalThis.__rfmNextRouteTree': JSON.stringify(routes),
          }),
        );
      }

      return config;
    },
  };
}

// 에디터 열기 함수 — 하위 호환성을 위해 export 유지 (기존 api/rfm-open/route.ts 사용자)
export { openInEditor };

// suppress unused import warning
void _require;
