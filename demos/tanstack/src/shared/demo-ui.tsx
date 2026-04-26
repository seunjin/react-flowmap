import { useMemo, useState, type CSSProperties } from 'react';
import type {
  DemoChecklistItem,
  DemoMetric,
  DemoSegment,
  DemoTimelineEvent,
  FrameworkLabel,
  MetricTone,
} from './demo-data';

type RouteId = 'dashboard' | 'reports';

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
  fontWeight: 780,
  color: '#111827',
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.65,
  color: '#5b6472',
};

const toneMap: Record<MetricTone, { bg: string; border: string; text: string; accent: string }> = {
  blue: { bg: '#eef6ff', border: '#b9d7ff', text: '#1556b7', accent: '#2563eb' },
  green: { bg: '#eefdf5', border: '#b6e8cb', text: '#166534', accent: '#16a34a' },
  amber: { bg: '#fff8e6', border: '#f1d58b', text: '#8a5a00', accent: '#d97706' },
};

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 22,
        borderRadius: 5,
        background: '#eef2f7',
        color: '#475569',
        padding: '0 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0,
      }}
    >
      {label}
    </span>
  );
}

export function DemoHeader({
  activeRoute,
  frameworkLabel,
  onNavigate,
}: {
  activeRoute: RouteId;
  frameworkLabel: FrameworkLabel;
  onNavigate: (path: '/' | '/reports') => void;
}) {
  const routes = [
    { id: 'dashboard' as const, path: '/' as const, label: 'Dashboard' },
    { id: 'reports' as const, path: '/reports' as const, label: 'Reports' },
  ];

  return (
    <header style={{ borderBottom: '1px solid #d9e0ea', background: '#ffffff' }}>
      <div
        style={{
          width: 'min(1120px, calc(100vw - 32px))',
          minHeight: 68,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#111827',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              flex: '0 0 auto',
            }}
          >
            R
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 780, color: '#111827' }}>
              Flowmap Ops
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#667085' }}>
              Runtime component map demo
            </p>
          </div>
        </div>

        <nav aria-label="Demo routes" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={frameworkLabel} />
          {routes.map((route) => {
            const selected = route.id === activeRoute;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => onNavigate(route.path)}
                style={{
                  minHeight: 34,
                  border: `1px solid ${selected ? '#93bdf8' : '#d9e0ea'}`,
                  borderRadius: 7,
                  background: selected ? '#edf5ff' : '#ffffff',
                  color: selected ? '#1556b7' : '#475569',
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {route.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function MetricCard({ label, value, trend, detail, tone }: DemoMetric) {
  const [pinned, setPinned] = useState(false);
  const colors = toneMap[tone];

  return (
    <article
      style={{
        minHeight: 188,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        background: colors.bg,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Badge label={pinned ? 'pinned' : 'live'} />
        <button
          type="button"
          onClick={() => setPinned((current) => !current)}
          style={{
            border: 0,
            background: 'transparent',
            color: colors.text,
            fontSize: 12,
            fontWeight: 760,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
      <div>
        <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 800, color: colors.text }}>{value}</div>
        <h3 style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 760, color: '#111827' }}>{label}</h3>
        <p style={{ ...mutedTextStyle, marginTop: 8, fontSize: 13 }}>{detail}</p>
      </div>
      <div style={{ color: colors.accent, fontSize: 12, fontWeight: 760 }}>{trend}</div>
    </article>
  );
}

export function FilterPanel({
  title,
  segments,
  defaultSegment,
}: {
  title: string;
  segments: DemoSegment[];
  defaultSegment: string;
}) {
  const [activeId, setActiveId] = useState(defaultSegment);
  const active = useMemo(
    () => segments.find((segment) => segment.id === activeId) ?? segments[0],
    [activeId, segments],
  );

  return (
    <section style={{ border: '1px solid #d9e0ea', borderRadius: 8, background: '#ffffff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 780, color: '#111827' }}>{title}</h2>
        <Badge label="stateful" />
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {segments.map((segment) => {
          const selected = segment.id === active?.id;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => setActiveId(segment.id)}
              style={{
                minHeight: 32,
                border: `1px solid ${selected ? '#93bdf8' : '#d9e0ea'}`,
                background: selected ? '#edf5ff' : '#ffffff',
                color: selected ? '#1556b7' : '#475569',
                borderRadius: 7,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: 720,
                cursor: 'pointer',
              }}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
      <p style={{ ...mutedTextStyle, marginTop: 14 }}>{active?.description}</p>
    </section>
  );
}

export function SyncButton({ frameworkLabel }: { frameworkLabel: FrameworkLabel }) {
  const [state, setState] = useState<'idle' | 'loading' | 'synced'>('idle');
  const [sequence, setSequence] = useState<number | null>(null);

  async function syncSummary() {
    setState('loading');
    const response = await fetch(`/api/flowmap-summary?framework=${encodeURIComponent(frameworkLabel)}`);
    const payload = await response.json() as { sequence: number };
    setSequence(payload.sequence);
    setState('synced');
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => { void syncSummary(); }}
        disabled={state === 'loading'}
        style={{
          minHeight: 36,
          border: '1px solid #111827',
          borderRadius: 7,
          background: '#111827',
          color: '#ffffff',
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 760,
          cursor: state === 'loading' ? 'wait' : 'pointer',
        }}
      >
        {state === 'loading' ? 'Syncing' : 'Sync summary'}
      </button>
      <span style={{ fontSize: 12, color: '#667085', minWidth: 116 }}>
        {sequence === null ? 'No sync yet' : `Sequence ${sequence}`}
      </span>
    </div>
  );
}

export function DashboardOverview({
  frameworkLabel,
  metrics,
  segments,
}: {
  frameworkLabel: FrameworkLabel;
  metrics: DemoMetric[];
  segments: DemoSegment[];
}) {
  return (
    <section style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <Badge label="route graph" />
            <Badge label="runtime session" />
            <Badge label={frameworkLabel} />
          </div>
          <h2 style={pageTitleStyle}>Release monitor for component relationships</h2>
          <p style={{ ...mutedTextStyle, marginTop: 12, maxWidth: 720 }}>
            A dense demo screen with nested sections, stateful controls, repeated cards, route transitions,
            and request activity. Each framework renders the same UI so Flowmap behavior can be compared directly.
          </p>
        </div>
        <FilterPanel title="Inspection focus" segments={segments} defaultSegment="runtime" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <SyncButton frameworkLabel={frameworkLabel} />
    </section>
  );
}

export function InspectorChecklist({ title, items }: { title: string; items: DemoChecklistItem[] }) {
  const [checked, setChecked] = useState(() => new Set(items.slice(0, 2).map((item) => item.id)));

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section style={{ border: '1px solid #d9e0ea', borderRadius: 8, background: '#ffffff', padding: 18 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 780, color: '#111827' }}>{title}</h2>
      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {items.map((item) => {
          const selected = checked.has(item.id);
          return (
            <label
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: 10,
                alignItems: 'start',
                padding: 10,
                borderRadius: 7,
                background: selected ? '#eefdf5' : '#f8fafc',
                border: `1px solid ${selected ? '#b6e8cb' : '#d9e0ea'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(item.id)}
                style={{ marginTop: 2 }}
              />
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 730, color: '#111827' }}>{item.label}</span>
                <span style={{ display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1.5, color: '#667085' }}>
                  {item.helper}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export function RuntimeWorkflow({ items }: { items: DemoChecklistItem[] }) {
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
      <InspectorChecklist title="Inspector coverage" items={items} />
    </section>
  );
}

export function Timeline({ events }: { events: DemoTimelineEvent[] }) {
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
              {expanded ? <span style={{ display: 'block', ...mutedTextStyle, marginTop: 8, fontSize: 12 }}>{event.body}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ReportWorkspace({
  segments,
  events,
}: {
  segments: DemoSegment[];
  events: DemoTimelineEvent[];
}) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
      <Timeline events={events} />
      <FilterPanel title="Report focus" segments={segments} defaultSegment="route" />
    </section>
  );
}
