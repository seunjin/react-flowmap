import type React from 'react';
import type { KnownEditorId } from '../../editor.js';

// ─── Brand Symbol ─────────────────────────────────────────────────────────────

function RfmLogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* root node */}
      <circle cx="10" cy="3.5" r="2.5" stroke="white" strokeWidth="1.5" />
      {/* leaf node — left */}
      <circle cx="3.5" cy="16.5" r="2.5" stroke="white" strokeWidth="1.5" />
      {/* leaf node — right */}
      <circle cx="16.5" cy="16.5" r="2.5" stroke="white" strokeWidth="1.5" />
      {/* edge: root → left */}
      <line x1="8.9" y1="5.7" x2="4.6" y2="14.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      {/* edge: root → right */}
      <line x1="11.1" y1="5.7" x2="15.4" y2="14.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

export type FlowmapConfig = {
  /** 플로팅 패널 초기 위치 (localStorage 저장값이 없을 때 사용) */
  defaultFloatPos?: { x: number; y: number };
  /** 인스펙터 버튼 위치 */
  buttonPosition?: { bottom?: number; right?: number; left?: number };
  /** 에디터 열기에 사용할 커맨드 */
  editor?: KnownEditorId | (string & {});
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
      title="Open React Flowmap"
      className="fixed w-11 h-11 rounded-full border-none bg-rfm-blue text-white cursor-pointer flex items-center justify-center shadow-[0_2px_10px_rgba(59,130,246,0.4)] transition-all duration-180 z-10001"
      style={{
        bottom,
        ...(right !== undefined ? { right } : {}),
        ...(left  !== undefined ? { left  } : {}),
      } as React.CSSProperties}
    >
      <RfmLogoIcon />
    </button>
  );
}
