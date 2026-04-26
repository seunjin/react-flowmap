'use client';

import { useState } from 'react';
import { Badge } from './Badge';

export type TimelineEvent = {
  id: string;
  title: string;
  body: string;
  status: 'server' | 'client' | 'static';
};

type ClientTimelineProps = {
  events: TimelineEvent[];
};

export function ClientTimeline({ events }: ClientTimelineProps) {
  const [expandedId, setExpandedId] = useState(events[0]?.id ?? '');

  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Route transition trace</h3>
        <Badge label="client list" />
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((event) => {
          const expanded = event.id === expandedId;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => setExpandedId(expanded ? '' : event.id)}
              style={{
                textAlign: 'left',
                border: `1px solid ${expanded ? '#bfdbfe' : '#e5e7eb'}`,
                background: expanded ? '#eff6ff' : '#fff',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{event.title}</span>
                <Badge label={event.status} />
              </div>
              {expanded ? (
                <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: '#4b5563' }}>{event.body}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
