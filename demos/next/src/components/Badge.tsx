export function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 22,
        borderRadius: 5,
        background: '#eef2f7',
        color: '#475569',
        padding: '0 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0,
      }}
    >
      {label}
    </span>
  );
}
