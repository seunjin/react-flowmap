import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

// @babel/* packages are deps of @vitejs/plugin-react and next.js — resolved transitively
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parser = _require('@babel/parser') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverseModule = _require('@babel/traverse') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateModule = _require('@babel/generator') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = _require('@babel/types') as any;

const traverse = traverseModule.default ?? traverseModule;
const generate  = generateModule.default ?? generateModule;

export const DEFAULT_CONTEXT_IMPORT = 'virtual:rfm/context';

const DEFAULT_EXCLUDE = [
  /\/ui\/inspector\//,   // inspector UI 소스 — 라이브러리 내부
  /\/ui\/graph-window\//, // 그래프 창 UI 소스
  /vite-plugin/,
  /rfm-context/,
  /rfm-runtime/,
];

// ─── JSX를 __RfmCtx.Provider로 감싸기 ────────────────────────────────────────
function createProviderElement(child: unknown, symbolId: string): unknown {
  const memberExpr = t.jsxMemberExpression(
    t.jsxIdentifier('__RfmCtx'),
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
function injectIntoFn(fnPath: unknown, symbolId: string, _line: number, fileRef: string): void {
  const fn = fnPath as {
    node: { type: string; body: unknown };
    traverse: (v: unknown) => void;
  };

  if (fn.node.type === 'ArrowFunctionExpression' && !t.isBlockStatement(fn.node.body)) {
    fn.node.body = t.blockStatement([t.returnStatement(fn.node.body)]);
  }

  if (t.isBlockStatement(fn.node.body)) {
    const body = fn.node.body as { body: unknown[] };
    const constDecl = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('__rfmParent'),
        t.callExpression(t.identifier('__rfmUseContext'), [t.identifier('__RfmCtx')]),
      ),
    ]);
    const recordCall = t.expressionStatement(
      t.callExpression(t.identifier('__useRfmRecord'), [
        t.identifier('__rfmParent'),
        t.stringLiteral(symbolId),
        t.stringLiteral(fileRef),
      ]),
    );
    body.body.unshift(constDecl, recordCall);
  }

  fn.traverse({
    ReturnStatement(retPath: { node: { argument: unknown } }) {
      if (retPath.node.argument) {
        retPath.node.argument = wrapWithProvider(retPath.node.argument, symbolId);
      }
    },
    FunctionDeclaration:     { enter(p: { skip: () => void }) { p.skip(); } },
    FunctionExpression:      { enter(p: { skip: () => void }) { p.skip(); } },
    ArrowFunctionExpression: { enter(p: { skip: () => void }) { p.skip(); } },
  });
}

// ─── 공개 타입 ─────────────────────────────────────────────────────────────────
export type TransformOptions = {
  /** 프로젝트 루트 기준 상대 경로 (symbolId 생성에 사용) */
  relPath: string;
  /** Context 훅/Provider import 경로. Vite: 'virtual:rfm/context', Next: 'react-flowmap/context' */
  contextImport?: string;
  /** 변환 제외 패턴 */
  exclude?: RegExp[];
};

export type TransformResult = {
  code: string;
  map: unknown;
  /** symbolId → 소스 라인 번호 (에디터 열기용) */
  symbolLocs: Map<string, number>;
};

// ─── 핵심 변환 함수 ───────────────────────────────────────────────────────────
/**
 * JSX 파일에 react-flowmap Context 훅·속성을 주입합니다.
 * @param code   원본 소스 코드
 * @param fileId 절대 경로 (exclude 패턴 매칭에 사용)
 * @param opts   변환 옵션
 */
export function transformFlowmap(
  code: string,
  fileId: string,
  opts: TransformOptions,
): TransformResult | null {
  if (!/\.[jt]sx$/.test(fileId)) return null;
  if (fileId.includes('node_modules')) return null;

  const excludePatterns = [...DEFAULT_EXCLUDE, ...(opts.exclude ?? [])];
  if (excludePatterns.some((re) => re.test(fileId))) return null;

  const { relPath, contextImport = DEFAULT_CONTEXT_IMPORT } = opts;
  const symbolLocs = new Map<string, number>();
  // Collect component defs to add __rfm_symbolId / __rfm_loc static props at module level
  const componentDefs: { name: string; symbolId: string; line: number }[] = [];

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

  traverse(ast, {
    Program: {
      exit(path: unknown) {
        if (!modified) return;
        const p = path as {
          unshiftContainer: (key: string, nodes: unknown[]) => void;
          pushContainer: (key: string, nodes: unknown[]) => void;
        };
        p.unshiftContainer('body', [
          t.importDeclaration(
            [t.importSpecifier(t.identifier('__rfmUseContext'), t.identifier('useContext'))],
            t.stringLiteral('react'),
          ),
          t.importDeclaration(
            [
              t.importSpecifier(t.identifier('__RfmCtx'),       t.identifier('__RfmCtx')),
              t.importSpecifier(t.identifier('__useRfmRecord'), t.identifier('__useRfmRecord')),
            ],
            t.stringLiteral(contextImport),
          ),
        ]);
        // Assign __rfm_symbolId and __rfm_loc to each component function
        for (const { name, symbolId, line } of componentDefs) {
          p.pushContainer('body', [
            t.expressionStatement(
              t.assignmentExpression('=',
                t.memberExpression(t.identifier(name), t.identifier('__rfm_symbolId')),
                t.stringLiteral(symbolId),
              ),
            ),
            t.expressionStatement(
              t.assignmentExpression('=',
                t.memberExpression(t.identifier(name), t.identifier('__rfm_loc')),
                t.stringLiteral(String(line)),
              ),
            ),
          ]);
        }
      },
    },

    FunctionDeclaration(path: { node: { id: { name: string } | null; loc?: { start: { line: number } } } }) {
      const name = path.node.id?.name;
      if (!name || !/^[A-Z]/.test(name)) return;
      const line = path.node.loc?.start.line ?? 1;
      const symbolId = `symbol:${relPath}#${name}`;
      symbolLocs.set(symbolId, line);
      componentDefs.push({ name, symbolId, line });
      injectIntoFn(path, symbolId, line, `file:${relPath}`);
      modified = true;
    },

    VariableDeclarator(
      path: {
        node: {
          id: unknown;
          init: { type: string } | null;
          loc?: { start: { line: number } };
        };
      },
    ) {
      if (!t.isIdentifier(path.node.id)) return;
      const name = (path.node.id as { name: string }).name;
      if (!/^[A-Z]/.test(name)) return;
      const init = path.node.init;
      if (!init || (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression')) {
        return;
      }
      const line = path.node.loc?.start.line ?? 1;
      const symbolId = `symbol:${relPath}#${name}`;
      symbolLocs.set(symbolId, line);
      componentDefs.push({ name, symbolId, line });
      const initPath = (path as unknown as { get: (k: string) => unknown }).get('init');
      injectIntoFn(initPath, symbolId, line, `file:${relPath}`);
      modified = true;
    },
  });

  if (!modified) return null;

  const { code: newCode, map } = generate(
    ast,
    { sourceMaps: true, sourceFileName: fileId },
    code,
  ) as { code: string; map: unknown };

  return { code: newCode, map, symbolLocs };
}
