'use client';

import { Badge } from './Badge';

export function ComponentA() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>Component A</h2>
        <Badge label="next.js" />
      </div>
      <p style={{ fontSize: 14, color: '#6b7280' }}>
        Next.js App Router 환경에서 react-flowmap inspector overlay 동작을 검증합니다.
      </p>
    </div>
  );
}
