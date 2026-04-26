import { clipToViewport } from "./utils";

// ─── HoverPreviewBox ──────────────────────────────────────────────────────────

export function HoverPreviewBox({
  rect,
  label,
}: {
  rect: DOMRect;
  label: string;
}) {
  const c = clipToViewport(rect);
  if (c.width <= 0 || c.height <= 0) return null;
  const labelAbove = rect.top > 22;
  return (
    <div
      data-rfm-overlay
      className="fixed border-[1.5px] border-dashed border-rfm-text-400 box-border pointer-events-none z-9998"
      style={{ left: c.left, top: c.top, width: c.width, height: c.height }}
    >
      <div
        className="absolute bg-gray-300 pointer-events-none text-[10px] font-semibold text-white whitespace-nowrap leading-[1.6] px-[7px] py-px"
        style={{
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          borderRadius: labelAbove ? "4px 4px 0 0" : 4,
          ...(labelAbove
            ? { top: -1, left: -1, transform: "translateY(-100%)" }
            : { top: 3, left: 3 }),
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── ActiveSelectBox ──────────────────────────────────────────────────────────

export function ActiveSelectBox({
  rect,
  label,
}: {
  rect: DOMRect;
  label: string;
}) {
  const c = clipToViewport(rect);
  if (c.width <= 0 || c.height <= 0) return null;
  const labelAbove = rect.top > 22;
  return (
    <div
      data-rfm-overlay
      className="fixed border-[1.5px] border-rfm-blue bg-[rgba(59,130,246,0.05)] box-border pointer-events-none z-9999"
      style={{ left: c.left, top: c.top, width: c.width, height: c.height }}
    >
      <div
        className="absolute bg-rfm-blue pointer-events-none text-[11px] font-semibold text-white whitespace-nowrap leading-[1.6] px-[7px] py-px"
        style={{
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          borderRadius: labelAbove ? "4px 4px 0 0" : 4,
          ...(labelAbove
            ? { top: -1, left: -1, transform: "translateY(-100%)" }
            : { top: 3, left: 3 }),
        }}
      >
        {label}
      </div>
    </div>
  );
}
