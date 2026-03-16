import { useEffect } from 'react';

export function NotificationToast({
  message, onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      data-gori-overlay
      style={{
        position: 'fixed', bottom: 80, left: '50%',
        transform: 'translateX(-50%)',
        background: '#0f172a', color: '#fff',
        padding: '10px 18px', borderRadius: 8,
        fontSize: 13, fontWeight: 600,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        zIndex: 9999, whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 8,
        animation: 'gori-fadein 150ms ease',
      }}
    >
      <span style={{ color: '#86efac' }}>✓</span>
      {message}
    </div>
  );
}
