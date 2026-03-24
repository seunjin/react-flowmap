/**
 * inspector.css를 라이브러리 루트 컨텍스트에서 미리 컴파일해 inspector.compiled.css로 출력.
 * 소비자 앱의 Tailwind 인스턴스와 무관하게 항상 올바른 CSS를 보장.
 *
 * Usage: node scripts/build-inspector-css.mjs
 */
import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cssFile = path.resolve(root, 'src/ui/inspector/inspector.css');
const outFile = path.resolve(root, 'src/ui/inspector/inspector.compiled.css');

const css = readFileSync(cssFile, 'utf-8');
const base = path.dirname(cssFile);

const compiler = await compile(css, {
  base,
  onDependency: () => {},
  customCssResolver: async ({ id, base: resolveBase }) => {
    if (!id || !resolveBase) return null;
    const resolved = path.resolve(resolveBase, id);
    try {
      return { content: readFileSync(resolved, 'utf-8'), base: path.dirname(resolved) };
    } catch {
      return null;
    }
  },
});

const sources = (compiler.sources ?? []).map(s => ({ ...s, base: s.base ?? base }));
const scanner = new Scanner({ sources });
const candidates = scanner.scan();

const result = compiler.build(candidates);
const { code } = optimize(result, { minify: false });

writeFileSync(outFile, code);
console.log(`inspector.compiled.css: ${code.length} bytes`);
