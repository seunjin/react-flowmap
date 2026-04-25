// ─── Shared Local Types ───────────────────────────────────────────────────────

export type DockPosition = 'right' | 'left' | 'bottom' | 'float';

export type PropTypeEntry = {
  type: string;
  optional: boolean;
};

export type ComponentPropTypes = {
  propsDefLoc?: { file: string; line: number };
  props: Record<string, PropTypeEntry>;
};

export type FoundComp = {
  symbolId: string;
  el: HTMLElement;
  rect: DOMRect;
  depth: number;
  loc: string | null;
};

export type DomRelNode = {
  name: string;
  symbolId: string;
  el?: HTMLElement | null;
  els?: HTMLElement[];
  count?: number;
};

// ─── Shared Route Metadata ───────────────────────────────────────────────────

export type RfmNextRouteType = 'layout' | 'page' | 'loading' | 'error' | 'not-found' | 'template';
export type RfmRouteSource = 'next' | 'react-router' | 'tanstack-router';
export type RfmRouteType = RfmNextRouteType;
export type RfmExecutionKind = 'static' | 'live';
export type RfmImportNodeKind = 'server-component' | 'client-boundary';
export type RfmRouteNodeKind = 'route';

/** import 정적 분석으로 추출한 server/static 또는 client boundary 트리 노드 */
export type RfmNextServerComponent = {
  filePath: string;
  componentName: string;
  nodeKind: RfmImportNodeKind;
  executionKind: RfmExecutionKind;
  /** true = server/static file, false = 'use client' boundary */
  isServer: boolean;
  children?: RfmNextServerComponent[];
};
export type RfmServerComponent = RfmNextServerComponent;

export type RfmNextRoute = {
  /** 라우트 고유 ID (있는 경우) */
  id?: string;
  /** 라우트 메타데이터를 제공한 라우터 */
  router?: RfmRouteSource;
  /** URL 경로 (예: "/", "/dashboard", "/dashboard/[id]") */
  urlPath: string;
  /** 프로젝트 루트 기준 상대 경로 (예: "src/app/page.tsx") */
  filePath: string;
  /** Next.js 라우트 파일 타입 */
  type: RfmNextRouteType;
  /** 컴포넌트 이름 (예: "HomePage", "DashboardLayout") */
  componentName: string;
  /** route metadata node */
  nodeKind: RfmRouteNodeKind;
  /** static route file or live route context */
  executionKind: RfmExecutionKind;
  /** true = server/static route file, false = 'use client' route boundary */
  isServer: boolean;
  /** ts-morph 정적 분석으로 추출한 props 타입 */
  propTypes?: Record<string, PropTypeEntry>;
  /** 정적 import 분석으로 구성한 하위 컴포넌트 트리 */
  children?: RfmNextServerComponent[];
};
export type RfmRoute = RfmNextRoute;
