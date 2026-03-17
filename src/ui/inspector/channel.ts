import type { DocEntry } from '../doc/build-doc-index';

// ─── BroadcastChannel 프로토콜 ─────────────────────────────────────────────────

export const RFM_CHANNEL = 'rfm-inspector';

/** 메인 창 → 그래프 창 */
export type MainToGraph =
  | { type: 'graph-update'; allEntries: DocEntry[]; selectedId: string }
  | { type: 'pick-result'; symbolId: string };

/** 그래프 창 → 메인 창 */
export type GraphToMain =
  | { type: 'select'; symbolId: string }
  | { type: 'hover'; symbolId: string }
  | { type: 'hover-end' }
  | { type: 'pick-start' }
  | { type: 'window-close' };
