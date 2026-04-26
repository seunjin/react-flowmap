import { Badge } from '@/components/Badge';
import { ClientFilterPanel } from '@/components/ClientFilterPanel';
import { ClientMetricCard } from '@/components/ClientMetricCard';

const metrics = [
  {
    label: 'Active route shell',
    value: '3',
    detail: 'Root layout, route page, and server-owned sections appear as static ownership.',
    tone: 'blue' as const,
  },
  {
    label: 'Client boundaries',
    value: '7',
    detail: 'Interactive components below the server shell are mounted in the browser runtime.',
    tone: 'green' as const,
  },
  {
    label: 'Inspectable props',
    value: '12+',
    detail: 'Typed props on client components are available in the detail panel.',
    tone: 'amber' as const,
  },
];

const segments = [
  {
    id: 'ownership',
    label: 'Ownership',
    description: 'Use this segment to verify route, server component, and client boundary ownership edges.',
  },
  {
    id: 'runtime',
    label: 'Runtime',
    description: 'Use this segment to verify live props, hover state, pick mode, and DOM highlight behavior.',
  },
  {
    id: 'source',
    label: 'Source',
    description: 'Use this segment to verify source jump and file ownership from the selected screen element.',
  },
];

export function ServerOverview() {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Badge label="server component" />
        <Badge label="static ownership" />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 750, color: '#111827' }}>
        Verify the screen-to-code graph on a mixed Next.js route
      </h2>
      <p style={{ marginTop: 10, maxWidth: 720, fontSize: 14, lineHeight: 1.7, color: '#4b5563' }}>
        This server-owned section imports several client boundaries. It should appear as static
        ownership above live client runtime nodes in React Flowmap.
      </p>
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        {metrics.map((metric) => (
          <ClientMetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <ClientFilterPanel title="Inspection focus" segments={segments} defaultSegment="runtime" />
      </div>
    </section>
  );
}
