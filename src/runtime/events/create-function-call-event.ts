import type { FunctionCallEvent } from '../../core/types/runtime-events.js';

type CreateFunctionCallEventInput = {
  id: string;
  timestamp: number;
  sourceSymbolId: string;
  targetSymbolId: string;
  traceId?: string;
  sessionId?: string;
};

export function createFunctionCallEvent({
  id,
  timestamp,
  sourceSymbolId,
  targetSymbolId,
  traceId,
  sessionId,
}: CreateFunctionCallEventInput): FunctionCallEvent {
  return {
    id,
    eventType: 'call',
    timestamp,
    sourceSymbolId,
    targetSymbolId,
    ...(traceId !== undefined ? { traceId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}
