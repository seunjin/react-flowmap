import type { DocEntry } from '../doc/build-doc-index';
import type { RfmNextRoute, RfmNextServerComponent } from '../inspector/types';

export type WorkspaceEntryScreenContext = {
  route: RfmNextRoute | null;
  parentLayout: RfmNextRoute | null;
};

export type WorkspaceRouteScreenContext = {
  parentLayout: RfmNextRoute | null;
};

function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function splitPath(path: string): string[] {
  const normalized = normalizePath(path);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

function getUrlDepth(urlPath: string): number {
  return splitPath(urlPath).length;
}

function isUrlAncestor(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return false;
  if (ancestor === '/') return true;
  return descendant.startsWith(normalizePath(ancestor) + '/');
}

function isDynamicSegment(segment: string): boolean {
  return /^\[[^\]]+\]$/.test(segment)
    && !segment.startsWith('[...')
    && !segment.startsWith('[[...');
}

function isCatchAllSegment(segment: string): boolean {
  return /^\[\.\.\.[^\]]+\]$/.test(segment);
}

function isOptionalCatchAllSegment(segment: string): boolean {
  return /^\[\[\.\.\.[^\]]+\]\]$/.test(segment);
}

function matchesRouteSegments(routeSegments: string[], pathSegments: string[], allowPrefix: boolean): boolean {
  if (routeSegments.length === 0) return allowPrefix || pathSegments.length === 0;

  const [routeSegment, ...restRouteSegments] = routeSegments;
  if (!routeSegment) return allowPrefix || pathSegments.length === 0;

  if (isOptionalCatchAllSegment(routeSegment)) return true;
  if (isCatchAllSegment(routeSegment)) return pathSegments.length > 0;
  if (pathSegments.length === 0) return false;

  const [pathSegment, ...restPathSegments] = pathSegments;
  if (!pathSegment) return false;

  if (routeSegment === pathSegment || isDynamicSegment(routeSegment)) {
    return matchesRouteSegments(restRouteSegments, restPathSegments, allowPrefix);
  }

  return false;
}

function isActiveRouteForPath(route: RfmNextRoute, currentPath: string): boolean {
  const routeSegments = splitPath(route.urlPath);
  const pathSegments = splitPath(currentPath);
  return route.type === 'layout'
    ? matchesRouteSegments(routeSegments, pathSegments, true)
    : matchesRouteSegments(routeSegments, pathSegments, false);
}

function findParentLayout(route: RfmNextRoute, allRoutes: RfmNextRoute[]): RfmNextRoute | null {
  const candidates = allRoutes.filter((candidate) =>
    candidate.type === 'layout'
    && candidate.filePath !== route.filePath
    && (candidate.urlPath === route.urlPath || isUrlAncestor(candidate.urlPath, route.urlPath)),
  );

  candidates.sort((a, b) => getUrlDepth(b.urlPath) - getUrlDepth(a.urlPath));
  return candidates[0] ?? null;
}

function importTreeContainsEntry(children: RfmNextServerComponent[] | undefined, entry: DocEntry): boolean {
  for (const child of children ?? []) {
    if (child.filePath === entry.filePath && child.componentName === entry.name) {
      return true;
    }

    if (importTreeContainsEntry(child.children, entry)) {
      return true;
    }
  }

  return false;
}

function routeOwnsEntry(route: RfmNextRoute, entry: DocEntry): boolean {
  if (route.filePath === entry.filePath && route.componentName === entry.name) {
    return true;
  }

  return importTreeContainsEntry(route.children, entry);
}

function routeSpecificityScore(route: RfmNextRoute): [number, number] {
  const typeRank = route.type === 'page'
    ? 0
    : route.type === 'template'
      ? 1
      : route.type === 'loading' || route.type === 'error' || route.type === 'not-found'
        ? 2
        : 3;

  return [getUrlDepth(route.urlPath), -typeRank];
}

function sortRoutesBySpecificity(a: RfmNextRoute, b: RfmNextRoute): number {
  const [aDepth, aType] = routeSpecificityScore(a);
  const [bDepth, bType] = routeSpecificityScore(b);
  if (aDepth !== bDepth) return bDepth - aDepth;
  return bType - aType;
}

export function getEntryScreenContext(
  entry: DocEntry,
  allRoutes: RfmNextRoute[],
  currentPath: string,
): WorkspaceEntryScreenContext {
  const activeRoutes = allRoutes
    .filter((route) => isActiveRouteForPath(route, currentPath))
    .sort(sortRoutesBySpecificity);

  const route = activeRoutes.find((candidate) => routeOwnsEntry(candidate, entry)) ?? null;
  return {
    route,
    parentLayout: route ? findParentLayout(route, activeRoutes) : null,
  };
}

export function getRouteScreenContext(
  route: RfmNextRoute,
  allRoutes: RfmNextRoute[],
): WorkspaceRouteScreenContext {
  return {
    parentLayout: findParentLayout(route, allRoutes),
  };
}
