import type { RuntimeEvent } from '../../core/types/runtime-events.js';

type RuntimeCollectorListener = (events: RuntimeEvent[]) => void;

export class RuntimeCollector {
  private readonly events: RuntimeEvent[] = [];
  private readonly listeners = new Set<RuntimeCollectorListener>();

  private notify(): void {
    const snapshot = this.getEvents();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  record(event: RuntimeEvent): void {
    this.events.push(event);
    this.notify();
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

  reset(): void {
    this.events.length = 0;
    this.notify();
  }
}
