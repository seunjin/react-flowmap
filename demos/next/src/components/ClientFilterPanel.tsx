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
    <section style={{ border: '1px solid #d9e0ea', borderRadius: 8, background: '#ffffff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 780, color: '#111827' }}>{title}</h2>
        <Badge label="stateful" />
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {segments.map((segment) => {
          const selected = segment.id === active?.id;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => setActiveId(segment.id)}
              style={{
                minHeight: 32,
                border: `1px solid ${selected ? '#93bdf8' : '#d9e0ea'}`,
                background: selected ? '#edf5ff' : '#ffffff',
                color: selected ? '#1556b7' : '#475569',
                borderRadius: 7,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: 720,
                cursor: 'pointer',
              }}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.65, color: '#5b6472' }}>
        {active?.description}
      </p>
    </section>
  );
}
