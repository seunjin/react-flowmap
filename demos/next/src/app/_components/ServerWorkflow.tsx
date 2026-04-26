import { Badge } from '@/components/Badge';
import { ClientInspectorChecklist, type ChecklistItem } from '@/components/ClientInspectorChecklist';

const checklist: ChecklistItem[] = [
  {
    id: 'pick',
    label: 'Pick an element from the app window',
    helper: 'The selected source bar should show the owning component and file path.',
  },
  {
    id: 'route',
    label: 'Select the HomePage route node',
    helper: 'The detail panel should show parent layout and reachable client boundaries.',
  },
  {
    id: 'props',
    label: 'Select a client metric card',
    helper: 'The detail panel should show live props and TypeScript prop names.',
  },
  {
    id: 'hover',
    label: 'Hover graph nodes',
    helper: 'The graph node and related edges should highlight without moving the layout.',
  },
];

export function ServerWorkflow() {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 18 }}>
      <div style={{ background: '#111827', color: '#fff', borderRadius: 12, padding: 22 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Badge label="server notes" />
          <Badge label="manual QA" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 750 }}>What this demo validates</h2>
        <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7, color: '#d1d5db' }}>
          The page intentionally mixes server-only structure, client boundaries, nested client
          components, repeated component usage, typed props, and stateful UI.
        </p>
        <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7, color: '#9ca3af' }}>
          SERVER nodes should stay static. CLIENT nodes should expose live props, source ownership,
          hover, pick, and runtime edges.
        </p>
      </div>
      <ClientInspectorChecklist title="Inspector checklist" items={checklist} />
    </section>
  );
}
