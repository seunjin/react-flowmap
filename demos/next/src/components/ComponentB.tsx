'use client';

import { Badge } from './Badge';

type ComponentBProps = {
  title?: string;
  description?: string;
  badge?: string;
  checks?: string[];
};

export function ComponentB({
  title = 'Component B',
  description = 'Next.js App Router 클라이언트 컴포넌트에서 컴포넌트 트리 추적이 동작합니다.',
  badge = 'client',
  checks = ['runtime render edge', 'DOM pick highlight', 'TypeScript prop hints'],
}: ComponentBProps) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 650, color: '#111827' }}>{title}</h2>
        <Badge label={badge} />
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6b7280' }}>
        {description}
      </p>
      <ul style={{ marginTop: 14, paddingLeft: 18, color: '#4b5563', fontSize: 13, lineHeight: 1.7 }}>
        {checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
    </div>
  );
}
