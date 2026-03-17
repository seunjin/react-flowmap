import { useState, useEffect, useRef, useCallback } from 'react';
import { SquareMousePointer, ArrowLeft, ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { MainToGraph, GraphToMain } from '../inspector/channel';
import { RFM_CHANNEL } from '../inspector/channel';
import { FullGraph } from './FullGraph';
import inspectorCss from '../inspector/inspector.css?inline';

// ─── GraphEntryDetail ─────────────────────────────────────────────────────────
// DOM 없이 entry 관계 데이터만으로 동작하는 상세 패널

function RelChip({ name, symbolId, onSelect, onHover, onHoverEnd }: {
  name: string; symbolId: string;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(symbolId)}
      onMouseEnter={() => onHover(symbolId)}
      onMouseLeave={onHoverEnd}
      className="px-2.5 py-[4px] rounded-[6px] border border-rfm-border-light bg-[rgba(249,250,251,0.7)] text-[11px] text-rfm-text-500 font-medium cursor-pointer hover:bg-rfm-bg-100 hover:text-rfm-text-900 hover:border-rfm-text-300 transition-all truncate max-w-[140px]"
      title={name}
    >
      {name}
    </button>
  );
}

function RelSection({ label, items, onSelect, onHover, onHoverEnd }: {
  label: string;
  items: { name: string; symbolId: string }[];
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <RelChip
            key={item.symbolId} name={item.name} symbolId={item.symbolId}
            onSelect={onSelect} onHover={onHover} onHoverEnd={onHoverEnd}
          />
        ))}
      </div>
    </div>
  );
}

function GraphEntryDetail({ entry, onSelect, onHover, onHoverEnd }: {
  entry: DocEntry;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
}) {
  const hasRelations = entry.renders.length > 0 || entry.renderedBy.length > 0
    || entry.uses.length > 0 || entry.usedBy.length > 0;

  return (
    <div className="flex flex-col gap-0 h-full overflow-y-auto">
      {/* 파일 경로 */}
      <div className="px-4 py-3 border-b border-rfm-border">
        <p className="text-[10px] text-rfm-text-400 font-mono truncate" title={entry.filePath}>
          {entry.filePath || '—'}
        </p>
      </div>

      {/* Relations */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {hasRelations ? (
          <>
            <RelSection label="Rendered by"    items={entry.renderedBy} onSelect={onSelect} onHover={onHover} onHoverEnd={onHoverEnd} />
            <RelSection label="Renders"        items={entry.renders}    onSelect={onSelect} onHover={onHover} onHoverEnd={onHoverEnd} />
            <RelSection label="Uses (hooks)"   items={entry.uses}       onSelect={onSelect} onHover={onHover} onHoverEnd={onHoverEnd} />
            <RelSection label="Used by"        items={entry.usedBy}     onSelect={onSelect} onHover={onHover} onHoverEnd={onHoverEnd} />
          </>
        ) : (
          <p className="text-[11px] text-rfm-text-400">No relations recorded yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── GraphWindow ──────────────────────────────────────────────────────────────

export function GraphWindow() {
  const [allEntries, setAllEntries] = useState<DocEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [picking, setPicking] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // CSS 주입
  useEffect(() => {
    if (document.querySelector('style[data-rfm-inspector]')) return;
    const el = document.createElement('style');
    el.setAttribute('data-rfm-inspector', '');
    el.textContent = inspectorCss;
    document.head.appendChild(el);
  }, []);

  // BroadcastChannel 연결
  useEffect(() => {
    const ch = new BroadcastChannel(RFM_CHANNEL);
    channelRef.current = ch;

    ch.onmessage = (ev: MessageEvent<MainToGraph>) => {
      const msg = ev.data;
      if (msg.type === 'graph-update') {
        setAllEntries(msg.allEntries);
        setSelectedId(prev => msg.selectedId || prev);
      } else if (msg.type === 'pick-result') {
        setSelectedId(msg.symbolId);
        setPicking(false);
      }
    };

    // 창이 준비됐음을 알리는 신호 — 메인 창이 즉시 graph-update를 보내도록
    const ready: GraphToMain = { type: 'hover-end' }; // dummy to open channel
    ch.postMessage(ready);

    return () => ch.close();
  }, []);

  // 창 닫힐 때 메인 창에 알림
  useEffect(() => {
    function onUnload() {
      channelRef.current?.postMessage({ type: 'window-close' } satisfies GraphToMain);
    }
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const sendToMain = useCallback((msg: GraphToMain) => {
    channelRef.current?.postMessage(msg);
  }, []);

  const handleSelect = useCallback((symbolId: string) => {
    setSelectedId(symbolId);
    sendToMain({ type: 'select', symbolId });
  }, [sendToMain]);

  const handleHover = useCallback((symbolId: string) => {
    sendToMain({ type: 'hover', symbolId });
  }, [sendToMain]);

  const handleHoverEnd = useCallback(() => {
    sendToMain({ type: 'hover-end' });
  }, [sendToMain]);

  const handlePickToggle = useCallback(() => {
    if (picking) {
      setPicking(false);
    } else {
      setPicking(true);
      sendToMain({ type: 'pick-start' });
    }
  }, [picking, sendToMain]);

  const handleBackToOverlay = useCallback(() => {
    sendToMain({ type: 'window-close' });
    window.close();
  }, [sendToMain]);

  const selectedEntry = allEntries.find(e => e.symbolId === selectedId) ?? null;

  return (
    <div
      style={{
        width: '100vw', height: '100vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        background: '#ffffff',
      }}
    >
      {/* ── 툴바 ─────────────────────────────────────────────────── */}
      <div className="h-10 min-h-10 flex items-center gap-2 px-3 border-b border-rfm-border bg-white shrink-0">
        {/* 로고 + 타이틀 */}
        <div className="flex items-center gap-1.5 mr-1">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="3.5" r="2.5" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="3.5" cy="16.5" r="2.5" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="16.5" cy="16.5" r="2.5" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="8.9" y1="5.7" x2="4.6" y2="14.3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11.1" y1="5.7" x2="15.4" y2="14.3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-bold text-rfm-text-900">React Flowmap</span>
        </div>

        <div className="w-px h-4 bg-rfm-border" />

        {/* 노드 수 */}
        <span className="text-[11px] text-rfm-text-400">
          {allEntries.length} components
        </span>

        <div className="flex-1" />

        {/* Pick 버튼 */}
        <button
          type="button"
          onClick={handlePickToggle}
          title={picking ? 'Cancel picking (click element in app window)' : 'Pick element from app window'}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border text-[11px] font-medium transition-all cursor-pointer ${
            picking
              ? 'bg-rfm-blue text-white border-rfm-blue'
              : 'bg-transparent text-rfm-text-500 border-rfm-border-light hover:bg-rfm-bg-100 hover:text-rfm-text-900'
          }`}
        >
          <SquareMousePointer size={12} />
          {picking ? 'Picking…' : 'Pick element'}
        </button>

        {/* 오버레이로 돌아가기 */}
        <button
          type="button"
          onClick={handleBackToOverlay}
          title="Close graph window and return to overlay"
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border border-rfm-border-light bg-transparent text-[11px] font-medium text-rfm-text-500 hover:bg-rfm-bg-100 hover:text-rfm-text-900 transition-all cursor-pointer"
        >
          <ArrowLeft size={12} />
          Back to overlay
        </button>
      </div>

      {/* ── 메인 영역 ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 그래프 캔버스 */}
        <FullGraph
          entries={allEntries}
          selectedId={selectedId}
          onSelect={handleSelect}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
        />

        {/* 상세 패널 */}
        <div className="w-[300px] min-w-[300px] border-l border-rfm-border flex flex-col overflow-hidden bg-white">
          {selectedEntry ? (
            <>
              {/* 상세 헤더 */}
              <div className="h-10 min-h-10 flex items-center justify-between px-3 border-b border-rfm-border shrink-0">
                <span className="text-[12px] font-semibold text-rfm-text-900 truncate">{selectedEntry.name}</span>
                <div className="flex items-center gap-1">
                  {/* 카테고리 뱃지 */}
                  <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-rfm-text-400 px-1.5 py-0.5 rounded bg-rfm-bg-100">
                    {selectedEntry.category}
                  </span>
                  {selectedEntry.filePath && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = new URL('/__rfm-open', window.location.origin);
                        url.searchParams.set('file', selectedEntry.filePath!);
                        url.searchParams.set('symbolId', selectedEntry.symbolId);
                        fetch(url.toString()).catch(() => {});
                      }}
                      title="Open in editor"
                      className="w-6 h-6 flex items-center justify-center rounded border-none bg-transparent text-rfm-text-400 hover:text-rfm-text-700 hover:bg-rfm-bg-100 cursor-pointer transition-all"
                    >
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* 상세 본문 */}
              <div className="flex-1 overflow-hidden">
                <GraphEntryDetail
                  entry={selectedEntry}
                  onSelect={handleSelect}
                  onHover={handleHover}
                  onHoverEnd={handleHoverEnd}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[11px] text-rfm-text-400 text-center leading-relaxed px-4">
                Click a node<br />to see details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
