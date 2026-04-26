import { clipToViewport } from "./utils";

export const OVERLAY_VISUALS = {
  selected: {
    outline: "2px solid #3b82f6",
    background: "rgba(59,130,246,0.05)",
    labelBackground: "#3b82f6",
    labelFontSize: 11,
    zIndex: 2147483646,
  },
  hovered: {
    outline: "1.5px dashed #64748b",
    background: "rgba(100,116,139,0.04)",
    labelBackground: "#94a3b8",
    labelFontSize: 10,
    zIndex: 2147483645,
  },
} as const;

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
  const visual = OVERLAY_VISUALS.hovered;
  return (
    <div
      data-rfm-overlay
      className="fixed box-border pointer-events-none"
      style={{
        left: c.left,
        top: c.top,
        width: c.width,
        height: c.height,
        outline: visual.outline,
        background: visual.background,
        zIndex: visual.zIndex,
      }}
    >
      <div
        className="absolute pointer-events-none font-semibold text-white whitespace-nowrap leading-[1.6] px-2 py-0.5"
        style={{
          background: visual.labelBackground,
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          fontSize: visual.labelFontSize,
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
  const visual = OVERLAY_VISUALS.selected;
  return (
    <div
      data-rfm-overlay
      className="fixed box-border pointer-events-none"
      style={{
        left: c.left,
        top: c.top,
        width: c.width,
        height: c.height,
        outline: visual.outline,
        background: visual.background,
        zIndex: visual.zIndex,
      }}
    >
      <div
        className="absolute pointer-events-none font-semibold text-white whitespace-nowrap leading-[1.6] px-2 py-0.5"
        style={{
          background: visual.labelBackground,
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          fontSize: visual.labelFontSize,
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
