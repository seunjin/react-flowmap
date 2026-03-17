import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const _require = createRequire(import.meta.url);

/** react-flowmap/context 로 import되는 경로 (Next.js 환경에서는 실제 모듈 경로 사용) */
const CONTEXT_IMPORT = 'react-flowmap/context';

export type FlowmapNextOptions = {
  /**
   * 변환에서 제외할 파일 경로 패턴 (정규식)
   */
  exclude?: RegExp[];
  /**
   * 에디터 명령어. EDITOR 환경변수가 있으면 그것을 우선합니다.
   * @example 'cursor' | 'code' | 'windsurf' | 'zed'
   */
  editor?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withFlowmap(nextConfig: Record<string, any> = {}, options: FlowmapNextOptions = {}): Record<string, any> {
  return {
    ...nextConfig,

    webpack(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx: { dev: boolean; isServer: boolean; [key: string]: any },
    ) {
      // 기존 webpack 설정 먼저 적용
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base = nextConfig.webpack ? nextConfig.webpack(config, ctx) : config;

      // 프로덕션 빌드 및 서버 사이드는 건너뜀
      if (!ctx.dev || ctx.isServer) return base;

      const loaderPath = _require.resolve('@react-flowmap/next-plugin/webpack-loader');
      const root = ctx.dir ?? process.cwd();

      // react-flowmap/context 모듈 alias 설정
      base.resolve ??= {};
      base.resolve.alias ??= {};
      base.resolve.alias[CONTEXT_IMPORT] = resolve(
        _require.resolve('react-flowmap'),
        '../../src/runtime/rfm-context.ts',
      );

      // rfm 변환 로더를 최상단(pre)에 추가
      base.module ??= {};
      base.module.rules ??= [];
      base.module.rules.unshift({
        test: /\.[jt]sx$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: loaderPath,
            options: {
              root,
              contextImport: CONTEXT_IMPORT,
              exclude: options.exclude ?? [],
            },
          },
        ],
      });

      return base;
    },

    // /__rfm-open → /api/__rfm-open 으로 rewrite (에디터 열기)
    async rewrites() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing: any = await (nextConfig.rewrites?.() ?? Promise.resolve([]));
      const rfmRewrite = { source: '/__rfm-open', destination: '/api/__rfm-open' };

      if (Array.isArray(existing)) {
        return [...existing, rfmRewrite];
      }
      // { beforeFiles, afterFiles, fallback } 형태
      return {
        ...existing,
        fallback: [...(existing.fallback ?? []), rfmRewrite],
      };
    },
  };
}
