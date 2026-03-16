import { useState } from 'react';
import type React from 'react';
import type { PropTypeEntry } from './types';

// ─── Primitive helpers ────────────────────────────────────────────────────────

export function primitiveColor(value: unknown): string {
  if (typeof value === 'string')  return '#16a34a';
  if (typeof value === 'number')  return '#2563eb';
  if (typeof value === 'boolean') return '#dc2626';
  return '#6b7280';
}

export function primitiveLabel(value: unknown): string {
  if (value === null)      return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') {
    const raw = (value as { name?: string }).name ?? '';
    const name = raw === 'bound dispatchSetState'    ? 'setState'
               : raw === 'bound dispatchReducerState' ? 'dispatch'
               : raw.startsWith('bound ')             ? raw.slice(6)
               : raw;
    return name ? `${name} ƒ` : 'ƒ()';
  }
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

// ─── TypeFieldsView ───────────────────────────────────────────────────────────

export function TypeFieldsView({ fields, depth = 0 }: { fields: Record<string, PropTypeEntry>; depth?: number }) {
  const s = { fontFamily: 'monospace', fontSize: 10 } as React.CSSProperties;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Object.entries(fields).map(([fname, field]) => (
        <div key={fname} style={{ paddingLeft: depth * 10 }}>
          <div>
            <span style={{ ...s, color: '#374151', fontWeight: 500 }}>{fname}{field.optional ? '?' : ''}</span>
            <span style={{ ...s, color: '#9ca3af' }}>: </span>
            {field.fields
              ? <span style={{ ...s, color: '#9ca3af' }}>{'{'}</span>
              : <span style={{ ...s, color: '#6b7280' }}>{field.type}</span>
            }
          </div>
          {field.fields && (
            <>
              <TypeFieldsView fields={field.fields} depth={depth + 1} />
              <span style={{ ...s, color: '#9ca3af', paddingLeft: depth * 10 }}>{'}'}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PropRow ──────────────────────────────────────────────────────────────────

export function PropRow({ name, value, typeEntry }: { name: string; value: unknown; typeEntry?: PropTypeEntry | undefined }) {
  const [typeOpen, setTypeOpen] = useState(false);
  const isObj = value !== null && typeof value === 'object';
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;
  const typeName = typeEntry?.type ?? null;
  const hasTypeDef = !!(typeEntry?.fields || typeEntry?.resolvedType);

  const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11 };

  return (
    <div style={{
      borderRadius: 5, border: '1px solid rgba(229,231,235,0.7)', overflow: 'hidden',
      background: 'rgba(255,255,255,0.5)',
    }}>
      {/* 헤더: name? : TypeName */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', background: 'rgba(243,244,246,0.7)',
        borderBottom: '1px solid rgba(229,231,235,0.6)',
      }}>
        <span style={{ ...mono, color: '#111827', fontWeight: 600 }}>{name}</span>
        {typeEntry?.optional && <span style={{ ...mono, color: '#9ca3af' }}>?</span>}
        {typeName && (
          <>
            <span style={{ ...mono, fontSize: 10, color: '#9ca3af' }}>:</span>
            {hasTypeDef ? (
              <button
                type="button"
                onClick={() => setTypeOpen(o => !o)}
                style={{
                  ...mono, fontSize: 10, color: typeOpen ? '#1e40af' : '#9ca3af',
                  background: typeOpen ? 'rgba(229,231,235,0.6)' : 'transparent',
                  border: typeOpen ? '1px solid rgba(203,213,225,0.8)' : '1px solid transparent',
                  borderRadius: 3, padding: '0 4px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2, transition: 'all 80ms',
                }}
              >
                <span>{typeName}</span>
                <span style={{ fontSize: 7, opacity: 0.7 }}>{typeOpen ? '▾' : '▸'}</span>
              </button>
            ) : (
              <span style={{ ...mono, fontSize: 10, color: '#9ca3af' }}>{typeName}</span>
            )}
          </>
        )}
      </div>

      {/* 타입 정의 (펼쳤을 때) */}
      {typeOpen && (typeEntry?.fields || typeEntry?.resolvedType) && (
        <div style={{
          padding: '6px 8px 8px',
          borderBottom: '1px solid rgba(229,231,235,0.6)',
          background: 'rgba(249,250,251,0.4)',
        }}>
          {typeEntry.fields
            ? <TypeFieldsView fields={typeEntry.fields} />
            : <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280' }}>{typeEntry.resolvedType}</span>
          }
        </div>
      )}

      {/* 런타임 값 */}
      <div style={{ padding: '4px 8px 6px' }}>
        {!isExpandable ? (
          <span style={{ ...mono, color: primitiveColor(value) }}>
            {primitiveLabel(value)}
          </span>
        ) : (
          <pre style={{
            margin: 0, padding: '4px 6px',
            background: 'rgba(243,244,246,0.6)', border: '1px solid rgba(229,231,235,0.6)', borderRadius: 3,
            ...mono, fontSize: 10, lineHeight: 1.6, color: '#374151',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {JSON.stringify(value, (_k, v) => typeof v === 'function' ? primitiveLabel(v) : v, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
