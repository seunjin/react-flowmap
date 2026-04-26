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

  const toggle = (id: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', padding: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</h3>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => {
          const selected = checked.has(item.id);
          return (
            <label
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 10,
                alignItems: 'start',
                padding: 10,
                borderRadius: 8,
                background: selected ? '#f0fdf4' : '#f9fafb',
                border: `1px solid ${selected ? '#bbf7d0' : '#e5e7eb'}`,
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
                <span style={{ display: 'block', fontSize: 13, fontWeight: 650, color: '#111827' }}>
                  {item.label}
                </span>
                <span style={{ display: 'block', marginTop: 3, fontSize: 12, lineHeight: 1.5, color: '#6b7280' }}>
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
