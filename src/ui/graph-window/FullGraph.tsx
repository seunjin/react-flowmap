import { useMemo, useRef, useState, useCallback } from 'react';
import type { DocEntry } from '../doc/build-doc-index';

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 34;
const COL_GAP = 96;   // gap between columns
const ROW_GAP = 14;   // gap between rows in same column
const COL_W = NODE_W + COL_GAP;
const ROW_H = NODE_H + ROW_GAP;
const PAD = 40;       // canvas padding

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayoutNode {
  entry: DocEntry;
  x: number;
  y: number;
}

interface LayoutEdge {
  fromId: string;
  toId: string;
  kind: 'render' | 'use';
}

interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  canvasW: number;
  canvasH: number;
}

// ─── Layout builder ───────────────────────────────────────────────────────────

function buildLayout(entries: DocEntry[]): Layout {
  if (entries.length === 0) return { nodes: [], edges: [], canvasW: 300, canvasH: 200 };

  const byId = new Map(entries.map(e => [e.symbolId, e]));

  // BFS from roots to assign column depth
  const depthMap = new Map<string, number>();
  const roots = entries.filter(e => e.renderedBy.length === 0);
  const actualRoots = roots.length > 0 ? roots : entries.filter(e => e.category === 'page');
  const startNodes = actualRoots.length > 0 ? actualRoots : [entries[0]!];

  const bfsQueue: Array<{ id: string; depth: number }> = startNodes.map(r => ({ id: r.symbolId, depth: 0 }));
  const visited = new Set<string>();

  while (bfsQueue.length > 0) {
    const item = bfsQueue.shift()!;
    if (visited.has(item.id)) continue;
    visited.add(item.id);
    // Use maximum depth when encountered multiple times
    const existing = depthMap.get(item.id) ?? -1;
    if (item.depth > existing) depthMap.set(item.id, item.depth);

    const entry = byId.get(item.id);
    if (!entry) continue;
    for (const child of [...entry.renders, ...entry.uses]) {
      if (!visited.has(child.symbolId)) {
        bfsQueue.push({ id: child.symbolId, depth: item.depth + 1 });
      }
    }
  }

  // Assign disconnected nodes to last column
  let maxDepth = depthMap.size > 0 ? Math.max(...depthMap.values()) : 0;
  for (const entry of entries) {
    if (!depthMap.has(entry.symbolId)) {
      depthMap.set(entry.symbolId, ++maxDepth);
    }
  }

  // Group by depth, sort: pages first, then hooks last, then alphabetical
  const colGroups = new Map<number, DocEntry[]>();
  for (const entry of entries) {
    const d = depthMap.get(entry.symbolId)!;
    if (!colGroups.has(d)) colGroups.set(d, []);
    colGroups.get(d)!.push(entry);
  }
  const sortGroup = (a: DocEntry, b: DocEntry) => {
    const catOrder = (e: DocEntry) => e.category === 'page' ? 0 : e.category === 'hook' ? 2 : 1;
    if (catOrder(a) !== catOrder(b)) return catOrder(a) - catOrder(b);
    return a.name.localeCompare(b.name);
  };
  for (const group of colGroups.values()) group.sort(sortGroup);

  const numCols = maxDepth + 1;
  const colHeights = Array.from({ length: numCols }, (_, i) => {
    const cnt = colGroups.get(i)?.length ?? 0;
    return Math.max(0, cnt * ROW_H - ROW_GAP);
  });
  const maxColH = Math.max(...colHeights, NODE_H);

  // Position nodes
  const posMap = new Map<string, { x: number; y: number }>();
  for (let d = 0; d < numCols; d++) {
    const group = colGroups.get(d) ?? [];
    const colH = colHeights[d] ?? 0;
    const startY = PAD + (maxColH - colH) / 2;
    group.forEach((entry, i) => {
      posMap.set(entry.symbolId, {
        x: PAD + d * COL_W,
        y: startY + i * ROW_H,
      });
    });
  }

  // Build edges (deduplicated)
  const edgeSet = new Set<string>();
  const edges: LayoutEdge[] = [];
  for (const entry of entries) {
    for (const child of entry.renders) {
      const key = `${entry.symbolId}>${child.symbolId}:render`;
      if (!edgeSet.has(key) && posMap.has(child.symbolId)) {
        edgeSet.add(key);
        edges.push({ fromId: entry.symbolId, toId: child.symbolId, kind: 'render' });
      }
    }
    for (const hook of entry.uses) {
      const key = `${entry.symbolId}>${hook.symbolId}:use`;
      if (!edgeSet.has(key) && posMap.has(hook.symbolId)) {
        edgeSet.add(key);
        edges.push({ fromId: entry.symbolId, toId: hook.symbolId, kind: 'use' });
      }
    }
  }

  const nodes: LayoutNode[] = entries
    .map(entry => {
      const pos = posMap.get(entry.symbolId);
      return pos ? { entry, ...pos } : null;
    })
    .filter(Boolean) as LayoutNode[];

  const canvasW = PAD + numCols * COL_W - COL_GAP + PAD;
  const canvasH = PAD + maxColH + PAD;

  return { nodes, edges, canvasW, canvasH };
}

// ─── Edge path ────────────────────────────────────────────────────────────────

function edgePath(
  fx: number, fy: number,
  tx: number, ty: number,
): string {
  // Source: right-center of node, Target: left-center of node
  const sx = fx + NODE_W;
  const sy = fy + NODE_H / 2;
  const ex = tx;
  const ey = ty + NODE_H / 2;
  const dx = Math.abs(ex - sx);
  const cp = Math.max(dx * 0.45, 40);
  return `M ${sx} ${sy} C ${sx + cp} ${sy}, ${ex - cp} ${ey}, ${ex} ${ey}`;
}

// ─── FullGraph ────────────────────────────────────────────────────────────────

export function FullGraph({
  entries,
  selectedId,
  onSelect,
  onHover,
  onHoverEnd,
}: {
  entries: DocEntry[];
  selectedId: string;
  onSelect: (symbolId: string) => void;
  onHover: (symbolId: string) => void;
  onHoverEnd: () => void;
}) {
  const layout = useMemo(() => buildLayout(entries), [entries]);

  // Pan & zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      setPan({ x: dragRef.current.origX + ev.clientX - dragRef.current.startX, y: dragRef.current.origY + ev.clientY - dragRef.current.startY });
    }
    function onUp() {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pan]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY / 600;
    setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
  }, []);

  if (layout.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-rfm-text-400">No component graph data yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing select-none bg-[#fafafa]"
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* zoom reset */}
      <button
        type="button"
        onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
        className="absolute bottom-3 right-3 z-10 text-[10px] text-rfm-text-400 border border-rfm-border-light bg-white rounded-md px-2 py-1 hover:text-rfm-text-700 hover:border-rfm-text-300 transition-colors"
      >
        Reset view
      </button>

      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: layout.canvasW,
          height: layout.canvasH,
          position: 'relative',
        }}
      >
        {/* SVG edges */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
          width={layout.canvasW}
          height={layout.canvasH}
        >
          {layout.edges.map((edge, i) => {
            const from = layout.nodes.find(n => n.entry.symbolId === edge.fromId);
            const to   = layout.nodes.find(n => n.entry.symbolId === edge.toId);
            if (!from || !to) return null;
            const isHighlighted = edge.fromId === selectedId || edge.toId === selectedId;
            return (
              <path
                key={i}
                d={edgePath(from.x, from.y, to.x, to.y)}
                fill="none"
                stroke={
                  isHighlighted
                    ? edge.kind === 'render' ? '#3b82f6' : '#8b5cf6'
                    : edge.kind === 'render' ? '#d1d5db' : '#e9d5ff'
                }
                strokeWidth={isHighlighted ? 1.5 : 1}
                strokeDasharray={edge.kind === 'use' ? '4 3' : undefined}
                opacity={isHighlighted ? 1 : 0.7}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {layout.nodes.map(({ entry, x, y }) => {
          const isSelected = entry.symbolId === selectedId;
          const catColor =
            entry.category === 'page'      ? { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' }
            : entry.category === 'hook'    ? { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed' }
            : entry.category === 'function'? { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' }
            :                                { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' };

          return (
            <button
              key={entry.symbolId}
              type="button"
              onClick={() => onSelect(entry.symbolId)}
              onMouseEnter={() => onHover(entry.symbolId)}
              onMouseLeave={onHoverEnd}
              title={entry.name}
              style={{
                position: 'absolute',
                left: x, top: y,
                width: NODE_W, height: NODE_H,
                background: isSelected ? '#eff6ff' : catColor.bg,
                border: `${isSelected ? 2 : 1}px solid ${isSelected ? '#3b82f6' : catColor.border}`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center',
                padding: '0 10px',
                gap: 6,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'border-color 80ms, box-shadow 80ms',
              }}
            >
              {/* category dot */}
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isSelected ? '#3b82f6' : catColor.border,
              }} />
              <span style={{
                fontSize: 11.5, fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#1d4ed8' : catColor.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, textAlign: 'left',
              }}>
                {entry.name}
              </span>
              {entry.category !== 'component' && (
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                  color: isSelected ? '#3b82f6' : catColor.border,
                  textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {entry.category}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
