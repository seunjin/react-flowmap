export type FrameworkLabel = 'Vite React' | 'TanStack Router' | 'Next.js App Router';

export type MetricTone = 'blue' | 'green' | 'amber';

export type DemoMetric = {
  label: string;
  value: string;
  trend: string;
  detail: string;
  tone: MetricTone;
};

export type DemoSegment = {
  id: string;
  label: string;
  description: string;
};

export type DemoTimelineEvent = {
  id: string;
  time: string;
  title: string;
  body: string;
  status: 'route' | 'runtime' | 'request';
};

export type DemoChecklistItem = {
  id: string;
  label: string;
  helper: string;
};

export const demoMetrics: DemoMetric[] = [
  {
    label: 'Screen owners',
    value: '14',
    trend: '+4 from shell',
    detail: 'Route, page, section, and leaf components are visible as a single graph.',
    tone: 'blue',
  },
  {
    label: 'Runtime edges',
    value: '28',
    trend: 'live session',
    detail: 'Nested cards, filters, and timeline rows keep parent-child render links.',
    tone: 'green',
  },
  {
    label: 'Fetch events',
    value: '3',
    trend: 'mock API',
    detail: 'The sync action records request activity alongside component ownership.',
    tone: 'amber',
  },
];

export const inspectionSegments: DemoSegment[] = [
  {
    id: 'ownership',
    label: 'Ownership',
    description: 'Route shell, page content, and repeated leaf cards stay grouped by their owning component.',
  },
  {
    id: 'runtime',
    label: 'Runtime',
    description: 'Stateful controls update in place while the graph keeps the current render relationships.',
  },
  {
    id: 'source',
    label: 'Source',
    description: 'Every visible section carries enough metadata for source ownership and editor jumps.',
  },
];

export const reportSegments: DemoSegment[] = [
  {
    id: 'route',
    label: 'Route',
    description: 'The reports route renders the same dashboard primitives through a second screen.',
  },
  {
    id: 'request',
    label: 'Request',
    description: 'The timeline and sync button create request and call edges for runtime inspection.',
  },
  {
    id: 'props',
    label: 'Props',
    description: 'Metric cards, rows, and filters expose typed props in the detail panel.',
  },
];

export const timelineEvents: DemoTimelineEvent[] = [
  {
    id: 'route-mounted',
    time: '09:30',
    title: 'Dashboard route mounted',
    body: 'The route shell composed header, overview, workflow, and runtime checklist sections.',
    status: 'route',
  },
  {
    id: 'filter-changed',
    time: '09:42',
    title: 'Segment filter changed',
    body: 'Local state changed inside the filter panel without replacing the surrounding route.',
    status: 'runtime',
  },
  {
    id: 'summary-synced',
    time: '10:05',
    title: 'Summary endpoint synced',
    body: 'The demo fetch endpoint returned a new sequence number for request tracking.',
    status: 'request',
  },
];

export const checklistItems: DemoChecklistItem[] = [
  {
    id: 'dom-owner',
    label: 'DOM owner overlay',
    helper: 'Visible elements map back to their nearest component owner.',
  },
  {
    id: 'route-tree',
    label: 'Route subtree',
    helper: 'The graph follows the active dashboard or reports route.',
  },
  {
    id: 'typed-props',
    label: 'Typed props panel',
    helper: 'Cards and controls expose labels, values, and tone props.',
  },
  {
    id: 'request-flow',
    label: 'Request flow',
    helper: 'The sync endpoint adds request context to the runtime session.',
  },
];
