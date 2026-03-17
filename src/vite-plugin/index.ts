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

const RFM_GRAPH_ENTRY_ID = '/@rfm/graph-entry';

const _pluginDir = dirname(fileURLToPath(import.meta.url));

// ─── ts-morph Props 타입 추출 ─────────────────────────────────────────────────
export type TypeFieldEntry = { type: string; optional: boolean; resolvedType?: string; fields?: Record<string, TypeFieldEntry> };
export type PropTypeEntry  = TypeFieldEntry;
export type PropTypesMap   = Record<string, PropTypeEntry>;

function isFromProject(type: import('ts-morph').Type): boolean {
  const sym = type.getSymbol() ?? type.getAliasSymbol();
  const decls = sym?.getDeclarations() ?? [];
  return decls.some(d => {
    const fp = d.getSourceFile().getFilePath();
    return !fp.includes('node_modules') && !fp.includes('/typescript/lib/');
  });
}

function resolveFields(
  type: import('ts-morph').Type,
  locationNode: import('ts-morph').Node,
  depth: number,
): Record<string, TypeFieldEntry> | undefined {
  if (depth >= 2) return undefined;
  const props = type.getProperties();
  if (props.length === 0) return undefined;

  const result: Record<string, TypeFieldEntry> = {};
  for (const sym of props) {
    const name = sym.getName();
    const propType = sym.getTypeAtLocation(locationNode);
    const optional = sym.hasFlags(ts.SymbolFlags.Optional);
    const typeStr = propType.getText(locationNode, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);

    let fields: Record<string, TypeFieldEntry> | undefined;
    const isExpandable =
      propType.isObject() &&
      !propType.isArray() &&
      propType.getCallSignatures().length === 0 &&
      isFromProject(propType);
    if (isExpandable) fields = resolveFields(propType, locationNode, depth + 1);

    result[name] = { type: typeStr, optional, ...(fields ? { fields } : {}) };
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function extractPropsViaTsMorph(
  tsProject: Project,
  absPath: string,
  componentName: string,
): PropTypesMap | null {
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

    const result: PropTypesMap = {};
    for (const prop of type.getProperties()) {
      const name = prop.getName();
      if (name === 'children') continue;
      const propType = prop.getTypeAtLocation(firstParam);
      const optional = prop.hasFlags(ts.SymbolFlags.Optional);
      const typeStr = propType.getText(firstParam, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);

      let fields: Record<string, TypeFieldEntry> | undefined;
      let resolvedType: string | undefined;
      const isObjectExpandable =
        propType.isObject() &&
        !propType.isArray() &&
        propType.getCallSignatures().length === 0 &&
        isFromProject(propType);

      if (isObjectExpandable) {
        fields = resolveFields(propType, firstParam, 0);
      } else if (isFromProject(propType)) {
        if (propType.isUnion()) {
          resolvedType = propType.getUnionTypes()
            .map(t => t.getText(firstParam))
            .join(' | ');
        } else {
          const resolved = propType.getText(firstParam);
          if (resolved !== typeStr) resolvedType = resolved;
        }
      }

      result[name] = { type: typeStr, optional, ...(fields ? { fields } : {}), ...(resolvedType ? { resolvedType } : {}) };
    }
    return Object.keys(result).length > 0 ? result : null;
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
export type FlowmapInspectOptions = {
  exclude?: RegExp[];
  editor?: string;
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
      if (id === RFM_GRAPH_ENTRY_ID) return RFM_GRAPH_ENTRY_ID;
    },

    load(id) {
      if (id === RESOLVED_RFM_CONTEXT_ID) {
        const contextPath = resolve(_pluginDir, '../runtime/rfm-context');
        return `export * from ${JSON.stringify(contextPath)};`;
      }
      if (id === RFM_GRAPH_ENTRY_ID) {
        const graphWindowPath = resolve(_pluginDir, '../ui/graph-window/GraphWindow');
        return [
          `import React from 'react';`,
          `import { createRoot } from 'react-dom/client';`,
          `import { GraphWindow } from ${JSON.stringify(graphWindowPath)};`,
          `const el = document.getElementById('rfm-root');`,
          `if (el) createRoot(el).render(React.createElement(GraphWindow));`,
        ].join('\n');
      }
      return null;
    },

    configureServer(server) {
      // /rfm-graph — 그래프 창 페이지
      server.middlewares.use('/rfm-graph', (req, res, next) => {
        if (req.method !== 'GET') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React Flowmap — Graph</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #rfm-root { margin: 0; padding: 0; height: 100%; width: 100%; }
    </style>
  </head>
  <body>
    <div id="rfm-root"></div>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="${RFM_GRAPH_ENTRY_ID}"></script>
  </body>
</html>`);
      });

      server.middlewares.use('/__rfm-open', (req, res) => {
        const qs = req.url?.split('?')[1] ?? '';
        const params = new URLSearchParams(qs);
        const file     = params.get('file');
        const symbolId = params.get('symbolId');
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
        openInEditor(absPath, line, editorCmd);
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

      // ts-morph prop types 주입
      let finalCode = result.code;
      if (tsProject) {
        const propTypesRegistry = new Map<string, PropTypesMap>();
        for (const symbolId of result.symbolLocs.keys()) {
          const componentName = symbolId.split('#')[1] ?? '';
          const props = extractPropsViaTsMorph(tsProject, id, componentName);
          if (props) propTypesRegistry.set(symbolId, props);
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
