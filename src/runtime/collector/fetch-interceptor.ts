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

function getRequestOutcomeFromResponse(response: Response) {
  return response.ok ? 'success' as const : 'failure' as const;
}

function getRequestOutcomeFromError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'aborted' as const;
  }

  return 'error' as const;
}

function getErrorName(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.name;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return undefined;
}

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
    const requestId = createEventId();
    const startedAt = getTimestamp();

    try {
      const response = await originalFetch(input, init);

      if (context.sourceSymbolId) {
        collector.record(
          createRequestEvent({
            id: requestId,
            timestamp: startedAt,
            sourceSymbolId: context.sourceSymbolId,
            method: resolveMethod(input, init),
            path: resolvePath(input),
            outcome: getRequestOutcomeFromResponse(response),
            ...(response.status !== undefined ? { status: response.status } : {}),
            durationMs: Math.max(0, getTimestamp() - startedAt),
            ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
            ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
          })
        );
      }

      return response;
    } catch (error) {
      if (context.sourceSymbolId) {
        const errorName = getErrorName(error);
        const errorMessage = getErrorMessage(error);

        collector.record(
          createRequestEvent({
            id: requestId,
            timestamp: startedAt,
            sourceSymbolId: context.sourceSymbolId,
            method: resolveMethod(input, init),
            path: resolvePath(input),
            outcome: getRequestOutcomeFromError(error),
            durationMs: Math.max(0, getTimestamp() - startedAt),
            ...(errorName !== undefined ? { errorName } : {}),
            ...(errorMessage !== undefined ? { errorMessage } : {}),
            ...(context.traceId !== undefined ? { traceId: context.traceId } : {}),
            ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
          })
        );
      }

      throw error;
    }
  };

  globalThis.fetch = interceptedFetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
