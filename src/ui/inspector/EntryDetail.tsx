import type React from 'react';
import { ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { PropTypeEntry } from './types';
import { shortenPath, openInEditor, getComponentPropsFromEl } from './utils';
import { PropRow } from './PropRow';
import { MiniRelationGraph } from './MiniRelationGraph';

// ─── DetailSection ────────────────────────────────────────────────────────────

export function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  );
}

// ─── EntryDetail ──────────────────────────────────────────────────────────────

export function EntryDetail({ entry, loc, selectedEl, onNavigate, onHover, onHoverEnd }: {
  entry: DocEntry;
  loc?: string | null;
  selectedEl?: HTMLElement | null;
  onNavigate?: ((name: string) => void) | undefined;
  onHover?: ((symbolId: string) => void) | undefined;
  onHoverEnd?: (() => void) | undefined;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 섹션 */}
      <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {entry.name}
          </span>
        </div>

        {entry.filePath && (
          <button
            type="button"
            onClick={() => openInEditor(entry.filePath!, entry.symbolId, loc)}
            title="에디터에서 열기"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 8px', borderRadius: 5,
              border: '1px solid #e5e7eb', background: '#f9fafb',
              cursor: 'pointer', width: '100%', textAlign: 'left',
              transition: 'all 100ms',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = '#f3f4f6';
              el.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = '#f9fafb';
              el.style.borderColor = '#e5e7eb';
            }}
          >
            <ExternalLink size={11} style={{ color: '#1e40af', flexShrink: 0 }} />
            <span style={{
              fontSize: 10, color: '#6b7280', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {shortenPath(entry.filePath)}{loc ? `:${loc}` : ''}
            </span>
          </button>
        )}
      </div>

      {/* 미니 관계 그래프 */}
      <div style={{ padding: '16px 14px' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
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
        const propTypes = (globalThis as unknown as { __goriPropTypes?: Record<string, Record<string, PropTypeEntry>> })
          .__goriPropTypes?.[entry.symbolId];
        return (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb' }}>
            <DetailSection label="Props">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
