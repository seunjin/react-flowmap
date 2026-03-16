import { exec } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, TypeFormatFlags, ts } from 'ts-morph';
import type { Plugin } from 'vite';

const _require = createRequire(import.meta.url);

// @babel packages are transitive deps of @vitejs/plugin-react
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parser = _require('@babel/parser') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverseModule = _require('@babel/traverse') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateModule = _require('@babel/generator') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = _require('@babel/types') as any;

const traverse = traverseModule.default ?? traverseModule;
const generate = generateModule.default ?? generateModule;

// Virtual module ID
const GORI_CONTEXT_ID = 'virtual:gori/context';
const RESOLVED_GORI_CONTEXT_ID = '\0' + GORI_CONTEXT_ID;

// Plugin 파일 위치 기반으로 runtime context 파일 경로 계산
const _pluginDir = dirname(fileURLToPath(import.meta.url));

// ─── JSX에 data-gori-id / data-gori-loc 속성 추가 ────────────────────────────
function addAttr(node: unknown, symbolId: string, line: number): void {
  if (t.isJSXElement(node)) {
    const el = node as { openingElement: { attributes: unknown[] } };
    const alreadyHas = el.openingElement.attributes.some(
      (a: unknown) =>
        t.isJSXAttribute(a) &&
        t.isJSXIdentifier((a as { name: unknown }).name) &&
        (a as { name: { name: string } }).name.name === 'data-gori-id'
    );
    if (alreadyHas) return;

    el.openingElement.attributes.unshift(
      t.jsxAttribute(t.jsxIdentifier('data-gori-id'),  t.stringLiteral(symbolId)),
      t.jsxAttribute(t.jsxIdentifier('data-gori-loc'), t.stringLiteral(String(line))),
    );
  } else if (t.isConditionalExpression(node)) {
    const n = node as { consequent: unknown; alternate: unknown };
    addAttr(n.consequent, symbolId, line);
    addAttr(n.alternate, symbolId, line);
  } else if (t.isLogicalExpression(node) && (node as { operator: string }).operator === '&&') {
    addAttr((node as { right: unknown }).right, symbolId, line);
  }
}

// ─── JSX를 __GoriCtx.Provider로 감싸기 ───────────────────────────────────────
function createProviderElement(child: unknown, symbolId: string): unknown {
  const memberExpr = t.jsxMemberExpression(
    t.jsxIdentifier('__GoriCtx'),
    t.jsxIdentifier('Provider'),
  );
  const openingEl = t.jsxOpeningElement(
    memberExpr,
    [t.jsxAttribute(t.jsxIdentifier('value'), t.stringLiteral(symbolId))],
    false,
  );
  const closingEl = t.jsxClosingElement(memberExpr);
  return t.jsxElement(openingEl, closingEl, [child], false);
}

function wrapWithProvider(node: unknown, symbolId: string): unknown {
  if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    return createProviderElement(node, symbolId);
  } else if (t.isConditionalExpression(node)) {
    const n = node as { consequent: unknown; alternate: unknown };
    n.consequent = wrapWithProvider(n.consequent, symbolId);
    n.alternate  = wrapWithProvider(n.alternate,  symbolId);
    return node;
  } else if (t.isLogicalExpression(node) && (node as { operator: string }).operator === '&&') {
    (node as { right: unknown }).right = wrapWithProvider(
      (node as { right: unknown }).right, symbolId,
    );
    return node;
  }
  return node;
}

// ─── 함수에 Context 훅 주입 + Provider 래핑 ──────────────────────────────────
function injectIntoFn(fnPath: unknown, symbolId: string, line: number, fileRef: string): void {
  const fn = fnPath as {
    node: { type: string; body: unknown };
    traverse: (v: unknown) => void;
  };

  // 화살표 함수 표현식 바디를 블록으로 변환: () => <div> → () => { return <div>; }
  if (fn.node.type === 'ArrowFunctionExpression' && !t.isBlockStatement(fn.node.body)) {
    fn.node.body = t.blockStatement([t.returnStatement(fn.node.body)]);
  }

  // 블록 바디 최상단에 Context 훅 주입
  if (t.isBlockStatement(fn.node.body)) {
    const body = fn.node.body as { body: unknown[] };
    const constDecl = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('__goriParent'),
        t.callExpression(t.identifier('__goriUseContext'), [t.identifier('__GoriCtx')]),
      ),
    ]);
    const recordCall = t.expressionStatement(
      t.callExpression(t.identifier('__useGoriRecord'), [
        t.identifier('__goriParent'),
        t.stringLiteral(symbolId),
        t.stringLiteral(fileRef),
      ]),
    );
    body.body.unshift(constDecl, recordCall);
  }

  // ReturnStatement의 JSX에 data-gori-id 추가 + Provider 래핑
  fn.traverse({
    ReturnStatement(retPath: { node: { argument: unknown } }) {
      if (retPath.node.argument) {
        addAttr(retPath.node.argument, symbolId, line);
        retPath.node.argument = wrapWithProvider(retPath.node.argument, symbolId);
      }
    },
    // 중첩 함수는 건너뜀 (해당 함수가 컴포넌트라면 자체적으로 처리됨)
    FunctionDeclaration:     { enter(p: { skip: () => void }) { p.skip(); } },
    FunctionExpression:      { enter(p: { skip: () => void }) { p.skip(); } },
    ArrowFunctionExpression: { enter(p: { skip: () => void }) { p.skip(); } },
  });
}

// ─── ts-morph Props 타입 추출 ─────────────────────────────────────────────────
export type PropTypeEntry = { type: string; optional: boolean };
export type PropTypesMap  = Record<string, PropTypeEntry>;

function extractPropsViaTsMorph(
  tsProject: Project,
  absPath: string,
  componentName: string,
): PropTypesMap | null {
  try {
    // 파일이 없으면 추가, 있으면 재사용 (캐싱)
    let sf = tsProject.getSourceFile(absPath);
    if (!sf) sf = tsProject.addSourceFileAtPathIfExists(absPath);
    if (!sf) return null;

    // 함수 선언 또는 변수 선언에서 컴포넌트 찾기
    const fnDecl = sf.getFunction(componentName);
    const varDecl = sf.getVariableDeclaration(componentName);
    const node = fnDecl ?? varDecl;
    if (!node) return null;

    // 첫 번째 파라미터 타입 취득
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
      result[name] = {
        // alias 이름 우선 (Product, CartItem 등) — 내부 shape 완전 전개 안 함
        type: propType.getText(firstParam, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
        optional,
      };
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
export type GoriInspectOptions = {
  /** 변환에서 제외할 파일 경로 패턴 (정규식) */
  exclude?: RegExp[];
  /**
   * 에디터 명령어. VITE_EDITOR 환경변수가 있으면 그것을 우선합니다.
   * @example 'cursor' | 'code' | 'windsurf' | 'zed' | 'antigravity'
   */
  editor?: string;
};

export function goriInspect(options: GoriInspectOptions = {}): Plugin {
  let root = process.cwd();
  let editorCmd = process.env['VITE_EDITOR'] ?? options.editor ?? process.env['EDITOR'] ?? 'code';
  let isDev = false;
  // transform 시 수집: symbolId → 줄번호
  const symbolLocMap = new Map<string, number>();
  // ts-morph Project (dev 서버 시작 시 초기화)
  let tsProject: Project | null = null;

  const defaultExclude = [/component-overlay/, /vite-plugin/, /gori-context/];
  const excludePatterns = [...defaultExclude, ...(options.exclude ?? [])];

  return {
    name: 'gori-inspect',
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
            skipAddingFilesFromTsConfig: true, // 필요한 파일만 on-demand 로드
          });
        } catch {
          tsProject = null;
        }
      }
    },

    // ─── virtual:gori/context 모듈 제공 ──────────────────────────────────────
    resolveId(id) {
      if (id === GORI_CONTEXT_ID) return RESOLVED_GORI_CONTEXT_ID;
    },

    load(id) {
      if (id !== RESOLVED_GORI_CONTEXT_ID) return null;
      const contextPath = resolve(_pluginDir, '../runtime/gori-context');
      return `export * from ${JSON.stringify(contextPath)};`;
    },

    // ─── dev server: /__gori-open?file=<relPath>&line=<n> ─────────────────────
    configureServer(server) {
      server.middlewares.use('/__gori-open', (req, res) => {
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
      // 파일 변경 시 ts-morph 캐시 무효화
      if (tsProject && /\.[jt]sx?$/.test(file)) {
        const sf = tsProject.getSourceFile(file);
        if (sf) sf.refreshFromFileSystemSync();
      }
    },

    transform(code: string, id: string) {
      if (!isDev) return null;
      if (!/\.[jt]sx$/.test(id)) return null;
      if (id.includes('node_modules')) return null;
      if (excludePatterns.some((re) => re.test(id))) return null;

      const relPath = relative(root, id).replace(/\\/g, '/');

      let ast: unknown;
      try {
        ast = parser.parse(code, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
          errorRecovery: true,
        });
      } catch {
        return null;
      }

      let modified = false;
      const propTypesRegistry = new Map<string, PropTypesMap>();

      traverse(ast, {
        // 변환이 발생한 경우 파일 상단에 import 주입
        Program: {
          exit(path: unknown) {
            if (!modified) return;
            const p = path as { unshiftContainer: (key: string, nodes: unknown[]) => void };
            p.unshiftContainer('body', [
              t.importDeclaration(
                [t.importSpecifier(t.identifier('__goriUseContext'), t.identifier('useContext'))],
                t.stringLiteral('react'),
              ),
              t.importDeclaration(
                [
                  t.importSpecifier(t.identifier('__GoriCtx'), t.identifier('__GoriCtx')),
                  t.importSpecifier(t.identifier('__useGoriRecord'), t.identifier('__useGoriRecord')),
                ],
                t.stringLiteral(GORI_CONTEXT_ID),
              ),
            ]);
          },
        },

        // function MyComponent() { ... }
        FunctionDeclaration(path: { node: { id: { name: string } | null; loc?: { start: { line: number } } } }) {
          const name = path.node.id?.name;
          if (!name || !/^[A-Z]/.test(name)) return;
          const line = path.node.loc?.start.line ?? 1;
          const symbolId = `symbol:${relPath}#${name}`;
          symbolLocMap.set(symbolId, line);
          injectIntoFn(path, symbolId, line, `file:${relPath}`);
          if (tsProject) {
            const props = extractPropsViaTsMorph(tsProject, id, name);
            if (props) propTypesRegistry.set(symbolId, props);
          }
          modified = true;
        },

        // const MyComponent = () => ... or function() { ... }
        VariableDeclarator(
          path: {
            node: {
              id: unknown;
              init: { type: string } | null;
              loc?: { start: { line: number } };
            };
          }
        ) {
          if (!t.isIdentifier(path.node.id)) return;
          const name = (path.node.id as { name: string }).name;
          if (!/^[A-Z]/.test(name)) return;

          const init = path.node.init;
          if (
            !init ||
            (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression')
          ) {
            return;
          }

          const line = path.node.loc?.start.line ?? 1;
          const symbolId = `symbol:${relPath}#${name}`;
          symbolLocMap.set(symbolId, line);
          const initPath = (path as unknown as { get: (k: string) => unknown }).get('init');
          injectIntoFn(initPath, symbolId, line, `file:${relPath}`);
          if (tsProject) {
            const props = extractPropsViaTsMorph(tsProject, id, name);
            if (props) propTypesRegistry.set(symbolId, props);
          }
          modified = true;
        },
      });

      if (!modified) return null;

      const { code: newCode, map } = generate(
        ast,
        { sourceMaps: true, sourceFileName: id },
        code
      ) as { code: string; map: string };

      // prop types 레지스트리 주입
      let finalCode = newCode;
      if (propTypesRegistry.size > 0) {
        const lines = ['\n// __gori prop types', '(globalThis.__goriPropTypes??={});'];
        for (const [sid, props] of propTypesRegistry) {
          lines.push(`globalThis.__goriPropTypes[${JSON.stringify(sid)}]=${JSON.stringify(props)};`);
        }
        finalCode += lines.join('\n');
      }

      return { code: finalCode, map };
    },
  };
}
