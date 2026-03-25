import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RfmNextRoute } from '../ui/inspector/types.js';

// Next.js App Router에서 라우트로 인식되는 파일 타입
const ROUTE_FILE_TYPES = ['layout', 'page', 'loading', 'error', 'not-found', 'template'] as const;
type RouteFileType = typeof ROUTE_FILE_TYPES[number];

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

/** 디렉토리 세그먼트 배열 → URL 경로 문자열
 *  - (group) 라우트 그룹은 URL에서 제거
 *  - @parallel 병렬 라우트 슬롯은 제거
 */
function buildUrlPath(segments: string[]): string {
  const parts = segments.filter(s => {
    if (s.startsWith('(') && s.endsWith(')')) return false; // route group
    if (s.startsWith('@')) return false;                     // parallel route
    return true;
  });
  return parts.length === 0 ? '/' : '/' + parts.join('/');
}

/** URL/폴더 세그먼트로부터 컴포넌트 이름 유도 (fallback) */
function deriveComponentName(segments: string[], type: RouteFileType): string {
  const cleanSegments = segments
    .filter(s => !(s.startsWith('(') && s.endsWith(')')))
    .filter(s => !s.startsWith('@'))
    .map(s => s.replace(/^\[+\.{0,3}/, '').replace(/\]+$/, '')) // strip [] [[]] [[...]]
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1));

  const prefix = cleanSegments.length > 0 ? cleanSegments[cleanSegments.length - 1]! : 'Root';
  const suffix = type.charAt(0).toUpperCase() + type.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return `${prefix}${suffix}`;
}

function scanDir(
  dir: string,
  appDirRoot: string,
  projectRoot: string,
  segments: string[],
  results: RfmNextRoute[],
): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    // _private 폴더, node_modules 제외
    if (entry.startsWith('_') || entry === 'node_modules') continue;

    const fullPath = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(fullPath).isDirectory();
    } catch {
      continue;
    }

    if (isDir) {
      scanDir(fullPath, appDirRoot, projectRoot, [...segments, entry], results);
    } else {
      const type = getRouteFileType(entry);
      if (!type) continue;

      const filePath = relative(projectRoot, fullPath).replace(/\\/g, '/');
      const urlPath = buildUrlPath(segments);
      const componentName =
        extractComponentName(fullPath) || deriveComponentName(segments, type);
      const isServer = !isClientComponent(fullPath);

      results.push({ urlPath, filePath, type, componentName, isServer });
    }
  }
}

/**
 * Next.js App Router의 app/ 디렉토리를 스캔해 라우트 목록을 반환.
 * app/ 또는 src/app/ 을 자동 탐지.
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

    const results: RfmNextRoute[] = [];
    scanDir(appDir, appDir, projectRoot, [], results);

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

  return []; // app/ 디렉토리 없음 (Pages Router 등)
}
