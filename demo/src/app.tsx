import { useEffect, useRef, useState } from 'react';

import { buildGraph } from '../../src/core/graph/graph-builder';
import { projectToFileLevelView } from '../../src/core/projection/project-to-file-level-view';
import type { RuntimeEvent } from '../../src/core/types/runtime-events';
import type { FileLevelView } from '../../src/core/types/projection';
import { RuntimeCollector } from '../../src/runtime/collector/collector';
import { attachFetchInterceptor } from '../../src/runtime/collector/fetch-interceptor';
import { GoriCanvas } from '../../src/ui/canvas/gori-canvas';
import { UserPage } from './pages/user-page';
import { getRuntimeContext } from './runtime-context';

const emptyView: FileLevelView = {
  fileNodes: [],
  apiNodes: [],
  fileEdges: [],
};

export function App() {
  const collectorRef = useRef(new RuntimeCollector());
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [view, setView] = useState<FileLevelView>(emptyView);

  useEffect(() => {
    const collector = collectorRef.current;
    const originalFetch = globalThis.fetch;
    let sequence = 0;

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

    const detachInterceptor = attachFetchInterceptor({
      collector,
      getContext: getRuntimeContext,
      createEventId: () => `evt-request-${++sequence}`,
    });

    const unsubscribe = collector.subscribe((nextEvents) => {
      setEvents(nextEvents);
      setView(projectToFileLevelView(buildGraph(nextEvents)));
    });

    return () => {
      unsubscribe();
      detachInterceptor();
      globalThis.fetch = originalFetch;
      collector.reset();
    };
  }, []);

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
        <h1 style={{ margin: 0 }}>Request Collector Demo</h1>
        <p style={{ maxWidth: 720, color: '#334155' }}>
          This demo wires the request-only runtime collector into the app so the fetch interceptor,
          graph builder, and file-level projection can be inspected end-to-end.
        </p>
      </header>

      <UserPage />
      <GoriCanvas view={view} />

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
