import type { ApiMethod } from './graph.js';

export type RuntimeEventBase = {
  id: string;
  eventType: string;
  timestamp: number;
  traceId?: string;
  sessionId?: string;
};

export type RenderEvent = RuntimeEventBase & {
  eventType: 'render';
  sourceSymbolId?: string;
  targetSymbolId: string;
  fileId: string;
};

export type HookUsageEvent = RuntimeEventBase & {
  eventType: 'use';
  sourceSymbolId: string;
  targetSymbolId: string;
};

export type FunctionCallEvent = RuntimeEventBase & {
  eventType: 'call';
  sourceSymbolId: string;
  targetSymbolId: string;
};

export type RequestEvent = RuntimeEventBase & {
  eventType: 'request';
  sourceSymbolId: string;
  method: ApiMethod;
  path: string;
  status?: number;
};

export type RuntimeEvent =
  | RenderEvent
  | HookUsageEvent
  | FunctionCallEvent
  | RequestEvent;
