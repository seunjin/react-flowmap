import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeCollector } from '../../src/runtime/collector/collector';
import { FlowmapRuntimeManager } from '../../src/runtime/runtime-manager';
import { RuntimeSession } from '../../src/runtime/tracing/runtime-session';

describe('FlowmapRuntimeManager', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shares fetch interception across leases and resets the collector only after the last release', async () => {
    const collector = new RuntimeCollector();
    const session = new RuntimeSession(collector, {
      getTimestamp: () => 100,
      createEventId: () => 'evt-request-1',
    });
    const manager = new FlowmapRuntimeManager(collector, session);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock;

    const leaseA = manager.acquire({ enableFetchInterceptor: true });
    const leaseB = manager.acquire({ enableFetchInterceptor: true });

    await session.runWithContext(
      { sourceSymbolId: 'symbol:src/api/user.ts#fetchUser' },
      () => globalThis.fetch('/api/user')
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(collector.getEvents()).toHaveLength(1);

    leaseA.release();
    expect(collector.getEvents()).toHaveLength(1);
    expect(globalThis.fetch).not.toBe(fetchMock);

    leaseB.release();
    expect(collector.getEvents()).toEqual([]);
    expect(globalThis.fetch).toBe(fetchMock);
  });
});
