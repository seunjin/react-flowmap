import { exec } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextConfig = Record<string, any>;

const _require = createRequire(import.meta.url);
const _pluginDir = dirname(fileURLToPath(import.meta.url));

// ─── 에디터 열기 ──────────────────────────────────────────────────────────────
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
  const env = { ...process.env, PATH: `${extraPaths}:${process.env['PATH'] ?? ''}` };

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

// ─── withFlowmap ──────────────────────────────────────────────────────────────
export type WithFlowmapOptions = {
  editor?: string;
  exclude?: RegExp[];
};

export function withFlowmap(
  nextConfig: NextConfig = {},
  options: WithFlowmapOptions = {},
): NextConfig {
  const root = process.cwd();
  const editorCmd =
    process.env['NEXT_EDITOR'] ?? options.editor ?? process.env['EDITOR'] ?? 'code';

  // 로더 경로 — dist/rfm-loader.cjs (패키지 설치 시) 또는 src/next-plugin/rfm-loader.cjs (소스 실행 시)
  const loaderPath = _pluginDir.endsWith('/dist') || _pluginDir.includes('/dist/')
    ? resolve(_pluginDir, 'rfm-loader.cjs')
    : resolve(_pluginDir, 'rfm-loader.cjs'); // src/ 에서도 같은 상대 경로

  return {
    ...nextConfig,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webpack(config: any, ctx: { dev: boolean; isServer: boolean }) {
      // 원본 webpack 설정 먼저 적용
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, ctx);
      }

      // dev 모드에서만 활성화 (server 컴파일에도 적용 — 클라이언트 컴포넌트 SSR 일관성 유지)
      if (!ctx.dev) return config;

      // rfm-loader 추가 — 가장 먼저 실행되도록 unshift
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

      return config;
    },

    // /__rfm-open → API route로 처리
    async rewrites() {
      const existing = await (nextConfig.rewrites?.() ?? Promise.resolve([]));
      const base = Array.isArray(existing) ? existing : (existing as { beforeFiles?: unknown[] }).beforeFiles ?? [];
      return [
        ...(base as object[]),
        {
          source: '/__rfm-open',
          destination: '/api/rfm-open',
        },
      ];
    },
  };
}

// 에디터 열기 함수 — API route에서 사용
export { openInEditor };

// suppress unused import warning
void _require;
