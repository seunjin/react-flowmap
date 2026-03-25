'use client';

import { Badge } from './Badge';

export function ComponentB() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>Component B</h2>
        <Badge label="client" />
      </div>
      <p style={{ fontSize: 14, color: '#6b7280' }}>
        Next.js App Router 클라이언트 컴포넌트에서 컴포넌트 트리 추적이 동작합니다.
      </p>
    </div>
  );
}
