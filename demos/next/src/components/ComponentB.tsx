import { Badge } from './Badge';

export function ComponentB() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>Component B</h2>
        <Badge label="rsc" />
      </div>
      <p style={{ fontSize: 14, color: '#6b7280' }}>
        RSC 환경에서 inspector overlay가 클라이언트 전용으로 마운트되는지 확인합니다.<br />
        (webpack plugin 미구현 — 컴포넌트 추적 없음)
      </p>
    </div>
  );
}
