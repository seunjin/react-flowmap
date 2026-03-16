import type React from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────

export type GoriConfig = {
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
  positionOverride?: GoriConfig['buttonPosition'];
}) {
  const bottom = positionOverride?.bottom ?? 20;
  const right  = positionOverride?.right  ?? (positionOverride?.left !== undefined ? undefined : 20);
  const left   = positionOverride?.left;

  return (
    <button
      data-gori-overlay
      type="button"
      onClick={onClick}
      title="Component Inspector"
      className="fixed w-11 h-11 rounded-full border-none bg-[#3b82f6] text-white cursor-pointer flex items-center justify-center shadow-[0_2px_10px_rgba(59,130,246,0.4)] transition-all duration-[180ms] z-[10001]"
      style={{
        bottom,
        ...(right !== undefined ? { right } : {}),
        ...(left  !== undefined ? { left  } : {}),
      } as React.CSSProperties}
    >
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        {/* 3D 입체 육각형 */}
        <path d="M 11 3 L 18 7 L 18 15 L 11 19 L 4 15 L 4 7 Z"
          stroke="white" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="11" y1="11" x2="18" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="11" y1="11" x2="11" y2="19" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="11" y1="11" x2="4" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </button>
  );
}
