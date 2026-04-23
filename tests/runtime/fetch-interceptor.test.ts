import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeCollector } from '../../src/runtime/collector/collector';
import { attachFetchInterceptor } from '../../src/runtime/collector/fetch-interceptor';

describe('attachFetchInterceptor', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('records request events with source symbol context and restores fetch on cleanup', async () => {
    const collector = new RuntimeCollector();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 201,
      })
    );

    globalThis.fetch = fetchMock;

    const detach = attachFetchInterceptor({
      collector,
      getContext: () => ({
        sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
        traceId: 'trace-1',
        sessionId: 'session-1',
      }),
      getTimestamp: () => 123,
      createEventId: () => 'evt-request-1',
    });

    const response = await globalThis.fetch('/api/user?active=true', {
      method: 'post',
    });

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(collector.getEvents()).toEqual([
      {
        id: 'evt-request-1',
        eventType: 'request',
        timestamp: 123,
        sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
        method: 'POST',
        path: '/api/user?active=true',
        outcome: 'success',
        status: 201,
        durationMs: 0,
        traceId: 'trace-1',
        sessionId: 'session-1',
      },
    ]);

    detach();

    expect(globalThis.fetch).toBe(fetchMock);
  });

  it('does not record an event when there is no active source symbol context', async () => {
    const collector = new RuntimeCollector();
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));

    attachFetchInterceptor({
      collector,
      getContext: () => ({}),
      getTimestamp: () => 999,
      createEventId: () => 'evt-request-2',
    });

    await globalThis.fetch(new Request('http://localhost/api/user'));

    expect(collector.getEvents()).toEqual([]);
  });

  it('records failed requests with error metadata and rethrows the error', async () => {
    const collector = new RuntimeCollector();
    const error = new Error('network down');
    globalThis.fetch = vi.fn<typeof fetch>().mockRejectedValue(error);

    attachFetchInterceptor({
      collector,
      getContext: () => ({
        sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
      }),
      getTimestamp: () => 100,
      createEventId: () => 'evt-request-3',
    });

    await expect(globalThis.fetch('/api/user')).rejects.toThrow('network down');

    expect(collector.getEvents()).toEqual([
      {
        id: 'evt-request-3',
        eventType: 'request',
        timestamp: 100,
        sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
        method: 'GET',
        path: '/api/user',
        outcome: 'error',
        durationMs: 0,
        errorName: 'Error',
        errorMessage: 'network down',
      },
    ]);
  });
});
