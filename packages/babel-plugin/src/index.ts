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
  /** symbolId → 이 컴포넌트가 JSX에서 직접 렌더하는 컴포넌트 이름 목록 (상대 경로 import 기준) */
  staticJsxMap: Map<string, string[]>;
  /** 라우터별 정적 route manifest */
  routeManifestEntries: RouteManifestEntry[];
};

type RouteManifestEntry = {
  id: string;
  router: 'react-router' | 'tanstack-router';
  urlPath: string;
  type: 'layout' | 'page';
  componentName: string;
  componentImportSource?: string;
  line: number;
};

type RouteComponentRef = {
  componentName: string;
  componentImportSource?: string;
};

type TanStackRouteDef = {
  localName: string;
  parentLocalName?: string;
  path?: string;
  component?: RouteComponentRef;
  line: number;
};

function normalizeRouteUrl(path: string): string {
  if (!path || path === '/') return '/';
  const normalized = path.replace(/\/+/g, '/');
  if (normalized === '/') return '/';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function joinRouteUrl(parentPath: string, childPath?: string, isIndex = false): string {
  const parent = normalizeRouteUrl(parentPath);

  if (isIndex || !childPath || childPath === '/') {
    return parent;
  }

  if (childPath.startsWith('/')) {
    return normalizeRouteUrl(childPath);
  }

  return normalizeRouteUrl(parent === '/' ? `/${childPath}` : `${parent}/${childPath}`);
}

function resolveComponentRef(
  localName: string,
  importMap: Map<string, string>,
): RouteComponentRef | null {
  if (!/^[A-Z]/.test(localName)) return null;

  const importSource = importMap.get(localName);
  if (importSource && importSource.startsWith('.')) {
    return { componentName: localName, componentImportSource: importSource };
  }

  return { componentName: localName };
}

function getJsxIdentifierName(name: unknown): string | null {
  return t.isJSXIdentifier(name) ? (name as { name: string }).name : null;
}

function getObjectPropertyName(key: unknown): string | null {
  if (t.isIdentifier(key)) return (key as { name: string }).name;
  if (t.isStringLiteral(key)) return (key as { value: string }).value;
  return null;
}

function getObjectExpressionProperty(node: unknown, propertyName: string): unknown {
  if (!t.isObjectExpression(node)) return null;
  const objectNode = node as { properties: unknown[] };

  for (const prop of objectNode.properties) {
    if (!t.isObjectProperty(prop) || (prop as { computed: boolean }).computed) continue;
    const objectProp = prop as { key: unknown; value: unknown };
    if (getObjectPropertyName(objectProp.key) === propertyName) return objectProp.value;
  }

  return null;
}

function getStringLiteralValue(node: unknown): string | undefined {
  return t.isStringLiteral(node) ? (node as { value: string }).value : undefined;
}

function getBooleanAttributeValue(attr: unknown): boolean {
  if (!t.isJSXAttribute(attr)) return false;
  const jsxAttr = attr as {
    value?: unknown;
  };
  if (!jsxAttr.value) return true;
  if (
    t.isJSXExpressionContainer(jsxAttr.value)
    && t.isBooleanLiteral((jsxAttr.value as { expression: unknown }).expression)
  ) {
    return ((jsxAttr.value as { expression: { value: boolean } }).expression).value;
  }
  return false;
}

function getJsxAttribute(node: unknown, attrName: string): unknown {
  if (!t.isJSXElement(node)) return null;
  return (node as { openingElement: { attributes: unknown[] } }).openingElement.attributes.find((attr: unknown) => (
    t.isJSXAttribute(attr)
    && t.isJSXIdentifier((attr as { name: unknown }).name)
    && ((attr as { name: { name: string } }).name).name === attrName
  )) ?? null;
}

function readRouteComponentFromJsx(
  routeEl: unknown,
  importMap: Map<string, string>,
): RouteComponentRef | null {
  const componentAttr = getJsxAttribute(routeEl, 'Component');
  if (
    t.isJSXAttribute(componentAttr)
    && (componentAttr as { value?: unknown }).value
    && t.isJSXExpressionContainer((componentAttr as { value: unknown }).value)
    && t.isIdentifier(((componentAttr as { value: { expression: unknown } }).value).expression)
  ) {
    return resolveComponentRef(
      (((componentAttr as { value: { expression: { name: string } } }).value).expression).name,
      importMap,
    );
  }

  const elementAttr = getJsxAttribute(routeEl, 'element');
  if (
    t.isJSXAttribute(elementAttr)
    && (elementAttr as { value?: unknown }).value
    && t.isJSXExpressionContainer((elementAttr as { value: unknown }).value)
    && t.isJSXElement(((elementAttr as { value: { expression: unknown } }).value).expression)
  ) {
    const childName = getJsxIdentifierName(
      ((((elementAttr as { value: { expression: { openingElement: { name: unknown } } } }).value).expression).openingElement).name,
    );
    return childName ? resolveComponentRef(childName, importMap) : null;
  }

  return null;
}

function collectNestedRouteElements(children: unknown[]): unknown[] {
  const routes: unknown[] = [];

  for (const child of children) {
    if (!t.isJSXElement(child)) continue;
    const childName = getJsxIdentifierName((child as { openingElement: { name: unknown } }).openingElement.name);

    if (childName === 'Route') {
      routes.push(child);
      continue;
    }

    routes.push(...collectNestedRouteElements((child as { children: unknown[] }).children));
  }

  return routes;
}

function extractReactRouterRoutes(
  fnPath: unknown,
  relPath: string,
  importMap: Map<string, string>,
): RouteManifestEntry[] {
  const topLevelRoutes: Array<{
    node: unknown;
    line: number;
  }> = [];

  (fnPath as { traverse: (v: unknown) => void }).traverse({
    JSXElement(jsxPath: {
      node: { children: unknown[]; openingElement: { name: unknown; loc?: { start: { line: number } } } };
      parentPath: { node: unknown };
      skip: () => void;
    }) {
      const name = getJsxIdentifierName(jsxPath.node.openingElement.name);
      if (name !== 'Route') return;

      const parentNode = jsxPath.parentPath.node;
      if (
        t.isJSXElement(parentNode)
        && getJsxIdentifierName((parentNode as { openingElement: { name: unknown } }).openingElement.name) === 'Route'
      ) {
        return;
      }

      topLevelRoutes.push({
        node: jsxPath.node,
        line: jsxPath.node.openingElement.loc?.start.line ?? 1,
      });
      jsxPath.skip();
    },
    FunctionDeclaration:     { enter(p: { skip: () => void }) { p.skip(); } },
    FunctionExpression:      { enter(p: { skip: () => void }) { p.skip(); } },
    ArrowFunctionExpression: { enter(p: { skip: () => void }) { p.skip(); } },
  });

  const entries: RouteManifestEntry[] = [];

  function visitRoute(routeEl: unknown, parentUrl: string): void {
    if (!t.isJSXElement(routeEl)) return;

    const pathAttr = getJsxAttribute(routeEl, 'path');
    const indexAttr = getJsxAttribute(routeEl, 'index');
    const path = (
      t.isJSXAttribute(pathAttr)
      && (pathAttr as { value?: unknown }).value
      && t.isStringLiteral((pathAttr as { value: unknown }).value)
    ) ? ((pathAttr as { value: { value: string } }).value).value : undefined;
    const isIndex = getBooleanAttributeValue(indexAttr);
    const component = readRouteComponentFromJsx(routeEl, importMap);
    const nestedRoutes = collectNestedRouteElements((routeEl as { children: unknown[] }).children);
    const urlPath = joinRouteUrl(parentUrl, path, isIndex);
    const line = (routeEl as { openingElement: { loc?: { start: { line: number } } } }).openingElement.loc?.start.line ?? 1;

    if (component) {
      entries.push({
        id: `route:${relPath}:${line}:${component.componentName}`,
        router: 'react-router',
        urlPath,
        type: nestedRoutes.length > 0 ? 'layout' : 'page',
        componentName: component.componentName,
        ...(component.componentImportSource ? { componentImportSource: component.componentImportSource } : {}),
        line,
      });
    }

    for (const childRoute of nestedRoutes) {
      visitRoute(childRoute, urlPath);
    }
  }

  for (const route of topLevelRoutes) {
    visitRoute(route.node, '/');
  }

  return entries;
}

function extractTanStackRoutes(
  routeDefs: Map<string, TanStackRouteDef>,
  relPath: string,
): RouteManifestEntry[] {
  if (routeDefs.size === 0) return [];

  const childCounts = new Map<string, number>();
  for (const route of routeDefs.values()) {
    if (!route.parentLocalName) continue;
    childCounts.set(route.parentLocalName, (childCounts.get(route.parentLocalName) ?? 0) + 1);
  }

  const urlCache = new Map<string, string>();
  const resolveUrl = (localName: string): string => {
    const cached = urlCache.get(localName);
    if (cached) return cached;

    const route = routeDefs.get(localName);
    if (!route) return '/';

    const parentUrl = route.parentLocalName ? resolveUrl(route.parentLocalName) : '/';
    let urlPath = parentUrl;

    if (route.path !== undefined) {
      urlPath = joinRouteUrl(parentUrl, route.path, route.path === '/');
    } else if (!route.parentLocalName) {
      urlPath = '/';
    }

    urlCache.set(localName, urlPath);
    return urlPath;
  };

  return [...routeDefs.values()]
    .filter((route) => route.component)
    .map((route) => ({
      id: `route:${relPath}#${route.localName}`,
      router: 'tanstack-router' as const,
      urlPath: resolveUrl(route.localName),
      type: (childCounts.get(route.localName) ?? 0) > 0 || !route.parentLocalName ? 'layout' : 'page',
      componentName: route.component!.componentName,
      ...(route.component?.componentImportSource
        ? { componentImportSource: route.component.componentImportSource }
        : {}),
      line: route.line,
    }));
}

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
  // localName → importSource (상대 경로 import 추적)
  const importMap = new Map<string, string>();
  // fromSymbolId → [child component names] (JSX 정적 관계)
  const staticJsxMap = new Map<string, string[]>();
  const tanStackRouteDefs = new Map<string, TanStackRouteDef>();
  const reactRouterRouteEntries: RouteManifestEntry[] = [];

  function scanJsxComponents(fnPath: unknown, fromSymbolId: string): void {
    const childNames: string[] = [];
    (fnPath as { traverse: (v: unknown) => void }).traverse({
      JSXOpeningElement(jsxPath: { node: { name: unknown } }) {
        const name = jsxPath.node.name;
        if (t.isJSXIdentifier(name) && /^[A-Z]/.test((name as { name: string }).name)) {
          const localName = (name as { name: string }).name;
          const src = importMap.get(localName);
          if (src && src.startsWith('.') && !childNames.includes(localName)) {
            childNames.push(localName);
          }
        }
      },
    });
    if (childNames.length > 0) staticJsxMap.set(fromSymbolId, childNames);
  }

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
    ImportDeclaration(path: { node: { source: { value: string }; specifiers: unknown[] } }) {
      const source = path.node.source.value;
      for (const specifier of path.node.specifiers) {
        const localName = ((specifier as { local: { name: string } }).local).name;
        importMap.set(localName, source);
      }
    },

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
      scanJsxComponents(path, symbolId);
      reactRouterRouteEntries.push(...extractReactRouterRoutes(path, relPath, importMap));
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
      scanJsxComponents(initPath, symbolId);
      reactRouterRouteEntries.push(...extractReactRouterRoutes(initPath, relPath, importMap));
      injectIntoFn(initPath, symbolId, line, `file:${relPath}`);
      modified = true;
    },

    CallExpression(path: {
      node: {
        callee: unknown;
        arguments: unknown[];
      };
      parent: unknown;
    }) {
      if (!t.isIdentifier(path.node.callee)) return;
      const calleeName = (path.node.callee as { name: string }).name;
      if (!['createRootRoute', 'createRoute'].includes(calleeName)) return;
      if (!t.isVariableDeclarator(path.parent) || !t.isIdentifier((path.parent as { id: unknown }).id)) return;

      const [config] = path.node.arguments;
      if (!t.isObjectExpression(config)) return;

      const parent = path.parent as { id: { name: string }; loc?: { start: { line: number } } };
      const localName = parent.id.name;
      const line = parent.loc?.start.line ?? 1;
      const pathValue = getStringLiteralValue(getObjectExpressionProperty(config, 'path'));
      const parentGetter = getObjectExpressionProperty(config, 'getParentRoute');
      let parentLocalName: string | undefined;
      if (
        t.isArrowFunctionExpression(parentGetter)
        && t.isIdentifier((parentGetter as { body: unknown }).body)
      ) {
        parentLocalName = ((parentGetter as { body: { name: string } }).body).name;
      }

      const componentProp = getObjectExpressionProperty(config, 'component');
      let component: RouteComponentRef | undefined;
      if (t.isIdentifier(componentProp)) {
        component = resolveComponentRef((componentProp as { name: string }).name, importMap) ?? undefined;
      }

      tanStackRouteDefs.set(localName, {
        localName,
        ...(parentLocalName ? { parentLocalName } : {}),
        ...(pathValue !== undefined ? { path: pathValue } : {}),
        ...(component ? { component } : {}),
        line,
      });
    },

    // router/library 패턴: { component: () => <JSX /> }
    // e.g. createRootRoute({ component: () => <Outlet /> })
    ObjectProperty(
      path: {
        node: {
          computed: boolean;
          key: { name?: string; value?: string };
          value: { type: string };
          loc?: { start: { line: number } };
        };
        get: (k: string) => unknown;
      },
    ) {
      if (path.node.computed) return;
      const keyName = path.node.key.name ?? path.node.key.value ?? '';
      const componentKeys = ['component', 'errorComponent', 'pendingComponent', 'notFoundComponent'];
      if (!componentKeys.includes(keyName)) return;

      const valueType = path.node.value.type;
      if (valueType !== 'ArrowFunctionExpression' && valueType !== 'FunctionExpression') return;

      // 파일명 기반으로 합성 이름 생성 (e.g. routes/__root.tsx → _Root)
      const baseName = relPath
        .replace(/\.[jt]sx?$/, '')
        .split(/[/\\]/).pop()!
        .replace(/^_+/, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        || 'Unknown';
      const cap = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const suffix = keyName === 'component' ? ''
        : keyName.replace('Component', '').replace(/^(.)/, (_: string, c: string) => c.toUpperCase());
      const syntheticName = `_${cap}${suffix}`;

      const line = path.node.loc?.start.line ?? 1;
      const symbolId = `symbol:${relPath}#${syntheticName}`;
      symbolLocs.set(symbolId, line);

      const valuePath = path.get('value');
      scanJsxComponents(valuePath, symbolId);
      injectIntoFn(valuePath, symbolId, line, `file:${relPath}`);

      // Object.assign으로 __rfm_symbolId / __rfm_loc 인라인 주입
      path.node.value = t.callExpression(
        t.memberExpression(t.identifier('Object'), t.identifier('assign')),
        [
          path.node.value,
          t.objectExpression([
            t.objectProperty(t.identifier('__rfm_symbolId'), t.stringLiteral(symbolId)),
            t.objectProperty(t.identifier('__rfm_loc'), t.stringLiteral(String(line))),
          ]),
        ],
      );

      modified = true;
    },
  });

  const routeManifestEntries = [
    ...reactRouterRouteEntries,
    ...extractTanStackRoutes(tanStackRouteDefs, relPath),
  ];

  if (!modified && routeManifestEntries.length === 0) return null;

  if (!modified) {
    return { code, map: null, symbolLocs, staticJsxMap, routeManifestEntries };
  }

  const { code: newCode, map } = generate(
    ast,
    { sourceMaps: true, sourceFileName: fileId },
    code,
  ) as { code: string; map: unknown };

  return { code: newCode, map, symbolLocs, staticJsxMap, routeManifestEntries };
}
