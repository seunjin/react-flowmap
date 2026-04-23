import type { ApiMethod, RequestOutcome } from '../../core/types/graph.js';
import type { RequestEvent } from '../../core/types/runtime-events.js';

type CreateRequestEventInput = {
  id: string;
  timestamp: number;
  sourceSymbolId: string;
  method: ApiMethod;
  path: string;
  outcome: RequestOutcome;
  status?: number;
  durationMs?: number;
  errorName?: string;
  errorMessage?: string;
  traceId?: string;
  sessionId?: string;
};

export function createRequestEvent({
  id,
  timestamp,
  sourceSymbolId,
  method,
  path,
  outcome,
  status,
  durationMs,
  errorName,
  errorMessage,
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
    outcome,
    ...(status !== undefined ? { status } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(errorName !== undefined ? { errorName } : {}),
    ...(errorMessage !== undefined ? { errorMessage } : {}),
    ...(traceId !== undefined ? { traceId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}
