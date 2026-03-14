import { RuntimeCollector } from '../../src/runtime/collector/collector';
import { RuntimeSession } from '../../src/runtime/tracing/runtime-session';

export const demoCollector = new RuntimeCollector();

export const demoRuntimeSession = new RuntimeSession(demoCollector, {
  createEventId: (kind) => `evt-${kind}:${Date.now()}`,
});
