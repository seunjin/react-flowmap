'use strict';

const path = require('path');

/**
 * react-flowmap webpack loader for Next.js.
 * 'use client' 디렉티브가 있는 파일만 변환 (서버 컴포넌트 제외).
 */
module.exports = function rfmLoader(source) {
  // 'use client' 디렉티브 없으면 변환 건너뜀 (서버 컴포넌트)
  const trimmed = source.trimStart();
  const hasUseClient =
    trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
  if (!hasUseClient) return source;

  const callback = this.async();
  const resourcePath = this.resourcePath;
  const options = this.getOptions ? this.getOptions() : {};
  const root = options.root ?? process.cwd();
  const excludePatterns = options.exclude ?? [];
  const relPath = path.relative(root, resourcePath).replace(/\\/g, '/');

  // ESM babel-plugin을 동적으로 import (Node.js 18+)
  const babelPluginPath = path.join(__dirname, 'babel-plugin.js');

  import(babelPluginPath)
    .then(function (mod) {
      const transformFlowmap = mod.transformFlowmap;

      const result = transformFlowmap(source, resourcePath, {
        relPath,
        contextImport: 'react-flowmap/rfm-context',
        exclude: excludePatterns,
      });

      if (!result) {
        callback(null, source);
        return;
      }

      let code = result.code;

      // 정적 JSX 관계 주입
      if (result.staticJsxMap.size > 0) {
        const lines = ['\n// __rfm static jsx', '(globalThis.__rfmStaticJsx??={});'];
        for (const [fromId, names] of result.staticJsxMap) {
          lines.push(
            '(globalThis.__rfmStaticJsx[' +
              JSON.stringify(fromId) +
              ']??=[]).push(...' +
              JSON.stringify(names) +
              ');',
          );
        }
        code += lines.join('\n');
      }

      callback(null, code, result.map);
    })
    .catch(function (err) {
      callback(err);
    });
};
