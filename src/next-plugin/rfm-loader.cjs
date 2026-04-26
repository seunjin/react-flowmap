/* global require, module, __dirname, process */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const path = require('path');

/**
 * react-flowmap webpack loader for Next.js.
 * Client components get runtime context instrumentation.
 * Server components get lightweight DOM owner markers for static graph highlights.
 */
module.exports = function rfmLoader(source) {
  const callback = this.async();
  const trimmed = source.trimStart();
  const hasUseClient =
    trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');

  const resourcePath = this.resourcePath;
  const options = this.getOptions ? this.getOptions() : {};
  const root = options.root ?? process.cwd();
  const excludePatterns = options.exclude ?? [];
  const relPath = path.relative(root, resourcePath).replace(/\\/g, '/');

  // ESM babel-plugin을 동적으로 import (Node.js 18+)
  const babelPluginPath = path.join(__dirname, 'babel-plugin.js');
  if (typeof this.addDependency === 'function') {
    this.addDependency(babelPluginPath);
  }

  import(babelPluginPath)
    .then(function (mod) {
      const transformFlowmap = mod.transformFlowmap;
      const transformStaticOwnerMarks = mod.transformStaticOwnerMarks;

      if (!hasUseClient) {
        const result = transformStaticOwnerMarks(source, resourcePath, {
          relPath,
          exclude: excludePatterns,
        });

        callback(null, result?.code ?? source, result?.map);
        return;
      }

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
