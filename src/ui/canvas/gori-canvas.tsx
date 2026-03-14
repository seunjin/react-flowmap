import type { FileLevelView } from '../../core/types/projection.js';
import type { SymbolAccent } from '../colors/get-symbol-accent.js';

type EdgeLabel = {
  label: string;
  color: string;
};

type GoriCanvasProps = {
  view: FileLevelView;
  selectedSymbolIds?: string[];
  onToggleSymbol?: (symbolId: string) => void;
  symbolAccentsById?: Record<string, SymbolAccent>;
  edgeLabelsById?: Record<string, EdgeLabel[]>;
};

export function GoriCanvas({
  view,
  selectedSymbolIds = [],
  onToggleSymbol,
  symbolAccentsById = {},
  edgeLabelsById = {},
}: GoriCanvasProps) {
  const fileLabelsById = Object.fromEntries(view.fileNodes.map((fileNode) => [fileNode.id, fileNode.name]));
  const apiLabelsById = Object.fromEntries(view.apiNodes.map((apiNode) => [apiNode.id, apiNode.label]));

  return (
    <section
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1rem',
        border: '1px solid #d7dce2',
        borderRadius: '1rem',
        background: '#f8fafc',
      }}
    >
      <header>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Gori Canvas Preview</h2>
        <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
          Phase 0 scaffold: file-first nodes with file-level edges.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {view.fileNodes.map((fileNode) => (
          <article
            key={fileNode.id}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '0.75rem',
              background: '#ffffff',
              padding: '0.875rem',
            }}
          >
            <strong style={{ display: 'block' }}>{fileNode.name}</strong>
            <small style={{ color: '#64748b' }}>{fileNode.path}</small>
            <hr style={{ margin: '0.75rem 0', border: 0, borderTop: '1px solid #e2e8f0' }} />
            {fileNode.exports.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <small style={{ color: '#475569', fontWeight: 600 }}>Symbols</small>
                {fileNode.exports.map((item) => {
                  const checked = selectedSymbolIds.includes(item.symbolId);
                  const accent = symbolAccentsById[item.symbolId];

                  if (!onToggleSymbol) {
                    return (
                      <div
                        key={item.symbolId}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {accent ? (
                          <span
                            aria-hidden="true"
                            style={{
                              width: '0.6rem',
                              height: '0.6rem',
                              borderRadius: '999px',
                              background: accent.border,
                            }}
                          />
                        ) : null}
                        <span>
                          {item.name} <em style={{ color: '#64748b' }}>({item.symbolType})</em>
                        </span>
                      </div>
                    );
                  }

                  return (
                    <label
                      key={item.symbolId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.5rem',
                        borderRadius: '0.5rem',
                        background: checked ? accent?.soft ?? '#f8fafc' : '#ffffff',
                        border: checked
                          ? `1px solid ${accent?.border ?? '#0f172a'}`
                          : '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSymbol(item.symbolId)}
                      />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        {accent ? (
                          <span
                            aria-hidden="true"
                            style={{
                              width: '0.6rem',
                              height: '0.6rem',
                              borderRadius: '999px',
                              background: accent.border,
                            }}
                          />
                        ) : null}
                        <span>
                        {item.name} <em style={{ color: '#64748b' }}>({item.symbolType})</em>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <small style={{ color: '#94a3b8' }}>No observed symbols yet.</small>
            )}
          </article>
        ))}
      </div>

      {view.apiNodes.length ? (
        <section>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>API Nodes</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {view.apiNodes.map((apiNode) => (
              <article
                key={apiNode.id}
                style={{
                  border: '1px solid #bfdbfe',
                  borderRadius: '0.75rem',
                  background: '#eff6ff',
                  padding: '0.875rem',
                }}
              >
                <strong style={{ display: 'block' }}>{apiNode.label}</strong>
                <small style={{ color: '#1d4ed8' }}>{apiNode.path}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>File Edges</h3>
        {view.fileEdges.length ? (
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {view.fileEdges.map((edge) => {
              const labels = edgeLabelsById[edge.id] ?? [];
              const sourceLabel =
                fileLabelsById[edge.sourceFileId] ??
                apiLabelsById[edge.sourceFileId] ??
                edge.sourceFileId;
              const targetLabel =
                fileLabelsById[edge.targetFileId] ??
                apiLabelsById[edge.targetFileId] ??
                edge.targetFileId;

              return (
                <li key={edge.id}>
                  {sourceLabel} -&gt; {targetLabel} [{edge.relationTypes.join(', ')}]
                  {labels.length ? (
                    <ul style={{ marginTop: '0.35rem', paddingLeft: '1rem' }}>
                      {labels.map((label) => (
                        <li
                          key={label.label}
                          style={{
                            color: label.color,
                            paddingLeft: '0.25rem',
                            borderLeft: `3px solid ${label.color}`,
                            marginBottom: '0.25rem',
                          }}
                        >
                          {label.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ margin: 0, color: '#64748b' }}>
            No projected file edges match the current symbol, hop, and edge filters.
          </p>
        )}
      </section>
    </section>
  );
}
