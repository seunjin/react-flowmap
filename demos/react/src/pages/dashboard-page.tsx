import {
  checklistItems,
  demoMetrics,
  inspectionSegments,
} from '../shared/demo-data';
import { DashboardOverview, RuntimeWorkflow } from '../widgets/demo-ui';

export function DashboardPage() {
  return (
    <div style={{ display: 'grid', gap: 30 }}>
      <DashboardOverview
        frameworkLabel="Vite React"
        metrics={demoMetrics}
        segments={inspectionSegments}
      />
      <RuntimeWorkflow items={checklistItems} />
    </div>
  );
}
