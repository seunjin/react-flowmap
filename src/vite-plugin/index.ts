import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, TypeFormatFlags, ts } from 'ts-morph';
import type { Plugin } from 'vite';
import { transformFlowmap } from '../../packages/babel-plugin/src/index.js';

const _require = createRequire(import.meta.url);

// Virtual module IDs
const RFM_CONTEXT_ID = 'virtual:rfm/context';
const RESOLVED_RFM_CONTEXT_ID = '\0' + RFM_CONTEXT_ID;


const _pluginDir = dirname(fileURLToPath(import.meta.url));
// 빌드된 패키지(dist/)와 소스(src/vite-plugin/) 모두에서 경로를 올바르게 해석
const _inDist = _pluginDir.endsWith('/dist') || _pluginDir.includes('/dist/');
const _resolvePkg = (distName: string, srcRelative: string) =>
  _inDist ? resolve(_pluginDir, distName) : resolve(_pluginDir, srcRelative);

// ─── ts-morph Props 타입 추출 ─────────────────────────────────────────────────
export type PropTypeEntry      = { type: string; optional: boolean };
export type ComponentPropTypes = { propsDefLoc?: { file: string; line: number }; props: Record<string, PropTypeEntry> };
export type PropTypesMap       = Record<string, ComponentPropTypes>;
export type RouteManifestEntry = {
  id: string;
  router: 'react-router' | 'tanstack-router';
  urlPath: string;
  filePath: string;
  type: 'layout' | 'page';
  componentName: string;
  isServer: false;
  propTypes?: Record<string, PropTypeEntry>;
};

function resolveImportedComponentPath(
  root: string,
  importerAbsPath: string,
  importSource: string,
): string | null {
  const basePath = resolve(dirname(importerAbsPath), importSource);
  const candidates = [
    basePath,
    `${basePath}.tsx`,
    `${basePath}.ts`,
    `${basePath}.jsx`,
    `${basePath}.js`,
    resolve(basePath, 'index.tsx'),
    resolve(basePath, 'index.ts'),
    resolve(basePath, 'index.jsx'),
    resolve(basePath, 'index.js'),
  ];

  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) return null;
  return relative(root, resolved).replace(/\\/g, '/');
}

/** 타입의 선언 위치(파일, 라인)를 반환. node_modules / lib 타입은 null */
function getTypeDefLoc(type: import('ts-morph').Type): { file: string; line: number } | null {
  const sym = type.getSymbol() ?? type.getAliasSymbol();
  if (!sym) return null;
  // union 타입에서 null/undefined 제거 후 첫 번째 의미있는 선언
  const decls = sym.getDeclarations() ?? [];
  const decl = decls.find(d => {
    const fp = d.getSourceFile().getFilePath();
    return !fp.includes('node_modules') && !fp.includes('/typescript/lib/');
  });
  if (!decl) return null;
  return { file: decl.getSourceFile().getFilePath(), line: decl.getStartLineNumber() };
}

function extractPropsViaTsMorph(
  tsProject: Project,
  absPath: string,
  componentName: string,
): ComponentPropTypes | null {
  try {
    let sf = tsProject.getSourceFile(absPath);
    if (!sf) sf = tsProject.addSourceFileAtPathIfExists(absPath);
    if (!sf) return null;

    const fnDecl = sf.getFunction(componentName);
    const varDecl = sf.getVariableDeclaration(componentName);
    const node = fnDecl ?? varDecl;
    if (!node) return null;

    const params = fnDecl
      ? fnDecl.getParameters()
      : varDecl?.getInitializerIfKind(ts.SyntaxKind.ArrowFunction)?.getParameters()
        ?? varDecl?.getInitializerIfKind(ts.SyntaxKind.FunctionExpression)?.getParameters()
        ?? [];
    if (params.length === 0) return null;

    const firstParam = params[0]!;
    const type = firstParam.getType();

    // 컴포넌트 전체 props 타입의 선언 위치 (type Props = ... 또는 inline 타입)
    const propsDefLoc = getTypeDefLoc(type) ?? null;

    const props: Record<string, PropTypeEntry> = {};
    for (const prop of type.getProperties()) {
      const name = prop.getName();
      if (name === 'children') continue;
      const propType = prop.getTypeAtLocation(firstParam);
      const optional = prop.hasFlags(ts.SymbolFlags.Optional);
      const typeStr = propType.getText(firstParam, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
      props[name] = { type: typeStr, optional };
    }
    if (Object.keys(props).length === 0) return null;
    return { props, ...(propsDefLoc ? { propsDefLoc } : {}) };
  } catch {
    return null;
  }
}

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
    if (err) {
      const directCmd = isVscodeFamily
        ? `/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity -g "${target}"`
        : null;
      if (directCmd) exec(directCmd, { env }, () => {});
    }
  });
}

// ─── 플러그인 ─────────────────────────────────────────────────────────────────
export type EditorName =
  | 'code'
  | 'cursor'
  | 'antigravity'
  | 'windsurf'
  | 'codium'
  | 'vscodium'
  | 'zed'
  | (string & {});

export type FlowmapInspectOptions = {
  exclude?: RegExp[];
  editor?: EditorName;
};

export function flowmapInspect(options: FlowmapInspectOptions = {}): Plugin {
  let root = process.cwd();
  let editorCmd = process.env['VITE_EDITOR'] ?? options.editor ?? process.env['EDITOR'] ?? 'code';
  let isDev = false;
  const symbolLocMap = new Map<string, number>();
  let tsProject: Project | null = null;

  // suppress unused import warning — _require kept for potential future CJS compat shims
  void _require;

  return {
    name: 'rfm-inspect',
    enforce: 'pre',

    configResolved(config) {
      root = config.root;
      isDev = config.command === 'serve';
      const fromEnv = (config.env as Record<string, string | undefined>)['VITE_EDITOR'];
      if (fromEnv) editorCmd = fromEnv;

      if (isDev) {
        const tsconfigPath = resolve(root, 'tsconfig.json');
        try {
          tsProject = new Project({
            tsConfigFilePath: tsconfigPath,
            skipAddingFilesFromTsConfig: true,
          });
        } catch {
          tsProject = null;
        }
      }
    },

    resolveId(id) {
      if (id === RFM_CONTEXT_ID) return RESOLVED_RFM_CONTEXT_ID;
    },

    load(id) {
      if (id === RESOLVED_RFM_CONTEXT_ID) {
        const contextPath = _resolvePkg('rfm-context', '../runtime/rfm-context');
        return `export * from ${JSON.stringify(contextPath)};`;
      }
      return null;
    },

    configureServer(server) {
      server.middlewares.use('/__rfm-open', (req, res) => {
        const qs = req.url?.split('?')[1] ?? '';
        const params = new URLSearchParams(qs);
        const file     = params.get('file');
        const symbolId = params.get('symbolId');
        const editorParam = params.get('editor');
        const line = symbolId && symbolLocMap.has(symbolId)
          ? symbolLocMap.get(symbolId)!
          : parseInt(params.get('line') ?? '1', 10) || 1;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        if (!file) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: 'missing file' }));
          return;
        }

        const absPath = resolve(root, file);
        openInEditor(absPath, line, editorParam ?? editorCmd);
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, file: absPath, line, editor: editorCmd }));
      });
    },

    handleHotUpdate({ file }) {
      if (tsProject && /\.[jt]sx?$/.test(file)) {
        const sf = tsProject.getSourceFile(file);
        if (sf) sf.refreshFromFileSystemSync();
      }
    },

    transform(code: string, id: string) {
      if (!isDev) return null;

      const relPath = relative(root, id).replace(/\\/g, '/');
      const result = transformFlowmap(code, id, {
        relPath,
        contextImport: RFM_CONTEXT_ID,
        exclude: options.exclude ?? [],
      });
      if (!result) return null;

      // symbolLocMap 업데이트 (에디터 열기용)
      for (const [symbolId, line] of result.symbolLocs) {
        symbolLocMap.set(symbolId, line);
      }

      // 정적 JSX 관계 주입 (symbol:path#Name → [childComponentName, ...])
      let finalCode = result.code;
      if (result.staticJsxMap.size > 0) {
        const jsxLines = ['\n// __rfm static jsx', '(globalThis.__rfmStaticJsx??={});'];
        for (const [fromId, names] of result.staticJsxMap) {
          jsxLines.push(`(globalThis.__rfmStaticJsx[${JSON.stringify(fromId)}]??=[]).push(...${JSON.stringify(names)});`);
        }
        finalCode += jsxLines.join('\n');
      }

      const routeManifestEntries: RouteManifestEntry[] = result.routeManifestEntries.map((route) => {
        const componentFilePath = route.componentImportSource
          ? resolveImportedComponentPath(root, id, route.componentImportSource)
          : relPath;

        const propTypes = tsProject && componentFilePath
          ? extractPropsViaTsMorph(tsProject, resolve(root, componentFilePath), route.componentName)?.props
          : null;

        return {
          id: route.id,
          router: route.router,
          urlPath: route.urlPath,
          filePath: componentFilePath ?? relPath,
          type: route.type,
          componentName: route.componentName,
          isServer: false,
          ...(propTypes ? { propTypes } : {}),
        };
      });

      if (routeManifestEntries.length > 0) {
        const routeLines = [
          '\n// __rfm route manifest',
          '(globalThis.__rfmViteRouteFiles??={});',
          `globalThis.__rfmViteRouteFiles[${JSON.stringify(relPath)}]=${JSON.stringify(routeManifestEntries)};`,
          'globalThis.__rfmViteRoutes=Object.values(globalThis.__rfmViteRouteFiles).flat();',
        ];
        finalCode += routeLines.join('\n');
      }

      // ts-morph prop types 주입
      if (tsProject) {
        const propTypesRegistry = new Map<string, ComponentPropTypes>();
        for (const symbolId of result.symbolLocs.keys()) {
          const componentName = symbolId.split('#')[1] ?? '';
          const compTypes = extractPropsViaTsMorph(tsProject, id, componentName);
          if (compTypes) propTypesRegistry.set(symbolId, compTypes);
        }
        if (propTypesRegistry.size > 0) {
          const lines = ['\n// __rfm prop types', '(globalThis.__rfmPropTypes??={});'];
          for (const [sid, props] of propTypesRegistry) {
            lines.push(`globalThis.__rfmPropTypes[${JSON.stringify(sid)}]=${JSON.stringify(props)};`);
          }
          finalCode += lines.join('\n');
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { code: finalCode, map: result.map as any };
    },
  };
}
