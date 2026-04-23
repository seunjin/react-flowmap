import { describe, expect, it } from 'vitest';

import { RuntimeCollector } from '../../src/runtime/collector/collector';

describe('RuntimeCollector', () => {
  it('notifies subscribers when events are recorded and when the collector resets', () => {
    const collector = new RuntimeCollector();
    const snapshots: number[] = [];

    const unsubscribe = collector.subscribe((events) => {
      snapshots.push(events.length);
    });

    collector.record({
      id: 'evt-request-1',
      eventType: 'request',
      timestamp: 1,
      sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
      method: 'GET',
      path: '/api/user',
      outcome: 'success',
      status: 200,
    });
    collector.reset();
    unsubscribe();

    expect(snapshots).toEqual([0, 1, 0]);
  });

  it('batches recorded events for batch subscribers', async () => {
    const collector = new RuntimeCollector();
    const batches: string[][] = [];

    const unsubscribe = collector.subscribeToBatches((events) => {
      batches.push(events.map((event) => event.id));
    });

    collector.record({
      id: 'evt-request-1',
      eventType: 'request',
      timestamp: 1,
      sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
      method: 'GET',
      path: '/api/user',
      outcome: 'success',
      status: 200,
    });
    collector.record({
      id: 'evt-request-2',
      eventType: 'request',
      timestamp: 2,
      sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
      method: 'GET',
      path: '/api/user',
      outcome: 'failure',
      status: 500,
    });

    await Promise.resolve();
    unsubscribe();

    expect(batches).toEqual([['evt-request-1', 'evt-request-2']]);
  });

  it('does not replay pre-subscription events through later batch deliveries', async () => {
    const collector = new RuntimeCollector();
    const batches: string[][] = [];

    collector.record({
      id: 'evt-request-1',
      eventType: 'request',
      timestamp: 1,
      sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
      method: 'GET',
      path: '/api/user',
      outcome: 'success',
      status: 200,
    });

    const unsubscribe = collector.subscribeToBatches((events) => {
      batches.push(events.map((event) => event.id));
    });

    collector.record({
      id: 'evt-request-2',
      eventType: 'request',
      timestamp: 2,
      sourceSymbolId: 'symbol:src/api/user.ts#fetchUser',
      method: 'GET',
      path: '/api/user',
      outcome: 'success',
      status: 200,
    });

    await Promise.resolve();
    unsubscribe();

    expect(batches).toEqual([['evt-request-2']]);
  });
});
