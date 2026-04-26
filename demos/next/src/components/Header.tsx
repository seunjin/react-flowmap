'use client';

import Link from 'next/link';

type HeaderProps = {
  activeRoute?: 'Home' | 'Reports';
  repoName?: string;
};

export function Header({ activeRoute = 'Home', repoName = 'react-flowmap' }: HeaderProps) {
  const linkBase = {
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    padding: '6px 9px',
    borderRadius: 6,
  } satisfies React.CSSProperties;

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {repoName} — Next.js demo
          </h1>
          <p style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>
            Server ownership, client runtime boundaries, props, and route context.
          </p>
        </div>
        <nav aria-label="Demo routes" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link
            href="/"
            style={{
              ...linkBase,
              background: activeRoute === 'Home' ? '#eff6ff' : 'transparent',
              color: activeRoute === 'Home' ? '#1d4ed8' : '#4b5563',
            }}
          >
            Home
          </Link>
          <Link
            href="/reports"
            style={{
              ...linkBase,
              background: activeRoute === 'Reports' ? '#eff6ff' : 'transparent',
              color: activeRoute === 'Reports' ? '#1d4ed8' : '#4b5563',
            }}
          >
            Reports
          </Link>
        </nav>
      </div>
    </header>
  );
}
