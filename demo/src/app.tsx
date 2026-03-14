import { useEffect, useState } from 'react';

import { buildGraph } from '../../src/core/graph/graph-builder';
import { createRuntimeEdgeIdFromEvent } from '../../src/core/graph/create-runtime-edge-id-from-event';
import { focusGraphByRuntimeEdges } from '../../src/core/graph/focus-graph-by-runtime-edges';
import { buildInspectorPayload } from '../../src/core/inspector/build-inspector-payload';
import { describeRuntimeEdge } from '../../src/core/inspector/describe-runtime-edge';
import { InMemoryGraphStore } from '../../src/core/graph/in-memory-graph-store';
import { projectToFileEdgeLayers } from '../../src/core/projection/project-to-file-edge-layers';
import { projectToFileLevelView } from '../../src/core/projection/project-to-file-level-view';
import type { GoriGraph, SymbolNode } from '../../src/core/types/graph';
import type { RuntimeEdgeKind, SelectionMode, SelectionState } from '../../src/core/types/selection';
import type { RuntimeEvent } from '../../src/core/types/runtime-events';
import type { FileLevelView } from '../../src/core/types/projection';
import { attachFetchInterceptor } from '../../src/runtime/collector/fetch-interceptor';
import { getSymbolAccent } from '../../src/ui/colors/get-symbol-accent';
import { buildRuntimeTimeline } from '../../src/ui/events/build-runtime-timeline';
import { GoriReactFlowCanvas } from '../../src/ui/react-flow/gori-react-flow-canvas';
import { projectToReactFlow } from '../../src/ui/react-flow/project-to-react-flow';
import { UserPage } from './pages/user-page';
import { demoCollector, demoRuntimeSession } from './gori-runtime';
import { InspectorPanel } from './inspector-panel';
import {
  clearPersistedViewState,
  persistViewState,
  readStoredViewState,
  type DemoTab,
  type PersistedFlowEdgeSelection,
} from './view-state';

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
  selectedEdgeKinds: ['render', 'use', 'call', 'request'],
  mode: 'both',
  hop: 1,
};
const CANVAS_WORKSPACE_HEIGHT = 820;

function formatSymbolLabel(symbol: SymbolNode): string {
  return `${symbol.name} (${symbol.symbolType})`;
}

function resolveInitialTab(): DemoTab {
  const storedTab = readStoredViewState()?.activeTab;
  return storedTab === 'events' ? 'events' : 'canvas';
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
  const [selection, setSelection] = useState<SelectionState>(
    () => readStoredViewState()?.selection ?? initialSelection
  );
  const [activeTab, setActiveTab] = useState<DemoTab>(resolveInitialTab);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [selectedFlowEdge, setSelectedFlowEdge] = useState<PersistedFlowEdgeSelection | null>(
    () => readStoredViewState()?.selectedFlowEdge ?? null
  );
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const graphStore = new InMemoryGraphStore();
  graphStore.addGraph(graph);
  const focusedGraph = selectedFlowEdge
    ? focusGraphByRuntimeEdges(graph, selectedFlowEdge.supportingEdgeIds)
    : graph;
  const focusedEvents = selectedFlowEdge
    ? events.filter((event) =>
        selectedFlowEdge.supportingEdgeIds.includes(createRuntimeEdgeIdFromEvent(event))
      )
    : events;
  const observedSymbols = focusedGraph.nodes.filter((node): node is SymbolNode => node.kind === 'symbol');
  const displayView = selectedFlowEdge ? projectToFileLevelView(focusedGraph, selection) : view;
  const inspector = buildInspectorPayload(focusedGraph, selection);
  const edgeLayers = projectToFileEdgeLayers(focusedGraph, selection);
  const reactFlowGraph = projectToReactFlow(displayView, edgeLayers);
  const timeline = buildRuntimeTimeline(focusedGraph, focusedEvents);
  const symbolAccentsById = Object.fromEntries(
    observedSymbols.map((symbol) => [symbol.id, getSymbolAccent(symbol.id)])
  );
  const symbolLabelsById = Object.fromEntries(
    focusedGraph.nodes
      .filter((node): node is SymbolNode => node.kind === 'symbol')
      .map((symbol) => [symbol.id, formatSymbolLabel(symbol)])
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

    setRuntimeReady(true);

    return () => {
      setRuntimeReady(false);
      unsubscribe();
      detachInterceptor();
      globalThis.fetch = originalFetch;
      demoCollector.reset();
    };
  }, []);

  useEffect(() => {
    setView(projectToFileLevelView(graph, selection));
  }, [graph, selection]);

  useEffect(() => {
    persistViewState({
      activeTab,
      selection,
      selectedFlowEdge,
    });
  }, [activeTab, selection, selectedFlowEdge]);

  useEffect(() => {
    if (shareStatus === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShareStatus(null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  function toggleSymbol(symbolId: string): void {
    setSelectedFlowEdge(null);
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
    setSelectedFlowEdge(null);
    setSelection((current) => ({
      ...current,
      mode,
    }));
  }

  function setHop(hop: number): void {
    setSelectedFlowEdge(null);
    setSelection((current) => ({
      ...current,
      hop,
    }));
  }

  function toggleEdgeKind(kind: RuntimeEdgeKind): void {
    setSelectedFlowEdge(null);
    setSelection((current) => ({
      ...current,
      selectedEdgeKinds: current.selectedEdgeKinds.includes(kind)
        ? current.selectedEdgeKinds.filter((value) => value !== kind)
        : [...current.selectedEdgeKinds, kind],
    }));
  }

  function resetSelection(): void {
    setSelection(initialSelection);
    setActiveTab('canvas');
    setSelectedFlowEdge(null);
  }

  async function copyViewLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      setShareStatus('Clipboard not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('View link copied');
    } catch {
      setShareStatus('Failed to copy link');
    }
  }

  function clearSavedViewState(): void {
    clearPersistedViewState();
    setShareStatus('Saved view cleared');
  }

  function handleFlowNodeClick(node: typeof reactFlowGraph.nodes[number]): void {
    if (node.data.kind !== 'file' || !node.data.symbolIds?.length) {
      return;
    }

    setSelectedFlowEdge(null);
    setSelection((current) => ({
      ...current,
      ...(node.data.fileId ? { selectedFileId: node.data.fileId } : {}),
      selectedSymbolIds: node.data.symbolIds ?? [],
    }));
    setActiveTab('canvas');
  }

  function handleFlowEdgeClick(edge: typeof reactFlowGraph.edges[number]): void {
    const supportingRuntimeEdges = graphStore
      .getRuntimeEdges()
      .filter((runtimeEdge) => edge.data.supportingEdges.includes(runtimeEdge.id));
    const relatedSymbolIds = [
      ...new Set(
        supportingRuntimeEdges.flatMap((runtimeEdge) => {
          const ids = [runtimeEdge.source];
          const targetNode = graphStore.getNode(runtimeEdge.target);

          if (targetNode?.kind === 'symbol') {
            ids.push(targetNode.id);
          }

          return ids;
        })
      ),
    ];
    const labels = edge.data.supportingEdges.flatMap((edgeId) => {
      const presentation = getEdgePresentation(graphStore, edgeId);
      return presentation ? [presentation.label] : [];
    });

    const firstSymbolNode = relatedSymbolIds
      .map((symbolId) => graphStore.getNode(symbolId))
      .find((node): node is SymbolNode => node?.kind === 'symbol');

    setSelection((current) => ({
      ...current,
      ...(firstSymbolNode ? { selectedFileId: firstSymbolNode.fileId } : {}),
      selectedSymbolIds: relatedSymbolIds,
    }));
    setSelectedFlowEdge({
      edgeId: edge.id,
      labels,
      supportingEdgeIds: edge.data.supportingEdges,
    });
    setActiveTab('canvas');
  }

  function clearEdgeFocus(): void {
    setSelectedFlowEdge(null);
  }

  return (
    <main
      style={{
        maxWidth: '100%',
        margin: '0 auto',
        padding: '1.25rem 1.25rem 2rem',
        display: 'grid',
        gap: '1rem',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0f172a',
        background:
          'radial-gradient(circle at top left, rgba(191,219,254,0.35), transparent 40%)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'end',
          flexWrap: 'wrap',
        }}
      >
        <div>
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
        </div>
        <section
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {([
            { id: 'canvas', label: 'Canvas' },
            { id: 'events', label: 'Events' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '999px',
                border: activeTab === tab.id ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: activeTab === tab.id ? '#0f172a' : '#ffffff',
                color: activeTab === tab.id ? '#f8fafc' : '#0f172a',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {tab.label}
            </button>
          ))}
        </section>
      </header>

      <section
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '1rem',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
        }}
      >
        {runtimeReady ? (
          <UserPage />
        ) : (
          <p style={{ margin: 0, color: '#475569' }}>Preparing runtime collector...</p>
        )}
      </section>

      {activeTab === 'canvas' ? (
        <section
          style={{
            position: 'relative',
            minHeight: CANVAS_WORKSPACE_HEIGHT,
            borderRadius: '1.35rem',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            background:
              'radial-gradient(circle at top left, rgba(191,219,254,0.3), transparent 34%), #f8fafc',
          }}
        >
          <GoriReactFlowCanvas
            graph={reactFlowGraph}
            height={CANVAS_WORKSPACE_HEIGHT}
            showChrome={false}
            selectedSymbolIds={selection.selectedSymbolIds}
            {...(selection.selectedFileId ? { selectedFileId: selection.selectedFileId } : {})}
            {...(selectedFlowEdge ? { selectedEdgeId: selectedFlowEdge.edgeId } : {})}
            onToggleSymbol={toggleSymbol}
            onNodeClick={handleFlowNodeClick}
            onEdgeClick={handleFlowEdgeClick}
          />

          <section
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              width: 'min(360px, calc(100% - 2rem))',
              display: 'grid',
              gap: '0.75rem',
              zIndex: 10,
            }}
          >
            <section
              style={{
                padding: '0.95rem 1rem',
                borderRadius: '1rem',
                border: '1px solid rgba(203, 213, 225, 0.9)',
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 20px 48px rgba(15, 23, 42, 0.12)',
                display: 'grid',
                gap: '0.8rem',
              }}
            >
              <header>
                <h2 style={{ margin: 0, fontSize: '1rem' }}>Canvas Controls</h2>
                <p style={{ margin: '0.45rem 0 0', color: '#475569', fontSize: '0.9rem' }}>
                  Explore the graph without leaving this workspace.
                </p>
                {selectedFlowEdge ? (
                  <p style={{ margin: '0.45rem 0 0', color: '#0369a1', fontWeight: 600 }}>
                    Edge focus active.
                  </p>
                ) : null}
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
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.875rem' }}>hop</strong>
                {[1, 2, 3].map((hop) => (
                  <button
                    key={hop}
                    type="button"
                    onClick={() => setHop(hop)}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: '999px',
                      border: selection.hop === hop ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: selection.hop === hop ? '#0f172a' : '#ffffff',
                      color: selection.hop === hop ? '#f8fafc' : '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    {hop}-hop
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.875rem' }}>edges</strong>
                {(['render', 'use', 'call', 'request'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleEdgeKind(kind)}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: '999px',
                      border: selection.selectedEdgeKinds.includes(kind)
                        ? '1px solid #0f172a'
                        : '1px solid #cbd5e1',
                      background: selection.selectedEdgeKinds.includes(kind) ? '#0f172a' : '#ffffff',
                      color: selection.selectedEdgeKinds.includes(kind) ? '#f8fafc' : '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    {kind}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                <button
                  type="button"
                  onClick={() => {
                    void copyViewLink();
                  }}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '999px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  copy view link
                </button>
                <button
                  type="button"
                  onClick={clearSavedViewState}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '999px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  clear saved
                </button>
              </div>

              <div style={{ display: 'grid', gap: '0.35rem', color: '#475569', fontSize: '0.9rem' }}>
                <span>
                  Observed symbols <strong>{observedSymbols.length}</strong>
                </span>
                <span>
                  Active edges <strong>{selection.selectedEdgeKinds.length}</strong>
                </span>
              </div>
              {shareStatus ? <p style={{ margin: 0, color: '#0369a1' }}>{shareStatus}</p> : null}
              {selection.selectedEdgeKinds.length === 0 ? (
                <p style={{ margin: 0, color: '#b45309' }}>
                  Re-enable at least one edge kind to project file edges.
                </p>
              ) : null}
            </section>

            {selection.selectedSymbolIds.length ? (
              <section
                style={{
                  padding: '0.8rem 0.9rem',
                  borderRadius: '1rem',
                  border: '1px solid rgba(203, 213, 225, 0.9)',
                  background: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 18px 44px rgba(15, 23, 42, 0.1)',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
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
              </section>
            ) : null}
          </section>

          <section
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: 'min(420px, calc(100% - 2rem))',
              maxHeight: `calc(${CANVAS_WORKSPACE_HEIGHT}px - 2rem)`,
              zIndex: 10,
            }}
          >
            <InspectorPanel
              embedded
              inspector={inspector}
              selection={selection}
              selectedFlowEdge={selectedFlowEdge}
              symbolAccentsById={symbolAccentsById}
              getEdgeColor={(edgeId) => getEdgePresentation(graphStore, edgeId)?.color}
              formatSymbolLabel={(symbolId) => symbolLabelsById[symbolId] ?? symbolId}
              onCloseEdgeFocus={clearEdgeFocus}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'events' ? (
        <section
          style={{
            padding: '1rem',
            borderRadius: '1rem',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <header>
            <h2 style={{ marginTop: 0, marginBottom: '0.35rem', fontSize: '1rem' }}>
              Runtime Timeline
            </h2>
            <p style={{ margin: 0, color: '#475569' }}>
              Ordered execution trace for the current demo session.
            </p>
          </header>
          {timeline.length ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {timeline.map((item) => (
                <article
                  key={item.id}
                  style={{
                    display: 'grid',
                    gap: '0.45rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '0.85rem',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        background: '#e2e8f0',
                        color: '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      +{item.relativeMs}ms
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        padding: '0.22rem 0.5rem',
                        borderRadius: '999px',
                        background: '#0f172a',
                        color: '#f8fafc',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.eventType}
                    </span>
                    {item.detail ? (
                      <span style={{ color: '#475569', fontSize: '0.875rem' }}>{item.detail}</span>
                    ) : null}
                    {item.traceId ? (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        trace: {item.traceId}
                      </span>
                    ) : null}
                    {item.sessionId ? (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        session: {item.sessionId}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#64748b' }}>No runtime events collected yet.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
