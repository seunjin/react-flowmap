'use client';

import { useState } from 'react';
import { Badge } from './Badge';

type ClientMetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'amber';
};

const toneMap = {
  blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  amber: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
};

export function ClientMetricCard({ label, value, detail, tone }: ClientMetricCardProps) {
  const [pinned, setPinned] = useState(false);
  const colors = toneMap[tone];

  return (
    <article style={{ border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.bg, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Badge label={pinned ? 'pinned' : 'live'} />
        <button
          type="button"
          onClick={() => setPinned((next) => !next)}
          style={{ border: 0, background: 'transparent', color: colors.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          {pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
      <div style={{ marginTop: 12, fontSize: 24, fontWeight: 750, color: colors.text }}>{value}</div>
      <h3 style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</h3>
      <p style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: '#4b5563' }}>{detail}</p>
    </article>
  );
}
