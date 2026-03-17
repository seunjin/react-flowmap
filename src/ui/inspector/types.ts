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
