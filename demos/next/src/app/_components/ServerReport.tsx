import { ClientFilterPanel } from '@/components/ClientFilterPanel';
import { ClientTimeline, type TimelineEvent } from '@/components/ClientTimeline';

const reportSegments = [
  {
    id: 'route',
    label: 'Route',
    description: 'The /reports page has its own page file and nested layout context.',
  },
  {
    id: 'server',
    label: 'Server',
    description: 'The report shell is server-owned and should not expose live props.',
  },
  {
    id: 'client',
    label: 'Client',
    description: 'The timeline is a mounted client boundary with local state.',
  },
];

const events: TimelineEvent[] = [
  {
    id: 'layout',
    title: 'ReportsLayout wraps the route',
    body: 'Selecting this route should show route context separate from the root page.',
    status: 'server',
  },
  {
    id: 'page',
    title: 'ReportsPage renders server report shell',
    body: 'This page imports a server component that imports client boundaries.',
    status: 'static',
  },
  {
    id: 'timeline',
    title: 'ClientTimeline is interactive',
    body: 'Clicking rows changes local state and should remain inspectable as CLIENT runtime data.',
    status: 'client',
  },
];

export function ServerReport() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18 }}>
      <ClientTimeline events={events} />
      <ClientFilterPanel title="Report focus" segments={reportSegments} defaultSegment="route" />
    </section>
  );
}
