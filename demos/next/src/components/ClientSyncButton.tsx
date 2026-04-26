'use client';

import { useState } from 'react';

export function ClientSyncButton({ frameworkLabel }: { frameworkLabel: string }) {
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
