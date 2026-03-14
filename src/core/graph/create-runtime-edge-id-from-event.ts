import { createApiId } from '../ids/create-api-id.js';
import type { RuntimeEvent } from '../types/runtime-events.js';

export function createRuntimeEdgeIdFromEvent(event: RuntimeEvent): string {
  switch (event.eventType) {
    case 'render': {
      if (!event.sourceSymbolId) {
        return `render:unknown->${event.targetSymbolId}`;
      }

      return `render:${event.sourceSymbolId}->${event.targetSymbolId}`;
    }
    case 'use':
      return `use:${event.sourceSymbolId}->${event.targetSymbolId}`;
    case 'call':
      return `call:${event.sourceSymbolId}->${event.targetSymbolId}`;
    case 'request':
      return `request:${event.sourceSymbolId}->${createApiId(event.method, event.path)}`;
  }
}
