import type { DocEntry } from '../doc/build-doc-index';
import { findDomParent, findDomChildren } from './utils';

// ─── GraphNode ────────────────────────────────────────────────────────────────

function GraphNode({ name, isCenter, onClick, onHover, onHoverEnd }: {
  name: string;
  isCenter?: boolean;
  onClick?: (() => void) | undefined;
  onHover?: (() => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={isCenter}
        title={name}
        style={{
          padding: '5px 12px', borderRadius: 7,
          border: isCenter ? '1.5px solid #1e40af' : '1px solid rgba(229,231,235,0.9)',
          background: isCenter ? 'rgba(243,244,246,0.9)' : 'rgba(249,250,251,0.7)',
          color: isCenter ? '#111827' : '#6b7280',
          fontSize: 11, fontWeight: isCenter ? 700 : 500,
          cursor: isCenter ? 'default' : 'pointer',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 130, transition: 'all 80ms',
          boxShadow: isCenter ? '0 0 0 3px rgba(30,64,175,0.1)' : 'none',
        }}
        onMouseEnter={e => {
          if (!isCenter) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(243,244,246,0.9)';
            (e.currentTarget as HTMLElement).style.borderColor = '#9ca3af';
            (e.currentTarget as HTMLElement).style.color = '#111827';
          }
          onHover?.();
        }}
        onMouseLeave={e => {
          if (!isCenter) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(249,250,251,0.7)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(229,231,235,0.9)';
            (e.currentTarget as HTMLElement).style.color = '#6b7280';
          }
          onHoverEnd?.();
        }}
      >
        {name}
      </button>
    </div>
  );
}

// ─── GraphConnector ───────────────────────────────────────────────────────────

function GraphConnector() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, margin: '6px 0' }}>
      <div style={{ width: 1, height: 16, background: '#d1d5db' }} />
      <div style={{
        width: 0, height: 0,
        borderLeft: '3.5px solid transparent',
        borderRight: '3.5px solid transparent',
        borderTop: '4.5px solid #d1d5db',
      }} />
    </div>
  );
}

// ─── NodeRow ──────────────────────────────────────────────────────────────────

function NodeRow({ items, onNavigate, onHover, onHoverEnd }: {
  items: { name: string; symbolId: string }[];
  onNavigate?: ((n: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
      {items.map(({ name, symbolId }) => (
        <GraphNode
          key={symbolId} name={name}
          onClick={() => onNavigate?.(name)}
          onHover={() => onHover?.(symbolId)}
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
  onNavigate?: ((name: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  const connectedEl = selectedEl?.isConnected ? selectedEl : null;
  const parent   = connectedEl ? findDomParent(connectedEl)   : null;
  const children = connectedEl ? findDomChildren(connectedEl) : [];
  const noRelations = !parent && children.length === 0;

  if (noRelations) {
    return (
      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
        관계가 없습니다.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '4px 0' }}>
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
