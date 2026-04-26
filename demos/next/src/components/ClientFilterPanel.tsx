'use client';

import { useMemo, useState } from 'react';
import { Badge } from './Badge';

type Segment = {
  id: string;
  label: string;
  description: string;
};

type ClientFilterPanelProps = {
  title: string;
  segments: Segment[];
  defaultSegment: string;
};

export function ClientFilterPanel({ title, segments, defaultSegment }: ClientFilterPanelProps) {
  const [activeId, setActiveId] = useState(defaultSegment);
  const active = useMemo(
    () => segments.find((segment) => segment.id === activeId) ?? segments[0],
    [activeId, segments],
  );

  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</h3>
        <Badge label="stateful" />
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {segments.map((segment) => {
          const selected = segment.id === active?.id;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => setActiveId(segment.id)}
              style={{
                border: `1px solid ${selected ? '#93c5fd' : '#e5e7eb'}`,
                background: selected ? '#eff6ff' : '#fff',
                color: selected ? '#1d4ed8' : '#4b5563',
                borderRadius: 7,
                padding: '6px 9px',
                fontSize: 12,
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
      <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: '#4b5563' }}>
        {active?.description}
      </p>
    </section>
  );
}
