import type { ApiMethod } from '../../core/types/graph.js';
import type { RequestEvent } from '../../core/types/runtime-events.js';

type CreateRequestEventInput = {
  id: string;
  timestamp: number;
  sourceSymbolId: string;
  method: ApiMethod;
  path: string;
  status?: number;
  traceId?: string;
  sessionId?: string;
};

export function createRequestEvent({
  id,
  timestamp,
  sourceSymbolId,
  method,
  path,
  status,
  traceId,
  sessionId,
}: CreateRequestEventInput): RequestEvent {
  return {
    id,
    eventType: 'request',
    timestamp,
    sourceSymbolId,
    method,
    path,
    ...(status !== undefined ? { status } : {}),
    ...(traceId !== undefined ? { traceId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}
