import { reportSegments, timelineEvents } from '../shared/demo-data';
import { ReportWorkspace } from '../widgets/demo-ui';

export function ReportsPage() {
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 780, color: '#111827' }}>
          Weekly component report
        </h2>
        <p style={{ margin: '10px 0 0', maxWidth: 720, fontSize: 14, lineHeight: 1.65, color: '#5b6472' }}>
          The second route keeps the same UI primitives while changing the active route subtree.
        </p>
      </div>
      <ReportWorkspace segments={reportSegments} events={timelineEvents} />
    </div>
  );
}
