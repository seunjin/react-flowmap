import { ClientFilterPanel } from '@/components/ClientFilterPanel';
import { ClientTimeline } from '@/components/ClientTimeline';
import { reportSegments, timelineEvents } from './demo-data';

export function ServerReport() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
      <ClientTimeline events={timelineEvents} />
      <ClientFilterPanel title="Report focus" segments={reportSegments} defaultSegment="route" />
    </section>
  );
}
