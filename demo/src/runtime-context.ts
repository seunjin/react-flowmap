type RuntimeContext = {
  sourceSymbolId?: string;
  traceId?: string;
  sessionId?: string;
};

let currentContext: RuntimeContext = {};

export function getRuntimeContext(): RuntimeContext {
  return currentContext;
}

export async function withRuntimeContext<T>(
  nextContext: RuntimeContext,
  run: () => Promise<T>
): Promise<T> {
  const previousContext = currentContext;
  currentContext = nextContext;

  try {
    return await run();
  } finally {
    currentContext = previousContext;
  }
}
