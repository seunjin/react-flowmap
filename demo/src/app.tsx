import { useEffect, useState } from 'react';

import { buildGraph } from '../../src/core/graph/graph-builder';
import { buildInspectorPayload } from '../../src/core/inspector/build-inspector-payload';
import { describeRuntimeEdge } from '../../src/core/inspector/describe-runtime-edge';
import { InMemoryGraphStore } from '../../src/core/graph/in-memory-graph-store';
import { projectToFileLevelView } from '../../src/core/projection/project-to-file-level-view';
import type { GoriGraph, SymbolNode } from '../../src/core/types/graph';
import type { SelectionMode, SelectionState } from '../../src/core/types/selection';
import type { RuntimeEvent } from '../../src/core/types/runtime-events';
import type { FileLevelView } from '../../src/core/types/projection';
import { attachFetchInterceptor } from '../../src/runtime/collector/fetch-interceptor';
import { getSymbolAccent } from '../../src/ui/colors/get-symbol-accent';
import { GoriCanvas } from '../../src/ui/canvas/gori-canvas';
import { UserPage } from './pages/user-page';
import { demoCollector, demoRuntimeSession } from './gori-runtime';

const emptyView: FileLevelView = {
  fileNodes: [],
  apiNodes: [],
  fileEdges: [],
};

const emptyGraph: GoriGraph = {
  nodes: [],
  edges: [],
};

const initialSelection: SelectionState = {
  selectedSymbolIds: [],
  mode: 'both',
  hop: 1,
};

function formatSymbolLabel(symbol: SymbolNode): string {
  return `${symbol.name} (${symbol.symbolType})`;
}

function getEdgePresentation(
  graphStore: InMemoryGraphStore,
  edgeId: string
): { label: string; color: string } | undefined {
  const runtimeEdge = graphStore
    .getGraph()
    .edges.find((candidate) => candidate.id === edgeId && candidate.kind !== 'contains');

  if (!runtimeEdge || runtimeEdge.kind === 'contains') {
    return undefined;
  }

  const label = describeRuntimeEdge(graphStore, runtimeEdge);

  if (!label) {
    return undefined;
  }

  return {
    label,
    color: getSymbolAccent(runtimeEdge.source).border,
  };
}

export function App() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [graph, setGraph] = useState<GoriGraph>(emptyGraph);
  const [view, setView] = useState<FileLevelView>(emptyView);
  const [selection, setSelection] = useState<SelectionState>(initialSelection);

  const observedSymbols = graph.nodes.filter((node): node is SymbolNode => node.kind === 'symbol');
  const inspector = buildInspectorPayload(graph, selection);
  const graphStore = new InMemoryGraphStore();
  graphStore.addGraph(graph);
  const symbolAccentsById = Object.fromEntries(
    observedSymbols.map((symbol) => [symbol.id, getSymbolAccent(symbol.id)])
  );
  const edgeLabelsById = Object.fromEntries(
    view.fileEdges.map((edge) => [
      edge.id,
      edge.supportingEdges.flatMap((edgeId) => {
        const presentation = getEdgePresentation(graphStore, edgeId);
        return presentation ? [presentation] : [];
      }),
    ])
  );

  useEffect(() => {
    const originalFetch = globalThis.fetch;

    const demoFetch: typeof fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? new URL(input, 'http://localhost')
          : input instanceof URL
            ? input
            : new URL(input.url);

      if (url.pathname === '/api/user') {
        return new Response(
          JSON.stringify({
            id: '1',
            name: 'Jin',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return originalFetch(input, init);
    };

    globalThis.fetch = demoFetch;
    demoCollector.reset();

    const detachInterceptor = attachFetchInterceptor({
      collector: demoCollector,
      getContext: () => demoRuntimeSession.getContext(),
    });

    const unsubscribe = demoCollector.subscribe((nextEvents) => {
      const nextGraph = buildGraph(nextEvents);
      setEvents(nextEvents);
      setGraph(nextGraph);
    });

    return () => {
      unsubscribe();
      detachInterceptor();
      globalThis.fetch = originalFetch;
      demoCollector.reset();
    };
  }, []);

  useEffect(() => {
    setView(projectToFileLevelView(graph, selection));
  }, [graph, selection]);

  function toggleSymbol(symbolId: string): void {
    setSelection((current) => {
      const selected = current.selectedSymbolIds.includes(symbolId)
        ? current.selectedSymbolIds.filter((value) => value !== symbolId)
        : [...current.selectedSymbolIds, symbolId];

      return {
        ...current,
        selectedSymbolIds: selected,
      };
    });
  }

  function setMode(mode: SelectionMode): void {
    setSelection((current) => ({
      ...current,
      mode,
    }));
  }

  function resetSelection(): void {
    setSelection(initialSelection);
  }

  return (
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '2rem 1rem 4rem',
        display: 'grid',
        gap: '1.5rem',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0f172a',
        background:
          'radial-gradient(circle at top left, rgba(191,219,254,0.35), transparent 40%)',
      }}
    >
      <header>
        <p
          style={{
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#475569',
          }}
        >
          Gori Phase 0
        </p>
        <h1 style={{ margin: 0 }}>Runtime Collector Demo</h1>
        <p style={{ maxWidth: 720, color: '#334155' }}>
          This demo wires render, use, call, and request tracing into the app so the runtime
          collector, graph builder, and file-level projection can be inspected end-to-end.
        </p>
      </header>

      <UserPage />
      <GoriCanvas
        view={view}
        selectedSymbolIds={selection.selectedSymbolIds}
        onToggleSymbol={toggleSymbol}
        symbolAccentsById={symbolAccentsById}
        edgeLabelsById={edgeLabelsById}
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
          gap: '1rem',
        }}
      >
        <section
          style={{
            padding: '1rem',
            borderRadius: '1rem',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Selection Controls</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
              Toggle symbols inside each file node and use the mode controls here to re-project the
              graph.
            </p>
          </header>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['both', 'outgoing', 'incoming'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                style={{
                  padding: '0.55rem 0.8rem',
                  borderRadius: '999px',
                  border: selection.mode === mode ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  background: selection.mode === mode ? '#0f172a' : '#ffffff',
                  color: selection.mode === mode ? '#f8fafc' : '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {mode}
              </button>
            ))}

            <button
              type="button"
              onClick={resetSelection}
              style={{
                padding: '0.55rem 0.8rem',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              reset
            </button>
          </div>

          <p style={{ margin: 0, color: '#64748b' }}>
            Observed symbols: <strong>{observedSymbols.length}</strong>
          </p>
          {selection.selectedSymbolIds.length ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {selection.selectedSymbolIds.map((symbolId) => {
                const symbol = observedSymbols.find((item) => item.id === symbolId);
                const accent = symbolAccentsById[symbolId];

                if (!symbol || !accent) {
                  return null;
                }

                return (
                  <span
                    key={symbolId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '999px',
                      background: accent.soft,
                      border: `1px solid ${accent.border}`,
                      color: accent.solid,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: '0.55rem',
                        height: '0.55rem',
                        borderRadius: '999px',
                        background: accent.border,
                      }}
                    />
                    {symbol.name}
                  </span>
                );
              })}
            </div>
          ) : null}
        </section>

        <aside
          style={{
            padding: '1rem',
            borderRadius: '1rem',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            display: 'grid',
            gap: '1rem',
            alignSelf: 'start',
          }}
        >
          <header>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Inspector</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
              Explain why the current file edges exist for the selected symbols.
            </p>
          </header>

          {inspector.file ? (
            <section>
              <strong>{inspector.file.name}</strong>
              <small style={{ display: 'block', color: '#64748b' }}>{inspector.file.path}</small>
            </section>
          ) : (
            <p style={{ margin: 0, color: '#64748b' }}>
              Select a symbol to inspect its file and supporting edges.
            </p>
          )}

          {inspector.selectedSymbols.map((symbol) => {
            const relation = inspector.relations.find((item) => item.symbolId === symbol.id);
            const accent = symbolAccentsById[symbol.id];

            return (
              <section
                key={symbol.id}
                style={{
                  paddingTop: '0.75rem',
                  borderTop: `1px solid ${accent?.border ?? '#e2e8f0'}`,
                }}
              >
                <strong style={{ color: accent?.solid }}>{formatSymbolLabel(symbol)}</strong>
                <small style={{ display: 'block', color: '#64748b', marginTop: '0.25rem' }}>
                  {symbol.id}
                </small>
                <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1rem', color: '#334155' }}>
                  <li>outgoing: {relation?.outgoingEdgeIds.length ?? 0}</li>
                  <li>incoming: {relation?.incomingEdgeIds.length ?? 0}</li>
                  <li>request: {relation?.requestEdgeIds.length ?? 0}</li>
                </ul>
                {relation?.outgoingEdges.length ? (
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 600 }}>Outgoing</small>
                    <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem' }}>
                      {relation.outgoingEdges.map((edge) => (
                        <li
                          key={edge.edgeId}
                          style={{ color: getEdgePresentation(graphStore, edge.edgeId)?.color }}
                        >
                          {edge.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {relation?.incomingEdges.length ? (
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 600 }}>Incoming</small>
                    <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem' }}>
                      {relation.incomingEdges.map((edge) => (
                        <li
                          key={edge.edgeId}
                          style={{ color: getEdgePresentation(graphStore, edge.edgeId)?.color }}
                        >
                          {edge.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {relation?.requestEdges.length ? (
                  <div>
                    <small style={{ color: '#64748b', fontWeight: 600 }}>Requests</small>
                    <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem' }}>
                      {relation.requestEdges.map((edge) => (
                        <li
                          key={edge.edgeId}
                          style={{ color: getEdgePresentation(graphStore, edge.edgeId)?.color }}
                        >
                          {edge.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}
        </aside>
      </section>

      <section
        style={{
          padding: '1rem',
          borderRadius: '1rem',
          background: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Collected Runtime Events</h2>
        <pre
          style={{
            marginBottom: 0,
            overflowX: 'auto',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(events, null, 2)}
        </pre>
      </section>
    </main>
  );
}
