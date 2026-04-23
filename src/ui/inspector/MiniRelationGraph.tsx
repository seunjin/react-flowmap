import type { DocEntry } from '../doc/build-doc-index';
import type { DomRelNode } from './types';
import { findDomParent, findDomChildren } from './utils';

// ─── GraphNode ────────────────────────────────────────────────────────────────

export function GraphNode({ name, isCenter, onClick, onHover, onHoverEnd }: {
  name: string;
  isCenter?: boolean;
  onClick?: (() => void) | undefined;
  onHover?: (() => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={isCenter}
        title={name}
        className={`px-3 py-[5px] rounded-[7px] text-[11px] truncate max-w-[130px] transition-all ${isCenter
          ? 'border-[1.5px] border-rfm-blue bg-[rgba(243,244,246,0.9)] text-rfm-text-900 font-medium cursor-default'
          : 'border border-[rgba(229,231,235,0.9)] bg-[rgba(249,250,251,0.7)] text-rfm-text-500 font-medium cursor-pointer hover:bg-[rgba(243,244,246,0.9)] hover:border-rfm-text-400 hover:text-rfm-text-900'
          }`}
        onMouseEnter={() => onHover?.()}
        onMouseLeave={() => onHoverEnd?.()}
      >
        {name}
      </button>
    </div>
  );
}

// ─── GraphConnector ───────────────────────────────────────────────────────────

export function GraphConnector() {
  return (
    <div className="flex flex-col items-center shrink-0 my-1.5">
      <div className="w-px h-4 bg-rfm-text-300" />
      <div className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[4.5px] border-l-transparent border-r-transparent border-t-rfm-text-300" />
    </div>
  );
}

// ─── NodeRow ──────────────────────────────────────────────────────────────────

function NodeRow({ items, onNavigate, onHover, onHoverEnd }: {
  items: DomRelNode[];
  onNavigate?: ((symbolId: string, el?: HTMLElement | null) => void) | undefined;
  onHover?: ((symbolId: string, el?: HTMLElement | null, els?: HTMLElement[]) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-[5px] justify-center">
      {items.map(({ name, symbolId, el, els, count }) => (
        <GraphNode
          key={symbolId} name={count && count > 1 ? `${name} ×${count}` : name}
          onClick={() => onNavigate?.(symbolId, el)}
          onHover={() => onHover?.(symbolId, el, els)}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </div>
  );
}

// ─── MiniRelationGraph ────────────────────────────────────────────────────────

export function MiniRelationGraph({ entry, selectedEl, onNavigate, onHover, onHoverEnd }: {
  entry: DocEntry;
  selectedEl: HTMLElement | null;
  onNavigate?: ((symbolId: string, el?: HTMLElement | null) => void) | undefined;
  onHover?: ((symbolId: string, el?: HTMLElement | null, els?: HTMLElement[]) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  const connectedEl = selectedEl?.isConnected ? selectedEl : null;
  // Pass entry.symbolId so parent/child finders start from the correct component fiber,
  // not the nearest RFM ancestor of the (potentially nested) selectedEl.
  const parent = connectedEl ? findDomParent(connectedEl, entry.symbolId) : null;
  const children = connectedEl ? findDomChildren(connectedEl, entry.symbolId) : [];
  const noRelations = !parent && children.length === 0;

  if (noRelations) {
    return (
      <p className="m-0 text-[11px] text-rfm-text-400 leading-relaxed">
        No component relations.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 py-1">
      {parent && (
        <>
          <NodeRow items={[parent]} onNavigate={onNavigate} onHover={onHover} onHoverEnd={onHoverEnd} />
          <GraphConnector />
        </>
      )}
      <GraphNode name={entry.name} isCenter />
      {children.length > 0 && (
        <>
          <GraphConnector />
          <NodeRow items={children} onNavigate={onNavigate} onHover={onHover} onHoverEnd={onHoverEnd} />
        </>
      )}
    </div>
  );
}
