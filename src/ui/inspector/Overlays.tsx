import { clipToViewport } from './utils';

// ─── HoverPreviewBox ──────────────────────────────────────────────────────────

export function HoverPreviewBox({ rect, label }: { rect: DOMRect; label: string }) {
  const c = clipToViewport(rect);
  if (c.width <= 0 || c.height <= 0) return null;
  const labelAbove = rect.top > 22;
  return (
    <div style={{
      position: 'fixed', left: c.left, top: c.top, width: c.width, height: c.height,
      border: '1.5px dashed #9ca3af',
      background: 'rgba(59,130,246,0.04)',
      boxSizing: 'border-box', pointerEvents: 'none', zIndex: 9998,
    }}>
      <div style={{
        position: 'absolute',
        ...(labelAbove
          ? { top: -1, left: -1, transform: 'translateY(-100%)' }
          : { top: 3, left: 3 }),
        background: '#3b82f6',
        borderRadius: labelAbove ? '4px 4px 0 0' : 4,
        padding: '1px 7px', fontSize: 10, fontWeight: 600,
        color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.6,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        pointerEvents: 'none',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── ActiveSelectBox ──────────────────────────────────────────────────────────

export function ActiveSelectBox({ rect, label }: { rect: DOMRect; label: string }) {
  const c = clipToViewport(rect);
  if (c.width <= 0 || c.height <= 0) return null;
  const labelAbove = rect.top > 22;
  return (
    <div style={{
      position: 'fixed', left: c.left, top: c.top, width: c.width, height: c.height,
      border: '2px solid #1e40af',
      background: 'rgba(30,64,175,0.05)',
      boxSizing: 'border-box', pointerEvents: 'none', zIndex: 9999,
    }}>
      <div style={{
        position: 'absolute',
        ...(labelAbove
          ? { top: -1, left: -1, transform: 'translateY(-100%)' }
          : { top: 3, left: 3 }),
        background: '#1e40af',
        borderRadius: labelAbove ? '4px 4px 0 0' : 4,
        padding: '1px 7px', fontSize: 11, fontWeight: 600,
        color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.6,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        pointerEvents: 'none',
      }}>
        {label}
      </div>
    </div>
  );
}
