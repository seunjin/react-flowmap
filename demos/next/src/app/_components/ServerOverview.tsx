import { Badge } from '@/components/Badge';
import { ClientFilterPanel } from '@/components/ClientFilterPanel';
import { ClientMetricCard } from '@/components/ClientMetricCard';
import { ClientSyncButton } from '@/components/ClientSyncButton';
import { demoMetrics, inspectionSegments } from './demo-data';

export function ServerOverview() {
  return (
    <section style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <Badge label="route graph" />
            <Badge label="runtime session" />
            <Badge label="Next.js App Router" />
          </div>
          <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 780, color: '#111827' }}>
            Release monitor for component relationships
          </h2>
          <p style={{ margin: '12px 0 0', maxWidth: 720, fontSize: 14, lineHeight: 1.65, color: '#5b6472' }}>
            A dense demo screen with nested sections, stateful controls, repeated cards, route transitions,
            and request activity. Each framework renders the same UI so Flowmap behavior can be compared directly.
          </p>
        </div>
        <ClientFilterPanel title="Inspection focus" segments={inspectionSegments} defaultSegment="runtime" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {demoMetrics.map((metric) => (
          <ClientMetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <ClientSyncButton frameworkLabel="Next.js App Router" />
    </section>
  );
}
