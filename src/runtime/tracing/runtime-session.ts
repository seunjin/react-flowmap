import { createFunctionCallEvent } from '../events/create-function-call-event.js';
import { createHookUsageEvent } from '../events/create-hook-usage-event.js';
import type { RuntimeCollector } from '../collector/collector.js';

export type RuntimeContext = {
  sourceSymbolId?: string;
  traceId?: string;
  sessionId?: string;
};

type RuntimeSessionOptions = {
  getTimestamp?: () => number;
  createEventId?: (kind: 'use' | 'call' | 'request') => string;
};

export class RuntimeSession {
  private readonly collector: RuntimeCollector;
  private readonly getTimestamp: () => number;
  private readonly createEventId: (kind: 'use' | 'call' | 'request') => string;
  private readonly contextStack: RuntimeContext[] = [{}];

  constructor(collector: RuntimeCollector, options: RuntimeSessionOptions = {}) {
    this.collector = collector;
    this.getTimestamp = options.getTimestamp ?? (() => Date.now());
    this.createEventId =
      options.createEventId ??
      ((kind) => {
        return `evt-${kind}:${this.getTimestamp()}`;
      });
  }

  getContext(): RuntimeContext {
    return this.contextStack[this.contextStack.length - 1] ?? {};
  }

  runWithContext<T>(nextContext: RuntimeContext, run: () => T): T {
    this.contextStack.push(nextContext);

    try {
      return run();
    } finally {
      this.contextStack.pop();
    }
  }

  recordUse(sourceSymbolId: string, targetSymbolId: string): void {
    const context = this.getContext();

    this.collector.record(
      createHookUsageEvent({
        id: this.createEventId('use'),
        timestamp: this.getTimestamp(),
        sourceSymbolId,
        targetSymbolId,
        ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
        ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
      })
    );
  }

  recordCall(sourceSymbolId: string, targetSymbolId: string): void {
    const context = this.getContext();

    this.collector.record(
      createFunctionCallEvent({
        id: this.createEventId('call'),
        timestamp: this.getTimestamp(),
        sourceSymbolId,
        targetSymbolId,
        ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
        ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
      })
    );
  }
}
