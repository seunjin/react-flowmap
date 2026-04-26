import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const requireFromRoot = createRequire(join(root, 'package.json'));
const packageJson = readJson(join(root, 'package.json'));
const tmpRoot = mkdtempSync(join(tmpdir(), 'rfm-package-verify-'));
const keepTmp = process.env.RFM_KEEP_VERIFY_TMP === '1';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function exec(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf-8',
      stdio: 'pipe',
      ...options,
    });
  } catch (error) {
    if (error.stdout) process.stderr.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  }
}

function assertRootDistReady() {
  const requiredDistFiles = [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/vite-plugin.js',
    'dist/vite-plugin.d.ts',
    'dist/next-plugin.js',
    'dist/next-plugin.d.ts',
    'dist/rfm-context.js',
    'dist/rfm-context.d.ts',
    'dist/graph-window.js',
    'dist/graph-window.d.ts',
    'dist/babel-plugin.js',
    'dist/rfm-loader.cjs',
  ];

  for (const file of requiredDistFiles) {
    assert(
      existsSync(join(root, file)),
      `Missing ${file}. Run pnpm build before pnpm verify:package.`,
    );
  }
}

function packPackage() {
  exec('pnpm', ['pack', '--pack-destination', tmpRoot]);
  const tarballs = readdirSync(tmpRoot)
    .filter((name) => name.endsWith('.tgz'))
    .map((name) => join(tmpRoot, name));

  assert(tarballs.length === 1, `Expected one package tarball, found ${tarballs.length}.`);
  return tarballs[0];
}

function listTarball(tarball) {
  return exec('tar', ['-tf', tarball])
    .trim()
    .split('\n')
    .filter(Boolean);
}

function extractTarball(tarball) {
  const extractRoot = join(tmpRoot, 'extract');
  mkdirSync(extractRoot, { recursive: true });
  exec('tar', ['-xzf', tarball, '-C', extractRoot]);
  const packageDir = join(extractRoot, 'package');
  assert(existsSync(packageDir), 'Packed tarball did not contain package/.');
  return packageDir;
}

function assertPackedContents(contents, tarball) {
  const requiredFiles = [
    'package/package.json',
    'package/README.md',
    'package/docs/assets/flowmap-workspace-next.png',
    'package/dist/index.js',
    'package/dist/index.d.ts',
    'package/dist/index.js.map',
    'package/dist/vite-plugin.js',
    'package/dist/vite-plugin.d.ts',
    'package/dist/vite-plugin.js.map',
    'package/dist/next-plugin.js',
    'package/dist/next-plugin.d.ts',
    'package/dist/next-plugin.js.map',
    'package/dist/rfm-context.js',
    'package/dist/rfm-context.d.ts',
    'package/dist/rfm-context.js.map',
    'package/dist/graph-window.js',
    'package/dist/graph-window.d.ts',
    'package/dist/graph-window.js.map',
    'package/dist/babel-plugin.js',
    'package/dist/babel-plugin.js.map',
    'package/dist/rfm-loader.cjs',
  ];

  for (const file of requiredFiles) {
    assert(contents.includes(file), `Packed tarball is missing ${file}.`);
  }

  assert(
    contents.some((file) => /^package\/dist\/chunks\/GraphWindow-.+\.js$/.test(file)),
    'Packed tarball is missing the graph-window chunk.',
  );
  assert(
    contents.some((file) => /^package\/dist\/chunks\/rfm-context-.+\.js$/.test(file)),
    'Packed tarball is missing the rfm-context chunk.',
  );

  for (const prefix of ['package/src/', 'package/tests/', 'package/demos/', 'package/scripts/']) {
    assert(
      !contents.some((file) => file.startsWith(prefix)),
      `Packed tarball should not include ${prefix}.`,
    );
  }

  const tarballSize = statSync(tarball).size;
  assert(tarballSize < 2 * 1024 * 1024, `Packed tarball is unexpectedly large: ${formatBytes(tarballSize)}.`);

  const sourceMapCount = contents.filter((file) => file.endsWith('.map')).length;
  assert(sourceMapCount > 0, 'Packed tarball should include source maps.');

  console.log(`[package] ${basename(tarball)} ${formatBytes(tarballSize)}, ${sourceMapCount} source maps`);
}

function assertPackedPackageJson(packageDir) {
  const packedPackageJson = readJson(join(packageDir, 'package.json'));
  const exportKeys = Object.keys(packedPackageJson.exports).sort();

  assert(
    JSON.stringify(exportKeys) === JSON.stringify(['.', './graph-window', './next', './rfm-context', './vite']),
    `Unexpected package exports: ${exportKeys.join(', ')}`,
  );

  assert(!packedPackageJson.exports['./babel-plugin'], 'Internal babel-plugin must not be exported.');
  assert(!packedPackageJson.exports['./editor-server'], 'Internal editor-server must not be exported.');

  for (const [subpath, entry] of Object.entries(packedPackageJson.exports)) {
    assert(
      entry.default === entry.import,
      `${subpath} should expose a default condition for config loaders.`,
    );
  }
}

function linkDependency(appRoot, dependencyName) {
  const depPackageJsonPath = requireFromRoot.resolve(`${dependencyName}/package.json`);
  const depRoot = dirname(depPackageJsonPath);
  const target = join(appRoot, 'node_modules', dependencyName);

  if (existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(depRoot, target, 'junction');
}

function prepareSmokeApp(name, packageDir) {
  const appRoot = join(tmpRoot, name);
  const nodeModules = join(appRoot, 'node_modules');
  const installedPackage = join(nodeModules, 'react-flowmap');
  mkdirSync(nodeModules, { recursive: true });
  cpSync(packageDir, installedPackage, { recursive: true });

  const dependencies = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);
  for (const dependencyName of dependencies) {
    linkDependency(appRoot, dependencyName);
  }

  writeFileSync(
    join(appRoot, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2),
  );

  return appRoot;
}

function runSmokeScript(appRoot, fileName, source) {
  const scriptPath = join(appRoot, fileName);
  writeFileSync(scriptPath, source);
  exec(process.execPath, [scriptPath], { cwd: appRoot });
}

function verifyViteSmoke(packageDir) {
  const appRoot = prepareSmokeApp('vite-smoke', packageDir);

  runSmokeScript(
    appRoot,
    'verify-vite.mjs',
    `
import { ReactFlowMap } from 'react-flowmap';
import { flowmapInspect } from 'react-flowmap/vite';
import { GraphWindow } from 'react-flowmap/graph-window';
import { __RfmCtx } from 'react-flowmap/rfm-context';

const plugin = flowmapInspect();

if (typeof ReactFlowMap !== 'function') throw new Error('ReactFlowMap import failed.');
if (typeof flowmapInspect !== 'function') throw new Error('flowmapInspect import failed.');
if (plugin.name !== 'rfm-inspect') throw new Error('Unexpected Vite plugin name.');
if (typeof GraphWindow !== 'function') throw new Error('GraphWindow import failed.');
if (!__RfmCtx) throw new Error('rfm-context import failed.');
`.trim(),
  );

  console.log('[smoke] Vite app imports react-flowmap and react-flowmap/vite');
}

function verifyNextSmoke(packageDir) {
  const appRoot = prepareSmokeApp('next-smoke', packageDir);

  runSmokeScript(
    appRoot,
    'verify-next.mjs',
    `
import { ReactFlowMap } from 'react-flowmap';
import { withFlowmap, openInEditor } from 'react-flowmap/next';
import { createRequire } from 'node:module';

class DefinePlugin {
  constructor(defs) {
    this.defs = defs;
  }
}

const require = createRequire(import.meta.url);
const nextApiFromRequire = require('react-flowmap/next');
const nextConfig = withFlowmap({});
const productionConfig = nextConfig.webpack(
  { module: { rules: [] }, plugins: [] },
  { dev: false, isServer: false, webpack: { DefinePlugin } },
);
const devServerConfig = nextConfig.webpack(
  { module: { rules: [] }, plugins: [] },
  { dev: true, isServer: true, webpack: { DefinePlugin } },
);
const loaderRule = devServerConfig.module.rules.find((rule) =>
  rule?.use?.some?.((item) => String(item.loader).endsWith('rfm-loader.cjs')),
);

if (typeof ReactFlowMap !== 'function') throw new Error('ReactFlowMap import failed.');
if (typeof withFlowmap !== 'function') throw new Error('withFlowmap import failed.');
if (typeof openInEditor !== 'function') throw new Error('openInEditor import failed.');
if (typeof nextApiFromRequire.withFlowmap !== 'function') throw new Error('withFlowmap require failed.');
if (productionConfig.module.rules.length !== 0) throw new Error('Production config should not install Flowmap loader.');
if (!loaderRule) throw new Error('Dev server config did not install rfm-loader.cjs.');
`.trim(),
  );

  console.log('[smoke] Next app imports react-flowmap/next and resolves rfm-loader.cjs');
}

try {
  assertRootDistReady();

  const tarball = packPackage();
  const contents = listTarball(tarball);
  assertPackedContents(contents, tarball);

  const packageDir = extractTarball(tarball);
  assertPackedPackageJson(packageDir);
  verifyViteSmoke(packageDir);
  verifyNextSmoke(packageDir);

  console.log('[package] verification complete');
} finally {
  if (keepTmp) {
    console.log(`[package] kept temp files at ${tmpRoot}`);
  } else {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
}
