import type { PropTypeEntry } from './types';

// ─── Primitive helpers ────────────────────────────────────────────────────────

function isRfmFn(value: unknown): value is { __rfmFn: string } {
  return typeof value === 'object' && value !== null && '__rfmFn' in value;
}

export function primitiveColorClass(value: unknown): string {
  if (isRfmFn(value)) return 'text-rfm-text-500';
  if (typeof value === 'string') return 'text-[#d97706]';
  if (typeof value === 'number') return 'text-[#2563eb]';
  if (typeof value === 'boolean') return 'text-[#dc2626]';
  return 'text-rfm-text-500';
}

export function primitiveLabel(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (isRfmFn(value)) {
    const name = (value as { __rfmFn: string }).__rfmFn;
    return name ? `${name}()` : '() => {}';
  }
  if (typeof value === 'function') {
    const raw = (value as { name?: string }).name ?? '';
    const name = raw === 'bound dispatchSetState' ? 'setState'
      : raw === 'bound dispatchReducerState' ? 'dispatch'
        : raw.startsWith('bound ') ? raw.slice(6)
          : raw;
    return name ? `${name}()` : '() => {}';
  }
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

// ─── PropRow ──────────────────────────────────────────────────────────────────

export function PropRow({ name, value, typeEntry }: { name: string; value: unknown; typeEntry?: PropTypeEntry | undefined }) {
  const isObj = value !== null && typeof value === 'object' && !isRfmFn(value);
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;
  const typeName = typeEntry?.type ?? null;

  return (
    <div className="rounded-[5px] border border-[rgba(229,231,235,0.7)] overflow-hidden bg-[rgba(255,255,255,0.5)]">
      {/* 헤더: name? : TypeName */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[rgba(243,244,246,0.7)] border-b border-[rgba(229,231,235,0.6)]">
        <span className="font-mono text-[11px] text-rfm-text-900 font-semibold">{name}</span>
        {typeEntry?.optional && <span className="font-mono text-[11px] text-rfm-text-400">?</span>}
        {typeName && (
          <>
            <span className="font-mono text-[10px] text-rfm-text-400">:</span>
            <span className="font-mono text-[10px] text-rfm-text-400" title={typeName}>
              {typeName}
            </span>
          </>
        )}
      </div>

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
