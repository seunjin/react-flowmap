import type { ApiMethod } from '../../core/types/graph.js';
import type { RuntimeCollector } from './collector.js';

import { createRequestEvent } from '../events/create-request-event.js';

type FetchContext = {
  sourceSymbolId?: string;
  traceId?: string;
  sessionId?: string;
};

type FetchInterceptorOptions = {
  collector: RuntimeCollector;
  getContext: () => FetchContext;
  getTimestamp?: () => number;
  createEventId?: () => string;
};

type FetchLike = typeof fetch;

function resolveUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') {
    return new URL(input, 'http://localhost');
  }

  if (input instanceof URL) {
    return input;
  }

  return new URL(input.url);
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): ApiMethod {
  const methodFromInit = init?.method?.toUpperCase();

  if (methodFromInit) {
    return methodFromInit as ApiMethod;
  }

  if (typeof input !== 'string' && !(input instanceof URL)) {
    return input.method.toUpperCase() as ApiMethod;
  }

  return 'GET';
}

function resolvePath(input: RequestInfo | URL): string {
  const url = resolveUrl(input);
  return `${url.pathname}${url.search}`;
}

export function attachFetchInterceptor({
  collector,
  getContext,
  getTimestamp = () => Date.now(),
  createEventId = () => `evt-request:${getTimestamp()}`,
}: FetchInterceptorOptions): () => void {
  const originalFetch = globalThis.fetch as FetchLike;

  const interceptedFetch: FetchLike = async (input, init) => {
    const context = getContext();
    const response = await originalFetch(input, init);

    if (context.sourceSymbolId) {
      collector.record(
        createRequestEvent({
          id: createEventId(),
          timestamp: getTimestamp(),
          sourceSymbolId: context.sourceSymbolId,
          method: resolveMethod(input, init),
          path: resolvePath(input),
          ...(response.status !== undefined ? { status: response.status } : {}),
          ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
          ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
        })
      );
    }

    return response;
  };

  globalThis.fetch = interceptedFetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
