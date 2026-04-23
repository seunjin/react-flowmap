import type { RuntimeEvent } from '../../core/types/runtime-events.js';

type RuntimeCollectorListener = (events: RuntimeEvent[]) => void;
type RuntimeCollectorBatchListener = (events: RuntimeEvent[]) => void;

export class RuntimeCollector {
  private readonly events: RuntimeEvent[] = [];
  private readonly listeners = new Set<RuntimeCollectorListener>();
  private readonly batchListeners = new Set<RuntimeCollectorBatchListener>();
  private readonly pendingBatch: RuntimeEvent[] = [];
  private batchScheduled = false;

  private notify(): void {
    if (this.listeners.size === 0) {
      return;
    }

    const snapshot = this.getEvents();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private flushBatch(): void {
    this.batchScheduled = false;

    if (this.batchListeners.size === 0 || this.pendingBatch.length === 0) {
      this.pendingBatch.length = 0;
      return;
    }

    const batch = [...this.pendingBatch];
    this.pendingBatch.length = 0;

    for (const listener of this.batchListeners) {
      listener(batch);
    }
  }

  private scheduleBatch(): void {
    if (this.batchScheduled || this.batchListeners.size === 0) {
      return;
    }

    this.batchScheduled = true;
    queueMicrotask(() => this.flushBatch());
  }

  record(event: RuntimeEvent): void {
    this.events.push(event);
    if (this.batchListeners.size > 0) {
      this.pendingBatch.push(event);
    }

    this.notify();
    this.scheduleBatch();
  }

  getEvents(): RuntimeEvent[] {
    return [...this.events];
  }

  subscribe(listener: RuntimeCollectorListener): () => void {
    this.listeners.add(listener);
    listener(this.getEvents());

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeToBatches(listener: RuntimeCollectorBatchListener): () => void {
    this.batchListeners.add(listener);

    return () => {
      this.batchListeners.delete(listener);
    };
  }

  reset(): void {
    this.events.length = 0;
    this.pendingBatch.length = 0;
    this.notify();
  }
}
