import { Badge } from '@/components/Badge';
import { ClientInspectorChecklist } from '@/components/ClientInspectorChecklist';
import { checklistItems } from './demo-data';

export function ServerWorkflow() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
      <div style={{ borderRadius: 8, background: '#111827', color: '#ffffff', padding: 22 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Badge label="component map" />
          <Badge label="manual QA" />
        </div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 780 }}>Stable comparison surface</h2>
        <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.7, color: '#d5dbe5' }}>
          The same controls, cards, and route transitions appear in the Vite React, TanStack Router,
          and Next.js App Router demos.
        </p>
        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          {['Route shell', 'Metric cards', 'Stateful filters', 'Request sync'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                borderTop: '1px solid rgba(255,255,255,0.14)',
                paddingTop: 10,
                fontSize: 13,
              }}
            >
              <span style={{ color: '#d5dbe5' }}>{label}</span>
              <strong style={{ color: '#ffffff' }}>tracked</strong>
            </div>
          ))}
        </div>
      </div>
      <ClientInspectorChecklist title="Inspector coverage" items={checklistItems} />
    </section>
  );
}
