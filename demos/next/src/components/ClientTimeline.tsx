'use client';

import { useState } from 'react';
import { Badge } from './Badge';

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  body: string;
  status: 'route' | 'runtime' | 'request';
};

type ClientTimelineProps = {
  events: TimelineEvent[];
};

export function ClientTimeline({ events }: ClientTimelineProps) {
  const [expandedId, setExpandedId] = useState(events[0]?.id ?? '');

  return (
    <section style={{ border: '1px solid #d9e0ea', borderRadius: 8, background: '#ffffff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 780, color: '#111827' }}>Route transition trace</h2>
        <Badge label="client list" />
      </div>
      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {events.map((event) => {
          const expanded = event.id === expandedId;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => setExpandedId(expanded ? '' : event.id)}
              style={{
                textAlign: 'left',
                border: `1px solid ${expanded ? '#93bdf8' : '#d9e0ea'}`,
                background: expanded ? '#edf5ff' : '#ffffff',
                borderRadius: 7,
                padding: 12,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ minWidth: 48, fontSize: 12, color: '#667085' }}>{event.time}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 760, color: '#111827' }}>{event.title}</span>
                <Badge label={event.status} />
              </span>
              {expanded ? (
                <span style={{ display: 'block', margin: '8px 0 0', fontSize: 12, lineHeight: 1.65, color: '#5b6472' }}>
                  {event.body}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
