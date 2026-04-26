import { describe, expect, it } from 'vitest';

import { withFlowmap } from '../../src/next-plugin/index';

class FakeDefinePlugin {
  readonly defs: Record<string, string>;

  constructor(defs: Record<string, string>) {
    this.defs = defs;
  }
}

type WebpackLikeConfig = {
  module?: { rules: unknown[] };
  plugins?: unknown[];
  touched?: boolean;
};

type WebpackHook = (
  config: WebpackLikeConfig,
  ctx: {
    dev: boolean;
    isServer: boolean;
    webpack: { DefinePlugin: typeof FakeDefinePlugin };
  },
) => WebpackLikeConfig;

describe('withFlowmap', () => {
  it('does not install flowmap loaders or client defines for production builds', () => {
    const wrappedConfig = withFlowmap({
      webpack(config: WebpackLikeConfig) {
        config.touched = true;
        return config;
      },
    });

    const webpack = wrappedConfig.webpack as WebpackHook;
    const config: WebpackLikeConfig = {
      module: { rules: [] },
      plugins: [],
    };

    const result = webpack(config, {
      dev: false,
      isServer: false,
      webpack: { DefinePlugin: FakeDefinePlugin },
    });

    expect(result).toBe(config);
    expect(result.touched).toBe(true);
    expect(result.module?.rules).toEqual([]);
    expect(result.plugins).toEqual([]);
  });
});
