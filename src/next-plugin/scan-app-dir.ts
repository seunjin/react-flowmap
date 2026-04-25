import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { Project, TypeFormatFlags, ts } from 'ts-morph';
import type { RfmNextRoute, RfmNextServerComponent, PropTypeEntry } from '../ui/inspector/types.js';

// Next.js App Router에서 라우트로 인식되는 파일 타입
const ROUTE_FILE_TYPES = ['layout', 'page', 'loading', 'error', 'not-found', 'template'] as const;
type RouteFileType = typeof ROUTE_FILE_TYPES[number];

const MAX_IMPORT_DEPTH = 8;

function getRouteFileType(basename: string): RouteFileType | null {
  const name = basename.replace(/\.(tsx?|jsx?)$/, '');
  return (ROUTE_FILE_TYPES as readonly string[]).includes(name)
    ? (name as RouteFileType)
    : null;
}

/** 파일에서 default export 컴포넌트 이름을 정규식으로 추출 */
function extractComponentName(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match =
      content.match(/export\s+default\s+(?:async\s+)?function\s+([A-Z]\w*)/) ??
      content.match(/export\s+default\s+([A-Z]\w*)/);
    if (match?.[1] && match[1] !== 'function' && match[1] !== 'class') return match[1];
  } catch { /* ignore */ }
  return '';
}

/** 파일 상단에 'use client' 지시어가 있는지 확인 */
function isClientComponent(filePath: string): boolean {
  try {
    const head = readFileSync(filePath, 'utf-8').trimStart().slice(0, 200);
    return head.startsWith("'use client'") || head.startsWith('"use client"');
  } catch {
    return false;
  }
}

/** 디렉토리 세그먼트 배열 → URL 경로 문자열 */
function buildUrlPath(segments: string[]): string {
  const parts = segments.filter(s => {
    if (s.startsWith('(') && s.endsWith(')')) return false;
    if (s.startsWith('@')) return false;
    return true;
  });
  return parts.length === 0 ? '/' : '/' + parts.join('/');
}

/** URL/폴더 세그먼트로부터 컴포넌트 이름 유도 (fallback) */
function deriveComponentName(segments: string[], type: RouteFileType): string {
  const cleanSegments = segments
    .filter(s => !(s.startsWith('(') && s.endsWith(')')))
    .filter(s => !s.startsWith('@'))
    .map(s => s.replace(/^\[+\.{0,3}/, '').replace(/\]+$/, ''))
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1));

  const prefix = cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1]! : 'Root';
  const suffix = type.charAt(0).toUpperCase() + type.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return `${prefix}${suffix}`;
}

// ─── ts-morph Props 타입 추출 ────────────────────────────────────────────────

function extractPropTypes(
  project: Project,
  absFilePath: string,
  componentName: string,
): Record<string, PropTypeEntry> | undefined {
  try {
    let sf = project.getSourceFile(absFilePath);
    if (!sf) sf = project.addSourceFileAtPathIfExists(absFilePath) ?? undefined;
    if (!sf) return undefined;

    const fnDecl = sf.getFunction(componentName);
    const varDecl = sf.getVariableDeclaration(componentName);
    const params = fnDecl
      ? fnDecl.getParameters()
      : varDecl?.getInitializerIfKind(ts.SyntaxKind.ArrowFunction)?.getParameters()
        ?? varDecl?.getInitializerIfKind(ts.SyntaxKind.FunctionExpression)?.getParameters()
        ?? [];
    if (params.length === 0) return undefined;

    const firstParam = params[0]!;
    const type = firstParam.getType();
    const props: Record<string, PropTypeEntry> = {};
    for (const prop of type.getProperties()) {
      const name = prop.getName();
      if (name === 'children') continue;
      const propType = prop.getTypeAtLocation(firstParam);
      const optional = prop.hasFlags(ts.SymbolFlags.Optional);
      const typeStr = propType.getText(firstParam, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
      props[name] = { type: typeStr, optional };
    }
    return Object.keys(props).length > 0 ? props : undefined;
  } catch {
    return undefined;
  }
}

// ─── ts-morph 정적 import 분석 ─────────────────────────────────────────────

/**
 * 파일의 import 선언을 ts-morph로 분석해 컴포넌트 트리를 재귀적으로 구성.
 * - .tsx/.jsx 파일만 추적 (유틸, 타입 파일 제외)
 * - 'use client' 컴포넌트에서는 재귀를 멈춤 (런타임 트리에서 추적됨)
 * - ancestors Set으로 순환 import 방지
 */
function buildImportTree(
  absFilePath: string,
  project: Project,
  projectRoot: string,
  ancestors: Set<string>,
  depth: number,
): RfmNextServerComponent[] {
  if (depth >= MAX_IMPORT_DEPTH || ancestors.has(absFilePath)) return [];

  let sf = project.getSourceFile(absFilePath);
  if (!sf) sf = project.addSourceFileAtPathIfExists(absFilePath) ?? undefined;
  if (!sf) return [];

  const newAncestors = new Set(ancestors);
  newAncestors.add(absFilePath);

  const children: RfmNextServerComponent[] = [];

  for (const importDecl of sf.getImportDeclarations()) {
    const resolvedSf = importDecl.getModuleSpecifierSourceFile();
    if (!resolvedSf) continue;

    const importedAbs = resolvedSf.getFilePath();

    // node_modules 제외
    if (importedAbs.includes('node_modules')) continue;
    // .tsx/.jsx 파일만 추적 (React 컴포넌트 파일)
    if (!/\.[jt]sx$/.test(importedAbs)) continue;

    const client = isClientComponent(importedAbs);
    const relPath = relative(projectRoot, importedAbs).replace(/\\/g, '/');
    const componentName =
      extractComponentName(importedAbs) ||
      basename(importedAbs).replace(/\.[jt]sx?$/, '');

    // 클라이언트 컴포넌트 경계: 자신은 표시하되 그 아래로는 재귀하지 않음
    const grandChildren = client
      ? []
      : buildImportTree(importedAbs, project, projectRoot, newAncestors, depth + 1);

    children.push({
      filePath: relPath,
      componentName,
      nodeKind: client ? 'client-boundary' : 'server-component',
      executionKind: client ? 'live' : 'static',
      isServer: !client,
      ...(grandChildren.length > 0 ? { children: grandChildren } : {}),
    });
  }

  return children;
}

// ─── 디렉토리 스캔 ─────────────────────────────────────────────────────────

function scanDir(
  dir: string,
  appDirRoot: string,
  projectRoot: string,
  segments: string[],
  results: RfmNextRoute[],
  project: Project | null,
): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.startsWith('_') || entry === 'node_modules') continue;

    const fullPath = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(fullPath).isDirectory();
    } catch {
      continue;
    }

    if (isDir) {
      scanDir(fullPath, appDirRoot, projectRoot, [...segments, entry], results, project);
    } else {
      const type = getRouteFileType(entry);
      if (!type) continue;

      const filePath = relative(projectRoot, fullPath).replace(/\\/g, '/');
      const urlPath = buildUrlPath(segments);
      const componentName =
        extractComponentName(fullPath) || deriveComponentName(segments, type);
      const isServer = !isClientComponent(fullPath);

      // ts-morph import 분석으로 하위 컴포넌트 트리 구성
      const children = project
        ? buildImportTree(fullPath, project, projectRoot, new Set<string>(), 0)
        : [];

      const propTypes = (project && componentName)
        ? extractPropTypes(project, fullPath, componentName)
        : undefined;

      results.push({
        router: 'next',
        urlPath,
        filePath,
        type,
        componentName,
        nodeKind: 'route',
        executionKind: isServer ? 'static' : 'live',
        isServer,
        ...(propTypes ? { propTypes } : {}),
        ...(children.length > 0 ? { children } : {}),
      });
    }
  }
}

/**
 * Next.js App Router의 app/ 디렉토리를 스캔해 라우트 목록을 반환.
 * ts-morph로 각 라우트 파일의 import를 재귀 분석해 컴포넌트 트리를 구성.
 */
export function scanAppDirectory(projectRoot: string): RfmNextRoute[] {
  const candidates = [
    join(projectRoot, 'app'),
    join(projectRoot, 'src', 'app'),
  ];

  for (const appDir of candidates) {
    try {
      statSync(appDir);
    } catch {
      continue;
    }

    // ts-morph Project 초기화 (tsconfig.json 경로 별칭 등 자동 해석)
    let project: Project | null = null;
    const tsconfigPath = resolve(projectRoot, 'tsconfig.json');
    try {
      project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
      });
    } catch {
      project = null;
    }

    const results: RfmNextRoute[] = [];
    scanDir(appDir, appDir, projectRoot, [], results, project);

    // 정렬: 깊이 → 파일 타입(layout 우선) → 경로
    results.sort((a, b) => {
      const da = a.urlPath.split('/').length;
      const db = b.urlPath.split('/').length;
      if (da !== db) return da - db;
      const ta = ROUTE_FILE_TYPES.indexOf(a.type as RouteFileType);
      const tb = ROUTE_FILE_TYPES.indexOf(b.type as RouteFileType);
      if (ta !== tb) return ta - tb;
      return a.filePath.localeCompare(b.filePath);
    });

    return results;
  }

  return [];
}
