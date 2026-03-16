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
      title="컴포넌트 Inspector"
      style={{
        position: 'fixed',
        bottom,
        ...(right !== undefined ? { right } : {}),
        ...(left  !== undefined ? { left  } : {}),
        width: 44, height: 44, borderRadius: '50%', border: 'none',
        background: '#1d4ed8',
        color: '#ffffff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(29,78,216,0.4)',
        transition: 'all 180ms', zIndex: 10001,
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
