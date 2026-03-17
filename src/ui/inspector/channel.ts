import type { DocEntry } from '../doc/build-doc-index';
import type { ComponentPropTypes } from './types';

// ─── BroadcastChannel 프로토콜 ─────────────────────────────────────────────────

export const RFM_CHANNEL = 'rfm-inspector';

/** symbolId → ComponentPropTypes */
export type PropTypesMap = Record<string, ComponentPropTypes>;

/** 메인 창 → 그래프 창 */
export type MainToGraph =
  | {
      type: 'graph-update';
      allEntries: DocEntry[];
      selectedId: string;
      propTypesMap: PropTypesMap;
      /** symbolId → 이 컴포넌트가 JSX에서 렌더하는 컴포넌트 이름 목록 */
      staticJsx?: Record<string, string[]>;
    }
  | { type: 'pick-result'; symbolId: string }
  | {
      type: 'props-update';
      symbolId: string;
      props: Record<string, unknown>;
    };

/** 그래프 창 → 메인 창 */
export type GraphToMain =
  | { type: 'ready' }
  | { type: 'select'; symbolId: string }
  | { type: 'hover'; symbolId: string }
  | { type: 'hover-end' }
  | { type: 'pick-start' }
  | { type: 'window-close' }
  | { type: 'back-to-overlay' };
