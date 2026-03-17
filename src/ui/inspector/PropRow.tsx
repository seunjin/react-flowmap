import { useState } from 'react';
import type { PropTypeEntry } from './types';

// ─── Primitive helpers ────────────────────────────────────────────────────────

export function primitiveColorClass(value: unknown): string {
  if (typeof value === 'string') return 'text-[#d97706]';
  if (typeof value === 'number') return 'text-[#2563eb]';
  if (typeof value === 'boolean') return 'text-[#dc2626]';
  return 'text-rfm-text-500';
}

export function primitiveLabel(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') {
    const raw = (value as { name?: string }).name ?? '';
    const name = raw === 'bound dispatchSetState' ? 'setState'
      : raw === 'bound dispatchReducerState' ? 'dispatch'
        : raw.startsWith('bound ') ? raw.slice(6)
          : raw;
    return name ? `${name} ƒ` : 'ƒ()';
  }
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

// ─── TypeFieldsView ───────────────────────────────────────────────────────────

export function TypeFieldsView({ fields, depth = 0 }: { fields: Record<string, PropTypeEntry>; depth?: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      {Object.entries(fields).map(([fname, field]) => (
        <div key={fname} style={{ paddingLeft: depth * 10 }}>
          <div>
            <span className="font-mono text-[10px] text-rfm-text-700 font-medium">{fname}{field.optional ? '?' : ''}</span>
            <span className="font-mono text-[10px] text-rfm-text-400">: </span>
            {field.fields
              ? <span className="font-mono text-[10px] text-rfm-text-400">{'{'}</span>
              : <span className="font-mono text-[10px] text-rfm-text-500">{field.type}</span>
            }
          </div>
          {field.fields && (
            <>
              <TypeFieldsView fields={field.fields} depth={depth + 1} />
              <span className="font-mono text-[10px] text-rfm-text-400" style={{ paddingLeft: depth * 10 }}>{'}'}</span>
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

  return (
    <div className="rounded-[5px] border border-[rgba(229,231,235,0.7)] overflow-hidden bg-[rgba(255,255,255,0.5)]">
      {/* 헤더: name? : TypeName */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[rgba(243,244,246,0.7)] border-b border-[rgba(229,231,235,0.6)]">
        <span className="font-mono text-[11px] text-rfm-text-900 font-semibold">{name}</span>
        {typeEntry?.optional && <span className="font-mono text-[11px] text-rfm-text-400">?</span>}
        {typeName && (
          <>
            <span className="font-mono text-[10px] text-rfm-text-400">:</span>
            {hasTypeDef ? (
              <button
                type="button"
                onClick={() => setTypeOpen(o => !o)}
                className={`font-mono text-[10px] rounded-[3px] px-1 py-0 flex items-center gap-0.5 cursor-pointer transition-all duration-[80ms] ${typeOpen
                  ? 'text-rfm-blue bg-[rgba(229,231,235,0.6)] border border-[rgba(203,213,225,0.8)]'
                  : 'text-rfm-text-400 bg-transparent border border-transparent'
                  }`}
              >
                <span>{typeName}</span>
                <span className="text-[7px] opacity-70">{typeOpen ? '▾' : '▸'}</span>
              </button>
            ) : (
              <span className="font-mono text-[10px] text-rfm-text-400">{typeName}</span>
            )}
          </>
        )}
      </div>

      {/* 타입 정의 (펼쳤을 때) */}
      {typeOpen && (typeEntry?.fields || typeEntry?.resolvedType) && (
        <div className="px-2 pt-1.5 pb-2 border-b border-[rgba(229,231,235,0.6)] bg-[rgba(249,250,251,0.4)]">
          {typeEntry.fields
            ? <TypeFieldsView fields={typeEntry.fields} />
            : <span className="font-mono text-[10px] text-rfm-text-500">{typeEntry.resolvedType}</span>
          }
        </div>
      )}

      {/* 런타임 값 */}
      <div className="px-2 pt-1 pb-1.5">
        {!isExpandable ? (
          <span className={`font-mono text-[11px] ${primitiveColorClass(value)}`}>
            {primitiveLabel(value)}
          </span>
        ) : (
          <pre className="m-0 font-mono text-[10px] leading-relaxed text-rfm-text-700 whitespace-pre-wrap">
            {JSON.stringify(value, (_k, v) => typeof v === 'function' ? primitiveLabel(v) : v, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
