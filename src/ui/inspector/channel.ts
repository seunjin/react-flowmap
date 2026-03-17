import type { DocEntry } from '../doc/build-doc-index';
import type { PropTypeEntry } from './types';

// ─── BroadcastChannel 프로토콜 ─────────────────────────────────────────────────

export const RFM_CHANNEL = 'rfm-inspector';

/** symbolId → propName → PropTypeEntry */
export type PropTypesMap = Record<string, Record<string, PropTypeEntry>>;

/** 메인 창 → 그래프 창 */
export type MainToGraph =
  | {
      type: 'graph-update';
      allEntries: DocEntry[];
      selectedId: string;
      propTypesMap: PropTypesMap;
    }
  | { type: 'pick-result'; symbolId: string }
  | {
      type: 'props-update';
      symbolId: string;
      props: Record<string, unknown>;
    };

/** 그래프 창 → 메인 창 */
export type GraphToMain =
  | { type: 'select'; symbolId: string }
  | { type: 'hover'; symbolId: string }
  | { type: 'hover-end' }
  | { type: 'pick-start' }
  | { type: 'window-close' };
