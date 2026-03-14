import type { RenderEvent } from '../../core/types/runtime-events.js';

type CreateRenderEventInput = {
  id: string;
  timestamp: number;
  targetSymbolId: string;
  fileId: string;
  sourceSymbolId?: string;
  traceId?: string;
  sessionId?: string;
};

export function createRenderEvent({
  id,
  timestamp,
  targetSymbolId,
  fileId,
  sourceSymbolId,
  traceId,
  sessionId,
}: CreateRenderEventInput): RenderEvent {
  return {
    id,
    eventType: 'render',
    timestamp,
    targetSymbolId,
    fileId,
    ...(sourceSymbolId !== undefined ? { sourceSymbolId } : {}),
    ...(traceId !== undefined ? { traceId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}
