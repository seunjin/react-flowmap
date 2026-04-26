import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';

type HeaderProps = {
  activeRoute?: 'Dashboard' | 'Reports';
  frameworkLabel?: string;
};

const linkBase: CSSProperties = {
  minHeight: 34,
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 7,
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 700,
  textDecoration: 'none',
};

export function Header({
  activeRoute = 'Dashboard',
  frameworkLabel = 'Next.js App Router',
}: HeaderProps) {
  return (
    <header style={{ borderBottom: '1px solid #d9e0ea', background: '#ffffff' }}>
      <div
        style={{
          width: 'min(1120px, calc(100vw - 32px))',
          minHeight: 68,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#111827',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              flex: '0 0 auto',
            }}
          >
            R
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 780, color: '#111827' }}>
              Flowmap Ops
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#667085' }}>
              Runtime component map demo
            </p>
          </div>
        </div>

        <nav aria-label="Demo routes" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={frameworkLabel} />
          <Link
            href="/"
            style={{
              ...linkBase,
              border: `1px solid ${activeRoute === 'Dashboard' ? '#93bdf8' : '#d9e0ea'}`,
              background: activeRoute === 'Dashboard' ? '#edf5ff' : '#ffffff',
              color: activeRoute === 'Dashboard' ? '#1556b7' : '#475569',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/reports"
            style={{
              ...linkBase,
              border: `1px solid ${activeRoute === 'Reports' ? '#93bdf8' : '#d9e0ea'}`,
              background: activeRoute === 'Reports' ? '#edf5ff' : '#ffffff',
              color: activeRoute === 'Reports' ? '#1556b7' : '#475569',
            }}
          >
            Reports
          </Link>
        </nav>
      </div>
    </header>
  );
}
