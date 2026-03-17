import type React from 'react';
import type { DocEntry } from '../doc/build-doc-index';
import type { PropTypeEntry } from './types';
import { getComponentPropsFromEl } from './utils';
import { PropRow } from './PropRow';
import { MiniRelationGraph } from './MiniRelationGraph';

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

export function EntryDetail({ entry, selectedEl, onNavigate, onHover, onHoverEnd }: {
  entry: DocEntry;
  selectedEl?: HTMLElement | null;
  onNavigate?: ((name: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-col">

      {/* 미니 관계 그래프 */}
      <div className="px-3 py-4">
        <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-3">
          Relations
        </span>
        <MiniRelationGraph
          entry={entry}
          selectedEl={selectedEl ?? null}
          onNavigate={onNavigate}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
        />
      </div>

      {/* Props */}
      {selectedEl && selectedEl.isConnected && (() => {
        const props = getComponentPropsFromEl(selectedEl);
        const entries = props
          ? Object.entries(props).filter(([k]) => k !== 'children')
          : [];
        if (entries.length === 0) return null;
        const propTypes = (globalThis as unknown as { __rfmPropTypes?: Record<string, Record<string, PropTypeEntry>> })
          .__rfmPropTypes?.[entry.symbolId];
        return (
          <div className="px-3 py-3  border-rfm-border">
            <DetailSection label="Props">
              <div className="flex flex-col gap-[3px]">
                {entries.map(([k, v]) => (
                  <PropRow key={k} name={k} value={v} typeEntry={propTypes?.[k]} />
                ))}
              </div>
            </DetailSection>
          </div>
        );
      })()}

    </div>
  );
}
