export function EmptyState({
  emoji, title, description,
}: {
  emoji: string;
  title: string;
  description?: string;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 12, padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{description}</div>
      )}
    </div>
  );
}
