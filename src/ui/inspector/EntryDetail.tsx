import type React from 'react';
import { ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { ComponentPropTypes } from './types';
import { getComponentPropsFromEl } from './utils';
import { PropRow } from './PropRow';
import { MiniRelationGraph, GraphNode, GraphConnector } from './MiniRelationGraph';

// ─── DetailSection ────────────────────────────────────────────────────────────

export function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase">{label}</span>
      {children}
    </div>
  );
}

// ─── EntryDetail ──────────────────────────────────────────────────────────────

export function EntryDetail({ entry, selectedEl, onNavigate, onHover, onHoverEnd, serverParent }: {
  entry: DocEntry;
  selectedEl?: HTMLElement | null;
  onNavigate?: ((symbolId: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
  serverParent?: { name: string; onSelect: () => void; onHover: () => void; onHoverEnd: () => void } | undefined;
}) {
  return (
    <div className="flex flex-col">

      {/* 미니 관계 그래프 */}
      <div className="px-3 py-4">
        <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-3">
          Relations
        </span>
        {serverParent && (
          <div className="flex flex-col items-center mb-0">
            <GraphNode
              name={serverParent.name}
              onClick={serverParent.onSelect}
              onHover={serverParent.onHover}
              onHoverEnd={serverParent.onHoverEnd}
            />
            <GraphConnector />
          </div>
        )}
        <MiniRelationGraph
          entry={entry}
          selectedEl={selectedEl ?? null}
          onNavigate={onNavigate}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
        />
      </div>

      {/* Props */}
      {entry.apiCalls.length > 0 && (
        <div className="px-3 py-3 border-rfm-border">
          <DetailSection label="Requests">
            <div className="flex flex-col gap-2">
              {entry.apiCalls.map((api) => (
                <div
                  key={api.apiId}
                  className="rounded-[8px] border border-[rgba(229,231,235,0.8)] bg-[rgba(249,250,251,0.7)] px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-rfm-text-900">
                    <span className="text-rfm-blue">{api.method}</span>
                    <span className="truncate">{api.path}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-rfm-text-400">
                    {[
                      api.requestCount !== undefined ? `${api.requestCount}x` : null,
                      api.lastStatus !== undefined ? `status ${api.lastStatus}` : null,
                      api.lastDurationMs !== undefined ? `${api.lastDurationMs}ms` : null,
                      api.lastOutcome ?? null,
                    ].filter(Boolean).join(' • ')}
                  </div>
                  {api.viaChain.length > 0 && (
                    <div className="mt-1 text-[10px] text-rfm-text-400 truncate">
                      via {api.viaChain.map((ref) => ref.name).join(' -> ')}
                    </div>
                  )}
                  {api.lastErrorMessage && (
                    <div className="mt-1 text-[10px] text-[#b91c1c] leading-relaxed">
                      {api.lastErrorName ? `${api.lastErrorName}: ` : ''}
                      {api.lastErrorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DetailSection>
        </div>
      )}

      {/* Props */}
      {selectedEl && selectedEl.isConnected && (() => {
        const props = getComponentPropsFromEl(selectedEl);
        const entries = props
          ? Object.entries(props).filter(([k]) => k !== 'children')
          : [];
        if (entries.length === 0) return null;
        const compPropTypes = (globalThis as unknown as { __rfmPropTypes?: Record<string, ComponentPropTypes> })
          .__rfmPropTypes?.[entry.symbolId];
        const propsDefLoc = compPropTypes?.propsDefLoc;
        return (
          <div className="px-3 py-3 border-rfm-border">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase">Props</span>
                {propsDefLoc && (
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({ file: propsDefLoc.file, line: String(propsDefLoc.line) });
                      fetch(`/__rfm-open?${params.toString()}`).catch(() => {});
                    }}
                    title={`Go to Props type\n${propsDefLoc.file}:${propsDefLoc.line}`}
                    className="flex items-center text-rfm-text-300 hover:text-rfm-blue cursor-pointer border-none bg-transparent p-0 transition-all"
                  >
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-[3px]">
                {entries.map(([k, v]) => (
                  <PropRow key={k} name={k} value={v} typeEntry={compPropTypes?.props?.[k]} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
