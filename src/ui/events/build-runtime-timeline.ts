import type { GoriGraph, RuntimeEvent } from '../../core/types/index.js';

export type RuntimeTimelineItem = {
  id: string;
  eventType: RuntimeEvent['eventType'];
  title: string;
  detail?: string;
  timestamp: number;
  relativeMs: number;
  traceId?: string;
  sessionId?: string;
};

function fallbackSymbolLabel(symbolId: string): string {
  const [, symbolName = symbolId] = symbolId.split('#');
  return symbolName;
}

function resolveSymbolLabel(nodesById: Map<string, GoriGraph['nodes'][number]>, symbolId: string): string {
  const node = nodesById.get(symbolId);

  if (node?.kind === 'symbol') {
    return node.name;
  }

  return fallbackSymbolLabel(symbolId);
}

function resolveFileLabel(nodesById: Map<string, GoriGraph['nodes'][number]>, fileId: string): string {
  const node = nodesById.get(fileId);

  if (node?.kind === 'file') {
    return node.name;
  }

  return fileId;
}

function toTimelineItem(
  event: RuntimeEvent,
  baselineTimestamp: number,
  nodesById: Map<string, GoriGraph['nodes'][number]>
): RuntimeTimelineItem {
  switch (event.eventType) {
    case 'render': {
      const target = resolveSymbolLabel(nodesById, event.targetSymbolId);
      const source = event.sourceSymbolId
        ? resolveSymbolLabel(nodesById, event.sourceSymbolId)
        : undefined;
      const fileLabel = resolveFileLabel(nodesById, event.fileId);

      return {
        id: event.id,
        eventType: event.eventType,
        title: source ? `${source} rendered ${target}` : `Rendered ${target}`,
        detail: `file: ${fileLabel}`,
        timestamp: event.timestamp,
        relativeMs: event.timestamp - baselineTimestamp,
        ...(event.traceId ? { traceId: event.traceId } : {}),
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      };
    }
    case 'use': {
      const source = resolveSymbolLabel(nodesById, event.sourceSymbolId);
      const target = resolveSymbolLabel(nodesById, event.targetSymbolId);

      return {
        id: event.id,
        eventType: event.eventType,
        title: `${source} used ${target}`,
        timestamp: event.timestamp,
        relativeMs: event.timestamp - baselineTimestamp,
        ...(event.traceId ? { traceId: event.traceId } : {}),
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      };
    }
    case 'call': {
      const source = resolveSymbolLabel(nodesById, event.sourceSymbolId);
      const target = resolveSymbolLabel(nodesById, event.targetSymbolId);

      return {
        id: event.id,
        eventType: event.eventType,
        title: `${source} called ${target}`,
        timestamp: event.timestamp,
        relativeMs: event.timestamp - baselineTimestamp,
        ...(event.traceId ? { traceId: event.traceId } : {}),
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      };
    }
    case 'request': {
      const source = resolveSymbolLabel(nodesById, event.sourceSymbolId);

      return {
        id: event.id,
        eventType: event.eventType,
        title: `${source} requested ${event.method} ${event.path}`,
        ...(event.status !== undefined ? { detail: `status: ${event.status}` } : {}),
        timestamp: event.timestamp,
        relativeMs: event.timestamp - baselineTimestamp,
        ...(event.traceId ? { traceId: event.traceId } : {}),
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      };
    }
  }
}

export function buildRuntimeTimeline(graph: GoriGraph, events: RuntimeEvent[]): RuntimeTimelineItem[] {
  if (events.length === 0) {
    return [];
  }

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node] as const));
  const sortedEvents = [...events].sort((left, right) => left.timestamp - right.timestamp);
  const baselineTimestamp = sortedEvents[0]?.timestamp ?? 0;

  return sortedEvents.map((event) => toTimelineItem(event, baselineTimestamp, nodesById));
}
