'use client';

import { useState } from 'react';
import { Badge } from './Badge';

type MetricTone = 'blue' | 'green' | 'amber';

type ClientMetricCardProps = {
  label: string;
  value: string;
  trend: string;
  detail: string;
  tone: MetricTone;
};

const toneMap: Record<MetricTone, { bg: string; border: string; text: string; accent: string }> = {
  blue: { bg: '#eef6ff', border: '#b9d7ff', text: '#1556b7', accent: '#2563eb' },
  green: { bg: '#eefdf5', border: '#b6e8cb', text: '#166534', accent: '#16a34a' },
  amber: { bg: '#fff8e6', border: '#f1d58b', text: '#8a5a00', accent: '#d97706' },
};

export function ClientMetricCard({ label, value, trend, detail, tone }: ClientMetricCardProps) {
  const [pinned, setPinned] = useState(false);
  const colors = toneMap[tone];

  return (
    <article
      style={{
        minHeight: 188,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        background: colors.bg,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Badge label={pinned ? 'pinned' : 'live'} />
        <button
          type="button"
          onClick={() => setPinned((current) => !current)}
          style={{
            border: 0,
            background: 'transparent',
            color: colors.text,
            fontSize: 12,
            fontWeight: 760,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
      <div>
        <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 800, color: colors.text }}>{value}</div>
        <h3 style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 760, color: '#111827' }}>{label}</h3>
        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.65, color: '#5b6472' }}>{detail}</p>
      </div>
      <div style={{ color: colors.accent, fontSize: 12, fontWeight: 760 }}>{trend}</div>
    </article>
  );
}
