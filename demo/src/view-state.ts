import type { RuntimeEdgeKind, SelectionMode, SelectionState } from '../../src/core/types/selection';

export type DemoTab = 'canvas' | 'inspector' | 'events';

export type PersistedFlowEdgeSelection = {
  edgeId: string;
  labels: string[];
  supportingEdgeIds: string[];
};

export type DemoViewState = {
  activeTab: DemoTab;
  selection: SelectionState;
  selectedFlowEdge: PersistedFlowEdgeSelection | null;
};

const VIEW_STATE_KEY = 'gori-demo-view-state';
const URL_PARAM_KEY = 'view';
const allowedModes: SelectionMode[] = ['both', 'outgoing', 'incoming'];
const allowedTabs: DemoTab[] = ['canvas', 'inspector', 'events'];
const allowedEdgeKinds: RuntimeEdgeKind[] = ['render', 'use', 'call', 'request'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeSelection(value: unknown): SelectionState | null {
  if (!isRecord(value)) {
    return null;
  }

  const selectedSymbolIds = Array.isArray(value.selectedSymbolIds)
    ? value.selectedSymbolIds.filter((item): item is string => typeof item === 'string')
    : [];
  const selectedEdgeKinds = Array.isArray(value.selectedEdgeKinds)
    ? value.selectedEdgeKinds.filter(
        (item): item is RuntimeEdgeKind =>
          typeof item === 'string' && allowedEdgeKinds.includes(item as RuntimeEdgeKind)
      )
    : [];
  const mode =
    typeof value.mode === 'string' && allowedModes.includes(value.mode as SelectionMode)
      ? (value.mode as SelectionMode)
      : null;
  const hop = typeof value.hop === 'number' && Number.isInteger(value.hop) && value.hop > 0 ? value.hop : null;
  const selectedFileId = typeof value.selectedFileId === 'string' ? value.selectedFileId : undefined;

  if (!mode || hop === null) {
    return null;
  }

  return {
    ...(selectedFileId ? { selectedFileId } : {}),
    selectedSymbolIds,
    selectedEdgeKinds,
    mode,
    hop,
  };
}

function sanitizeSelectedFlowEdge(value: unknown): PersistedFlowEdgeSelection | null {
  if (value === null) {
    return null;
  }

  if (!isRecord(value) || typeof value.edgeId !== 'string') {
    return null;
  }

  const labels = Array.isArray(value.labels)
    ? value.labels.filter((item): item is string => typeof item === 'string')
    : [];
  const supportingEdgeIds = Array.isArray(value.supportingEdgeIds)
    ? value.supportingEdgeIds.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    edgeId: value.edgeId,
    labels,
    supportingEdgeIds,
  };
}

export function sanitizeViewState(value: unknown): DemoViewState | null {
  if (!isRecord(value)) {
    return null;
  }

  const activeTab =
    typeof value.activeTab === 'string' && allowedTabs.includes(value.activeTab as DemoTab)
      ? (value.activeTab as DemoTab)
      : null;
  const selection = sanitizeSelection(value.selection);
  const selectedFlowEdge = sanitizeSelectedFlowEdge(value.selectedFlowEdge);

  if (!activeTab || !selection) {
    return null;
  }

  return {
    activeTab,
    selection,
    selectedFlowEdge,
  };
}

export function encodeViewState(viewState: DemoViewState): string {
  return encodeURIComponent(JSON.stringify(viewState));
}

export function decodeViewState(encoded: string): DemoViewState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as unknown;
    return sanitizeViewState(parsed);
  } catch {
    return null;
  }
}

export function readStoredViewState(): DemoViewState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get(URL_PARAM_KEY);

  if (fromUrl) {
    const decoded = decodeViewState(fromUrl);

    if (decoded) {
      return decoded;
    }
  }

  const fromStorage = window.localStorage.getItem(VIEW_STATE_KEY);

  if (!fromStorage) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromStorage) as unknown;
    return sanitizeViewState(parsed);
  } catch {
    return null;
  }
}

export function persistViewState(viewState: DemoViewState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(viewState));
  const url = new URL(window.location.href);
  url.searchParams.set(URL_PARAM_KEY, encodeViewState(viewState));
  window.history.replaceState(null, '', url);
}

export function clearPersistedViewState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(VIEW_STATE_KEY);
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM_KEY);
  window.history.replaceState(null, '', url);
}
