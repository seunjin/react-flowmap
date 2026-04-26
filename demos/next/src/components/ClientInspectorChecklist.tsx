'use client';

import { useState } from 'react';

export type ChecklistItem = {
  id: string;
  label: string;
  helper: string;
};

type ClientInspectorChecklistProps = {
  title: string;
  items: ChecklistItem[];
};

export function ClientInspectorChecklist({ title, items }: ClientInspectorChecklistProps) {
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
