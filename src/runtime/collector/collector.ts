import type { RuntimeEvent } from '../../core/types/runtime-events.js';

export class RuntimeCollector {
  private readonly events: RuntimeEvent[] = [];

  record(event: RuntimeEvent): void {
    this.events.push(event);
  }

  getEvents(): RuntimeEvent[] {
    return [...this.events];
  }

  reset(): void {
    this.events.length = 0;
  }
}
