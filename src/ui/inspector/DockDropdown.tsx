import { useState, useEffect, useRef } from 'react';
import type { DockPosition } from './types';

// ─── DOCK_LABELS ──────────────────────────────────────────────────────────────

export const DOCK_LABELS: Record<DockPosition, string> = {
  left: 'Left', bottom: 'Bottom', right: 'Right', float: 'Float',
};

// ─── DockSvg ──────────────────────────────────────────────────────────────────

export function DockSvg({ pos, color }: { pos: DockPosition; color: string }) {
  const c = color;
  if (pos === 'left') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
      <rect x="1" y="1" width="5" height="12" rx="2" fill={c} opacity="0.35" stroke={c} strokeWidth="1.2"/>
    </svg>
  );
  if (pos === 'bottom') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
      <rect x="1" y="8" width="12" height="5" rx="2" fill={c} opacity="0.35" stroke={c} strokeWidth="1.2"/>
    </svg>
  );
  if (pos === 'right') return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke={c} strokeWidth="1.2"/>
      <rect x="8" y="1" width="5" height="12" rx="2" fill={c} opacity="0.35" stroke={c} strokeWidth="1.2"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="1" width="10" height="9" rx="2" stroke={c} strokeWidth="1.2"/>
      <rect x="1" y="4" width="10" height="9" rx="2" fill="rgba(255,255,255,0.8)" stroke={c} strokeWidth="1.2"/>
    </svg>
  );
}

// ─── DockDropdown ─────────────────────────────────────────────────────────────

export function DockDropdown({ current, onChange }: { current: DockPosition; onChange: (p: DockPosition) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        data-rfm-overlay
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Change panel position"
        className={`w-6 h-6 rounded-[4px] border-none cursor-pointer flex items-center justify-center transition-all duration-100 ${
          open
            ? 'bg-rfm-bg-100 text-rfm-text-700'
            : 'bg-transparent text-rfm-text-400 hover:bg-rfm-bg-100 hover:text-rfm-text-700'
        }`}
      >
        <DockSvg pos={current} color={open ? '#374151' : '#9ca3af'} />
      </button>
      {open && (
        <div
          data-rfm-overlay
          className="absolute top-[30px] left-0 bg-[rgba(255,255,255,0.95)] backdrop-blur-[12px] border border-rfm-border-light rounded-lg shadow-[0_4px_16px_rgba(23,37,84,0.1)] p-1 z-[10001] min-w-[110px]"
        >
          {(['left', 'bottom', 'right', 'float'] as DockPosition[]).map(pos => (
            <button
              data-rfm-overlay
              key={pos}
              type="button"
              onClick={() => { onChange(pos); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-[5px] border-none cursor-pointer text-left text-[11px] transition-[background] duration-[80ms] ${
                current === pos
                  ? 'bg-[rgba(243,244,246,0.9)] text-rfm-text-900 font-semibold'
                  : 'bg-transparent text-rfm-text-500 font-normal hover:bg-[rgba(243,244,246,0.8)]'
              }`}
            >
              <DockSvg pos={pos} color={current === pos ? '#111827' : '#9ca3af'} />
              {DOCK_LABELS[pos]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
