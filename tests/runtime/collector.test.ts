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
    });
    collector.reset();
    unsubscribe();

    expect(snapshots).toEqual([0, 1, 0]);
  });
});
