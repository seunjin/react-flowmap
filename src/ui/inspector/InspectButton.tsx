import type React from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────

export type FlowmapConfig = {
  /** 플로팅 패널 초기 위치 (localStorage 저장값이 없을 때 사용) */
  defaultFloatPos?: { x: number; y: number };
  /** 인스펙터 버튼 위치 */
  buttonPosition?: { bottom?: number; right?: number; left?: number };
};

// ─── InspectButton ────────────────────────────────────────────────────────────

export function InspectButton({
  onClick, positionOverride,
}: {
  onClick: () => void;
  positionOverride?: FlowmapConfig['buttonPosition'];
}) {
  const bottom = positionOverride?.bottom ?? 20;
  const right  = positionOverride?.right  ?? (positionOverride?.left !== undefined ? undefined : 20);
  const left   = positionOverride?.left;

  return (
    <button
      data-rfm-overlay
      type="button"
      onClick={onClick}
      title="Component Inspector"
      className="fixed w-11 h-11 rounded-full border-none bg-rfm-blue text-white cursor-pointer flex items-center justify-center shadow-[0_2px_10px_rgba(59,130,246,0.4)] transition-all duration-180 z-10001"
      style={{
        bottom,
        ...(right !== undefined ? { right } : {}),
        ...(left  !== undefined ? { left  } : {}),
      } as React.CSSProperties}
    >
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
        {/* 오른쪽 링: 전체 원 */}
        <circle cx="14" cy="7" r="5" stroke="white" strokeWidth="2" fill="none" />
        {/* 마스크: 겹침 구간 상단 — 오른쪽 링 가림 */}
        <rect x="8.5" y="1" width="3.5" height="7" fill="#3b82f6" />
        {/* 왼쪽 링: 전체 원 (겹침 상단에서 앞으로) */}
        <circle cx="6" cy="7" r="5" stroke="white" strokeWidth="2" fill="none" />
        {/* 오른쪽 링 겹침 하단 재드로우 (겹침 하단에서 앞으로) */}
        <path d="M 9 7 A 5 5 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </button>
  );
}
