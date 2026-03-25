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

export type DomRelNode = { name: string; symbolId: string };

// ─── Next.js App Router 정적 라우트 ──────────────────────────────────────────

export type RfmNextRouteType = 'layout' | 'page' | 'loading' | 'error' | 'not-found' | 'template';

export type RfmNextRoute = {
  /** URL 경로 (예: "/", "/dashboard", "/dashboard/[id]") */
  urlPath: string;
  /** 프로젝트 루트 기준 상대 경로 (예: "src/app/page.tsx") */
  filePath: string;
  /** Next.js 라우트 파일 타입 */
  type: RfmNextRouteType;
  /** 컴포넌트 이름 (예: "HomePage", "DashboardLayout") */
  componentName: string;
  /** true = 서버 컴포넌트, false = 'use client' */
  isServer: boolean;
};
