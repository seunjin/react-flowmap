'use client';

import { Badge } from './Badge';

type ComponentAProps = {
  title?: string;
  description?: string;
  badge?: string;
};

export function ComponentA({
  title = 'Component A',
  description = 'Next.js App Router 환경에서 react-flowmap inspector overlay 동작을 검증합니다.',
  badge = 'next.js',
}: ComponentAProps) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 650, color: '#111827' }}>{title}</h2>
        <Badge label={badge} />
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6b7280' }}>
        {description}
      </p>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge label="live props" />
        <Badge label="source jump" />
      </div>
    </div>
  );
}
