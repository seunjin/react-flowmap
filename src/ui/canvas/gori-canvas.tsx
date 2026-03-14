import type { FileLevelView } from '../../core/types/projection.js';

type GoriCanvasProps = {
  view: FileLevelView;
  selectedSymbolIds?: string[];
  onToggleSymbol?: (symbolId: string) => void;
  edgeLabelsById?: Record<string, string[]>;
};

export function GoriCanvas({
  view,
  selectedSymbolIds = [],
  onToggleSymbol,
  edgeLabelsById = {},
}: GoriCanvasProps) {
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

                  if (!onToggleSymbol) {
                    return (
                      <div key={item.symbolId}>
                        {item.name} <em style={{ color: '#64748b' }}>({item.symbolType})</em>
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
                        background: checked ? '#f8fafc' : '#ffffff',
                        border: checked ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSymbol(item.symbolId)}
                      />
                      <span>
                        {item.name} <em style={{ color: '#64748b' }}>({item.symbolType})</em>
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

      <section>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>File Edges</h3>
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          {view.fileEdges.map((edge) => {
            const labels = edgeLabelsById[edge.id] ?? [];

            return (
              <li key={edge.id}>
                {edge.sourceFileId} -&gt; {edge.targetFileId} [{edge.relationTypes.join(', ')}]
                {labels.length ? (
                <ul style={{ marginTop: '0.35rem', paddingLeft: '1rem' }}>
                    {labels.map((label) => (
                    <li key={label} style={{ color: '#475569' }}>
                      {label}
                    </li>
                  ))}
                </ul>
              ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
