import { exec } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// ─── Prop 타입 추출 ───────────────────────────────────────────────────────────

/** TSTypeLiteral 멤버 배열 → { propName: 'typeString' } */
function membersToRecord(members: unknown[], code: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const m of members as Array<{ type: string; key?: { name?: string; value?: string }; typeAnnotation?: { typeAnnotation?: { start: number; end: number } } }>) {
    if (m.type !== 'TSPropertySignature') continue;
    const key = m.key?.name ?? m.key?.value;
    if (!key) continue;
    const typeAnn = m.typeAnnotation?.typeAnnotation;
    result[key] = typeAnn ? code.slice(typeAnn.start, typeAnn.end) : 'unknown';
  }
  return result;
}

/** AST에서 type/interface 이름으로 타입 멤버 탐색 */
function findTypeDef(name: string, ast: unknown, traverse_: typeof traverse): Record<string, string> | null {
  let found: Record<string, string> | null = null;
  traverse_(ast, {
    TSTypeAliasDeclaration(path: { node: { id?: { name?: string }; typeAnnotation: unknown }; stop: () => void }) {
      if (path.node.id?.name !== name) return;
      const ta = path.node.typeAnnotation as { type?: string; members?: unknown[] };
      if (ta?.type === 'TSTypeLiteral' && ta.members) {
        found = membersToRecord(ta.members, '');
      }
      path.stop();
    },
    TSInterfaceDeclaration(path: { node: { id?: { name?: string }; body: { body: unknown[] } }; stop: () => void }) {
      if (path.node.id?.name !== name) return;
      found = membersToRecord(path.node.body.body, '');
      path.stop();
    },
  });
  return found;
}

/** 컴포넌트 함수 노드에서 props 타입 추출 */
function extractPropTypes(
  fnNode: { params?: Array<{ type: string; typeAnnotation?: { typeAnnotation?: { type?: string; typeName?: { name?: string }; members?: unknown[]; start: number; end: number } } }> },
  ast: unknown,
  code: string,
  traverse_: typeof traverse,
): Record<string, string> | null {
  const firstParam = fnNode.params?.[0];
  if (!firstParam || firstParam.type !== 'ObjectPattern' || !firstParam.typeAnnotation) return null;

  const typeNode = firstParam.typeAnnotation.typeAnnotation;
  if (!typeNode) return null;

  if (typeNode.type === 'TSTypeLiteral' && typeNode.members) {
    return membersToRecord(typeNode.members, code);
  }
  if (typeNode.type === 'TSTypeReference' && typeNode.typeName?.name) {
    return findTypeDef(typeNode.typeName.name, ast, traverse_);
  }
  return null;
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
      // 이 파일에서 수집된 symbolId → prop types
      const propTypesRegistry = new Map<string, Record<string, string>>();

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
        FunctionDeclaration(path: { node: { id: { name: string } | null; loc?: { start: { line: number } }; params?: unknown[] } }) {
          const name = path.node.id?.name;
          if (!name || !/^[A-Z]/.test(name)) return;
          const line = path.node.loc?.start.line ?? 1;
          const symbolId = `symbol:${relPath}#${name}`;
          symbolLocMap.set(symbolId, line);
          injectIntoFn(path, symbolId, line, `file:${relPath}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const props = extractPropTypes(path.node as any, ast, code, traverse);
          if (props && Object.keys(props).length > 0) propTypesRegistry.set(symbolId, props);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const props = extractPropTypes((path.node.init as any), ast, code, traverse);
          if (props && Object.keys(props).length > 0) propTypesRegistry.set(symbolId, props);
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
        const lines: string[] = ['\n// __gori prop types', '(globalThis.__goriPropTypes??={});'];
        for (const [sid, props] of propTypesRegistry) {
          lines.push(`globalThis.__goriPropTypes[${JSON.stringify(sid)}]=${JSON.stringify(props)};`);
        }
        finalCode += lines.join('\n');
      }

      return { code: finalCode, map };
    },
  };
}
