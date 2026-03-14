import type { InspectorPayload } from '../../src/core/types/inspector';
import type { SelectionState } from '../../src/core/types/selection';
import type { SymbolAccent } from '../../src/ui/colors/get-symbol-accent';

import type { PersistedFlowEdgeSelection } from './view-state';

type InspectorPanelProps = {
  inspector: InspectorPayload;
  selection: SelectionState;
  selectedFlowEdge: PersistedFlowEdgeSelection | null;
  symbolAccentsById: Record<string, SymbolAccent>;
  getEdgeColor: (edgeId: string) => string | undefined;
  formatSymbolLabel: (symbolId: string) => string;
  onCloseEdgeFocus: () => void;
  embedded?: boolean;
};

function SummaryCard({
  label,
  value,
  tone = '#0f172a',
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <section
      style={{
        padding: '0.8rem 0.9rem',
        borderRadius: '0.9rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'grid',
        gap: '0.2rem',
      }}
    >
      <small style={{ color: '#64748b', fontWeight: 700 }}>{label}</small>
      <strong style={{ color: tone, fontSize: '1rem' }}>{value}</strong>
    </section>
  );
}

export function InspectorPanel({
  inspector,
  selection,
  selectedFlowEdge,
  symbolAccentsById,
  getEdgeColor,
  formatSymbolLabel,
  onCloseEdgeFocus,
  embedded = false,
}: InspectorPanelProps) {
  const totalOutgoing = inspector.relations.reduce((sum, relation) => sum + relation.outgoingEdgeIds.length, 0);
  const totalIncoming = inspector.relations.reduce((sum, relation) => sum + relation.incomingEdgeIds.length, 0);
  const totalRequests = inspector.relations.reduce((sum, relation) => sum + relation.requestEdgeIds.length, 0);

  return (
    <aside
      style={{
        padding: '1rem',
        borderRadius: '1rem',
        border: '1px solid #cbd5e1',
        background: embedded ? 'rgba(255, 255, 255, 0.96)' : '#ffffff',
        backdropFilter: embedded ? 'blur(14px)' : undefined,
        display: 'grid',
        gap: '1rem',
        alignSelf: 'start',
        position: embedded ? 'relative' : 'sticky',
        top: embedded ? undefined : '1rem',
        boxShadow: embedded ? '0 18px 48px rgba(15, 23, 42, 0.16)' : undefined,
        maxHeight: embedded ? '100%' : undefined,
        overflow: embedded ? 'hidden' : undefined,
      }}
    >
      <header style={{ display: 'grid', gap: '0.45rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Inspector</h2>
            <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
              Canvas context without leaving the flow.
            </p>
          </div>
          {selectedFlowEdge ? (
            <button
              type="button"
              onClick={onCloseEdgeFocus}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              clear edge focus
            </button>
          ) : null}
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '0.75rem',
        }}
      >
        <SummaryCard label="selected symbols" value={inspector.selectedSymbols.length} />
        <SummaryCard label="mode" value={selection.mode} />
        <SummaryCard label="hop" value={`${selection.hop}-hop`} />
        <SummaryCard label="requests" value={totalRequests} tone="#0369a1" />
      </section>

      <section
        style={{
          padding: '0.9rem 1rem',
          borderRadius: '0.95rem',
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'grid',
          gap: '0.45rem',
        }}
      >
        <strong>{inspector.file?.name ?? 'No file selected'}</strong>
        <small style={{ color: '#64748b' }}>{inspector.file?.path ?? 'Select a file node or symbol.'}</small>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
          <span
            style={{
              padding: '0.22rem 0.5rem',
              borderRadius: '999px',
              background: '#ffffff',
              border: '1px solid #dbe2ea',
              color: '#334155',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            outgoing {totalOutgoing}
          </span>
          <span
            style={{
              padding: '0.22rem 0.5rem',
              borderRadius: '999px',
              background: '#ffffff',
              border: '1px solid #dbe2ea',
              color: '#334155',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            incoming {totalIncoming}
          </span>
          <span
            style={{
              padding: '0.22rem 0.5rem',
              borderRadius: '999px',
              background: '#ffffff',
              border: '1px solid #dbe2ea',
              color: '#334155',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            edge kinds {selection.selectedEdgeKinds.length}
          </span>
        </div>
      </section>

      {selectedFlowEdge ? (
        <section
          style={{
            padding: '0.9rem 1rem',
            borderRadius: '0.95rem',
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            display: 'grid',
            gap: '0.4rem',
          }}
        >
          <strong>Focused file edge</strong>
          <small style={{ color: '#475569' }}>{selectedFlowEdge.edgeId}</small>
          {selectedFlowEdge.labels.length ? (
            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
              {selectedFlowEdge.labels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: '#64748b' }}>No supporting runtime labels resolved for this edge.</p>
          )}
        </section>
      ) : null}

      <section
        style={{
          display: 'grid',
          gap: '0.85rem',
          maxHeight: embedded ? 'calc(100vh - 21rem)' : '68vh',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}
      >
        {inspector.selectedSymbols.length === 0 ? (
          <section
            style={{
              padding: '1rem',
              borderRadius: '0.95rem',
              border: '1px dashed #cbd5e1',
              background: '#f8fafc',
              color: '#64748b',
            }}
          >
            Select a file node, export, or file edge to inspect its runtime relations.
          </section>
        ) : null}

        {inspector.selectedSymbols.map((symbol) => {
          const relation = inspector.relations.find((item) => item.symbolId === symbol.id);
          const accent = symbolAccentsById[symbol.id];

          return (
            <section
              key={symbol.id}
              style={{
                padding: '0.9rem 1rem',
                borderRadius: '0.95rem',
                border: `1px solid ${accent?.border ?? '#e2e8f0'}`,
                background: accent?.soft ?? '#ffffff',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <header style={{ display: 'grid', gap: '0.3rem' }}>
                <strong style={{ color: accent?.solid ?? '#0f172a' }}>{formatSymbolLabel(symbol.id)}</strong>
                <small style={{ color: '#64748b' }}>{symbol.id}</small>
              </header>

              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '0.55rem',
                }}
              >
                <SummaryCard
                  label="outgoing"
                  value={relation?.outgoingEdgeIds.length ?? 0}
                  {...(accent?.solid ? { tone: accent.solid } : {})}
                />
                <SummaryCard
                  label="incoming"
                  value={relation?.incomingEdgeIds.length ?? 0}
                  {...(accent?.solid ? { tone: accent.solid } : {})}
                />
                <SummaryCard label="request" value={relation?.requestEdgeIds.length ?? 0} tone="#0369a1" />
              </section>

              {relation?.outgoingLayers.length ? (
                <section style={{ display: 'grid', gap: '0.5rem' }}>
                  <small style={{ color: '#475569', fontWeight: 700 }}>Outgoing path</small>
                  {relation.outgoingLayers.map((layer) => (
                    <section
                      key={`outgoing-${symbol.id}-${layer.hop}`}
                      style={{
                        padding: '0.7rem 0.8rem',
                        borderRadius: '0.8rem',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        background: '#ffffff',
                        display: 'grid',
                        gap: '0.35rem',
                      }}
                    >
                      <small style={{ color: '#64748b', fontWeight: 700 }}>hop {layer.hop}</small>
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {layer.edges.map((edge) => (
                          <li key={edge.edgeId} style={{ color: getEdgeColor(edge.edgeId) }}>
                            {edge.label}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </section>
              ) : null}

              {relation?.incomingLayers.length ? (
                <section style={{ display: 'grid', gap: '0.5rem' }}>
                  <small style={{ color: '#475569', fontWeight: 700 }}>Incoming path</small>
                  {relation.incomingLayers.map((layer) => (
                    <section
                      key={`incoming-${symbol.id}-${layer.hop}`}
                      style={{
                        padding: '0.7rem 0.8rem',
                        borderRadius: '0.8rem',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        background: '#ffffff',
                        display: 'grid',
                        gap: '0.35rem',
                      }}
                    >
                      <small style={{ color: '#64748b', fontWeight: 700 }}>hop {layer.hop}</small>
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {layer.edges.map((edge) => (
                          <li key={edge.edgeId} style={{ color: getEdgeColor(edge.edgeId) }}>
                            {edge.label}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </section>
              ) : null}

              {relation?.requestEdges.length ? (
                <section style={{ display: 'grid', gap: '0.35rem' }}>
                  <small style={{ color: '#475569', fontWeight: 700 }}>Requests</small>
                  <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                    {relation.requestEdges.map((edge) => (
                      <li key={edge.edgeId} style={{ color: getEdgeColor(edge.edgeId) }}>
                        {edge.label}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </section>
          );
        })}
      </section>
    </aside>
  );
}
