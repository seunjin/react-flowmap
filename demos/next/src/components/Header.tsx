'use client';

export function Header() {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
      <div style={{ maxWidth: 672, margin: '0 auto' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
          react-flowmap — Next.js demo
        </h1>
      </div>
    </header>
  );
}
