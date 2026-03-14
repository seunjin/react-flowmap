import type { HookUsageEvent } from '../../core/types/runtime-events.js';

type CreateHookUsageEventInput = {
  id: string;
  timestamp: number;
  sourceSymbolId: string;
  targetSymbolId: string;
  traceId?: string;
  sessionId?: string;
};

export function createHookUsageEvent({
  id,
  timestamp,
  sourceSymbolId,
  targetSymbolId,
  traceId,
  sessionId,
}: CreateHookUsageEventInput): HookUsageEvent {
  return {
    id,
    eventType: 'use',
    timestamp,
    sourceSymbolId,
    targetSymbolId,
    ...(traceId !== undefined ? { traceId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}
