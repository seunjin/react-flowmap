import { useState, useEffect, useRef } from 'react';
import type { DockPosition } from './types';

// ─── DOCK_LABELS ──────────────────────────────────────────────────────────────

export const DOCK_LABELS: Record<DockPosition, string> = {
  left: '왼쪽', bottom: '하단', right: '오른쪽', float: '플로팅',
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        data-gori-overlay
        type="button"
        onClick={() => setOpen(o => !o)}
        title="패널 위치 변경"
        style={{
          width: 26, height: 26, borderRadius: 5,
          border: '1px solid rgba(229,231,235,0.8)',
          background: open ? 'rgba(243,244,246,0.9)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 3, transition: 'background 100ms',
        }}
      >
        <DockSvg pos={current} color="#6b7280" />
      </button>
      {open && (
        <div
          data-gori-overlay
          style={{
            position: 'absolute', top: 30, left: 0,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(229,231,235,0.8)',
            borderRadius: 8, boxShadow: '0 4px 16px rgba(23,37,84,0.1)',
            padding: 4, zIndex: 10001, minWidth: 110,
          }}
        >
          {(['left', 'bottom', 'right', 'float'] as DockPosition[]).map(pos => (
            <button
              data-gori-overlay
              key={pos}
              type="button"
              onClick={() => { onChange(pos); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 8px', borderRadius: 5,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: current === pos ? 'rgba(243,244,246,0.9)' : 'transparent',
                color: current === pos ? '#111827' : '#6b7280',
                fontSize: 11, fontWeight: current === pos ? 600 : 400,
                transition: 'background 80ms',
              }}
              onMouseEnter={e => { if (current !== pos) (e.currentTarget as HTMLElement).style.background = 'rgba(243,244,246,0.8)'; }}
              onMouseLeave={e => { if (current !== pos) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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
