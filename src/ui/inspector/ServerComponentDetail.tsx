import type { RfmNextRoute, RfmNextServerComponent } from './types';
import { openInEditor } from './utils';
import { DetailSection } from './EntryDetail';
import { GraphNode, GraphConnector } from './MiniRelationGraph';
import { PropRow } from './PropRow';

const RFM_NAMES = new Set(['ReactFlowMap', 'FlowmapProvider', 'ComponentOverlay']);

function filterImportChildren(children: RfmNextServerComponent[] | undefined): RfmNextServerComponent[] {
  return (children ?? []).filter(
    c => !RFM_NAMES.has(c.componentName) && !c.filePath.includes('react-flowmap'),
  );
}

// ─── 라우트 계층 유틸 ─────────────────────────────────────────────────────────

function getUrlDepth(urlPath: string): number {
  return urlPath === '/' ? 0 : urlPath.split('/').filter(Boolean).length;
}

function isUrlAncestor(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return false;
  if (ancestor === '/') return true;
  return descendant.startsWith(ancestor + '/');
}

function findParentLayout(route: RfmNextRoute, allRoutes: RfmNextRoute[]): RfmNextRoute | null {
  const candidates = allRoutes.filter(r =>
    r.type === 'layout' &&
    r.filePath !== route.filePath &&
    (r.urlPath === route.urlPath || isUrlAncestor(r.urlPath, route.urlPath)),
  );
  candidates.sort((a, b) => getUrlDepth(b.urlPath) - getUrlDepth(a.urlPath));
  return candidates[0] ?? null;
}

function findDirectChildren(layout: RfmNextRoute, allRoutes: RfmNextRoute[]): RfmNextRoute[] {
  const layoutDepth = getUrlDepth(layout.urlPath);
  return allRoutes.filter(r => {
    if (r.filePath === layout.filePath) return false;
    // 같은 URL의 다른 타입 (page, loading 등)
    if (r.urlPath === layout.urlPath) return true;
    // 한 단계 깊은 직접 자식
    if (!isUrlAncestor(layout.urlPath, r.urlPath)) return false;
    return getUrlDepth(r.urlPath) === layoutDepth + 1;
  });
}

// ─── ServerComponentDetail ────────────────────────────────────────────────────

export function ServerComponentDetail({
  route,
  allRoutes,
  onSelectRoute,
  onHoverRoute,
  onHoverRouteEnd,
  onSelectImportChild,
  onHoverImportChild,
  onHoverImportChildEnd,
}: {
  route: RfmNextRoute;
  allRoutes: RfmNextRoute[];
  onSelectRoute: (route: RfmNextRoute) => void;
  onHoverRoute: (route: RfmNextRoute) => void;
  onHoverRouteEnd: () => void;
  onSelectImportChild: (child: RfmNextServerComponent) => void;
  onHoverImportChild: (child: RfmNextServerComponent) => void;
  onHoverImportChildEnd: () => void;
}) {
  const parent = findParentLayout(route, allRoutes);

  // layout: 하위 라우트 / page·others: 정적 import 컴포넌트
  const routeChildren = route.type === 'layout' ? findDirectChildren(route, allRoutes) : [];
  const importChildren = route.type !== 'layout' ? filterImportChildren(route.children) : [];

  const noRelations = !parent && routeChildren.length === 0 && importChildren.length === 0;

  return (
    <div className="flex flex-col">

      {/* Relations — 라우트 계층 */}
      <div className="px-3 py-4">
        <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-3">
          Relations
        </span>
        {noRelations ? (
          <p className="m-0 text-[11px] text-rfm-text-400 leading-relaxed">No route relations.</p>
        ) : (
          <div className="flex flex-col items-center gap-0 py-1">
            {parent && (
              <>
                <GraphNode
                  name={parent.componentName}
                  onClick={() => onSelectRoute(parent)}
                  onHover={() => onHoverRoute(parent)}
                  onHoverEnd={onHoverRouteEnd}
                />
                <GraphConnector />
              </>
            )}
            <GraphNode name={route.componentName} isCenter />
            {routeChildren.length > 0 && (
              <>
                <GraphConnector />
                <div className="flex flex-wrap gap-[5px] justify-center">
                  {routeChildren.map((child, i) => (
                    <GraphNode
                      key={`${child.filePath}-${i}`}
                      name={child.componentName}
                      onClick={() => onSelectRoute(child)}
                      onHover={() => onHoverRoute(child)}
                      onHoverEnd={onHoverRouteEnd}
                    />
                  ))}
                </div>
              </>
            )}
            {importChildren.length > 0 && (
              <>
                <GraphConnector />
                <div className="flex flex-wrap gap-[5px] justify-center">
                  {importChildren.map((child, i) => (
                    <GraphNode
                      key={`${child.filePath}-${i}`}
                      name={child.componentName}
                      onClick={() => {
                        if (!child.isServer) {
                          onSelectImportChild(child);
                        } else {
                          openInEditor(child.filePath, '', '1');
                        }
                      }}
                      onHover={() => onHoverImportChild(child)}
                      onHoverEnd={onHoverImportChildEnd}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Props (ts-morph 정적 타입) */}
      {route.propTypes && Object.keys(route.propTypes).length > 0 && (
        <div className="px-3 py-3">
          <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-2">
            Props <span className="normal-case font-normal text-rfm-text-300">(static types)</span>
          </span>
          <div className="flex flex-col gap-[3px]">
            {Object.entries(route.propTypes).map(([k, v]) => (
              <PropRow key={k} name={k} value={undefined} typeEntry={v} typeOnly />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
