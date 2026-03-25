'use client';

export function Badge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280',
    }}>
      {label}
    </span>
  );
}
