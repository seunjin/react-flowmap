import { useState, useEffect, useRef, useCallback } from 'react';
import { SquareMousePointer, ArrowLeft, ExternalLink } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { MainToGraph, GraphToMain, PropTypesMap } from '../inspector/channel';
import { RFM_CHANNEL } from '../inspector/channel';
import { PropRow } from '../inspector/PropRow';
import { FullGraph } from './FullGraph';
import inspectorCss from '../inspector/inspector.css?inline';

// ─── RelGraph (entry 데이터 기반 관계 시각화) ─────────────────────────────────

function RelNode({ name, isCenter, onClick, onHover, onHoverEnd }: {
  name: string; isCenter?: boolean;
  onClick?: () => void;
  onHover?: () => void; onHoverEnd?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isCenter}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      title={name}
      className={`px-3 py-[5px] rounded-[7px] text-[11px] truncate max-w-[140px] transition-all font-medium ${
        isCenter
          ? 'border-[1.5px] border-rfm-blue bg-rfm-bg-100 text-rfm-text-900 cursor-default'
          : 'border border-rfm-border-light bg-[rgba(249,250,251,0.7)] text-rfm-text-500 cursor-pointer hover:bg-rfm-bg-100 hover:border-rfm-text-300 hover:text-rfm-text-900'
      }`}
    >
      {name}
    </button>
  );
}

function RelConnector() {
  return (
    <div className="flex flex-col items-center shrink-0 my-1">
      <div className="w-px h-4 bg-rfm-text-300" />
      <div className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[4.5px] border-l-transparent border-r-transparent border-t-rfm-text-300" />
    </div>
  );
}

function EntryRelGraph({ entry, onSelect, onHover, onHoverEnd }: {
  entry: DocEntry;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
}) {
  const parents = entry.renderedBy;
  const children = entry.renders;
  const hooks = entry.uses;

  if (parents.length === 0 && children.length === 0 && hooks.length === 0) {
    return <p className="text-[11px] text-rfm-text-400">No relations recorded yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-0 py-1">
      {parents.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {parents.map(p => (
              <RelNode key={p.symbolId} name={p.name}
                onClick={() => onSelect(p.symbolId)}
                onHover={() => onHover(p.symbolId)}
                onHoverEnd={onHoverEnd}
              />
            ))}
          </div>
          <RelConnector />
        </>
      )}
      <RelNode name={entry.name} isCenter />
      {(children.length > 0 || hooks.length > 0) && (
        <>
          <RelConnector />
          <div className="flex flex-wrap gap-1.5 justify-center">
            {children.map(c => (
              <RelNode key={c.symbolId} name={c.name}
                onClick={() => onSelect(c.symbolId)}
                onHover={() => onHover(c.symbolId)}
                onHoverEnd={onHoverEnd}
              />
            ))}
            {hooks.map(h => (
              <RelNode key={h.symbolId} name={h.name}
                onClick={() => onSelect(h.symbolId)}
                onHover={() => onHover(h.symbolId)}
                onHoverEnd={onHoverEnd}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── GraphEntryDetail ─────────────────────────────────────────────────────────

function GraphEntryDetail({ entry, props, propTypesMap, onSelect, onHover, onHoverEnd }: {
  entry: DocEntry;
  props: Record<string, unknown> | null;
  propTypesMap: PropTypesMap;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
  onHoverEnd: () => void;
}) {
  const propEntries = props
    ? Object.entries(props).filter(([k]) => k !== 'children')
    : [];
  const propTypes = propTypesMap[entry.symbolId];

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* 파일 경로 */}
      <div className="px-4 py-2.5 border-b border-rfm-border shrink-0">
        <p className="text-[10px] text-rfm-text-400 font-mono truncate" title={entry.filePath}>
          {entry.filePath || '—'}
        </p>
      </div>

      {/* Relations */}
      <div className="px-4 py-4 border-b border-rfm-border shrink-0">
        <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase block mb-3">
          Relations
        </span>
        <EntryRelGraph
          entry={entry}
          onSelect={onSelect}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
        />
      </div>

      {/* Props */}
      {propEntries.length > 0 && (
        <div className="px-4 py-4 flex flex-col gap-2">
          <span className="text-[9px] font-bold text-rfm-text-400 tracking-[0.07em] uppercase">
            Props
          </span>
          <div className="flex flex-col gap-[5px]">
            {propEntries.map(([k, v]) => (
              <PropRow key={k} name={k} value={v} typeEntry={propTypes?.[k]} />
            ))}
          </div>
        </div>
      )}

      {propEntries.length === 0 && props !== null && (
        <div className="px-4 py-4">
          <p className="text-[11px] text-rfm-text-400">No props.</p>
        </div>
      )}

      {props === null && (
        <div className="px-4 py-4">
          <p className="text-[11px] text-rfm-text-400 leading-relaxed">
            Pick this element in the app window<br />to see live props.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── GraphWindow ──────────────────────────────────────────────────────────────

export function GraphWindow() {
  const [allEntries, setAllEntries] = useState<DocEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [propTypesMap, setPropTypesMap] = useState<PropTypesMap>({});
  const [currentProps, setCurrentProps] = useState<Record<string, unknown> | null>(null);
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
        setPropTypesMap(msg.propTypesMap ?? {});
        if (msg.selectedId) setSelectedId(prev => msg.selectedId || prev);
      } else if (msg.type === 'pick-result') {
        setSelectedId(msg.symbolId);
        setCurrentProps(null); // pick 완료 후 props는 select 메시지로 받음
        setPicking(false);
      } else if (msg.type === 'props-update') {
        if (msg.symbolId === selectedId || !selectedId) {
          setCurrentProps(msg.props);
        }
      }
    };

    return () => ch.close();
  }, [selectedId]);

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
    setCurrentProps(null); // 새 선택 시 props 초기화, 메인 창에서 보내줄 때까지 대기
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
        <span className="text-[11px] text-rfm-text-400">{allEntries.length} components</span>
        <div className="flex-1" />

        <button
          type="button"
          onClick={handlePickToggle}
          title={picking ? 'Cancel picking' : 'Pick element from app window'}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border text-[11px] font-medium transition-all cursor-pointer ${
            picking
              ? 'bg-rfm-blue text-white border-rfm-blue'
              : 'bg-transparent text-rfm-text-500 border-rfm-border-light hover:bg-rfm-bg-100 hover:text-rfm-text-900'
          }`}
        >
          <SquareMousePointer size={12} />
          {picking ? 'Picking…' : 'Pick element'}
        </button>

        <button
          type="button"
          onClick={handleBackToOverlay}
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
        <div className="w-[320px] min-w-[320px] border-l border-rfm-border flex flex-col overflow-hidden bg-white">
          {selectedEntry ? (
            <>
              {/* 상세 헤더 */}
              <div className="h-10 min-h-10 flex items-center justify-between px-4 border-b border-rfm-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-semibold text-rfm-text-900 truncate">
                    {selectedEntry.name}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-rfm-text-400 px-1.5 py-0.5 rounded bg-rfm-bg-100 shrink-0">
                    {selectedEntry.category}
                  </span>
                </div>
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
                    className="w-6 h-6 ml-1 flex items-center justify-center rounded border-none bg-transparent text-rfm-text-400 hover:text-rfm-text-700 hover:bg-rfm-bg-100 cursor-pointer transition-all shrink-0"
                  >
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>

              {/* 상세 본문 */}
              <div className="flex-1 overflow-hidden">
                <GraphEntryDetail
                  entry={selectedEntry}
                  props={currentProps}
                  propTypesMap={propTypesMap}
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
