import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { DocEntry } from '../doc/build-doc-index';

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 204;
const NODE_H = 56;
const LEVEL_GAP = 76;  // vertical gap between depth levels
const NODE_GAP  = 20;  // horizontal gap between nodes in same level
const LEVEL_STEP = NODE_H + LEVEL_GAP;
const NODE_STEP  = NODE_W + NODE_GAP;
const PAD = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

export const ROUTE_PREFIX = 'route:';

function formatRoleBadge(role: LayoutNode['entry']['role']): string | null {
  if (!role || role === 'component') return null;
  return role === 'not-found'
    ? 'Not found'
    : role.replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getNodePalette(entry: LayoutNode['entry'], isSelected: boolean, isHovered: boolean) {
  if (entry.category === 'hook') {
    return {
      bg: isSelected ? '#ede9fe' : isHovered ? '#f5f3ff' : '#ffffff',
      border: isSelected ? '#8b5cf6' : isHovered ? '#a78bfa' : '#ddd6fe',
      text: '#6d28d9',
      dot: '#8b5cf6',
      badgeBg: '#ede9fe',
      badgeText: '#6d28d9',
    };
  }
  if (entry.category === 'function') {
    return {
      bg: isSelected ? '#dcfce7' : isHovered ? '#f0fdf4' : '#ffffff',
      border: isSelected ? '#22c55e' : isHovered ? '#4ade80' : '#bbf7d0',
      text: '#166534',
      dot: '#22c55e',
      badgeBg: '#dcfce7',
      badgeText: '#166534',
    };
  }
  if (entry.executionKind === 'static') {
    return {
      bg: isSelected ? '#fef3c7' : isHovered ? '#fffbeb' : '#ffffff',
      border: isSelected ? '#f59e0b' : isHovered ? '#fbbf24' : '#fde68a',
      text: '#92400e',
      dot: '#f59e0b',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
    };
  }
  return {
    bg: isSelected ? '#dbeafe' : isHovered ? '#eff6ff' : '#ffffff',
    border: isSelected ? '#3b82f6' : isHovered ? '#93c5fd' : '#e5e7eb',
    text: '#1e3a8a',
    dot: '#3b82f6',
    badgeBg: '#eff6ff',
    badgeText: '#1d4ed8',
  };
}

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

function buildOwnershipChildIds(
  entries: DocEntry[],
  fiberRelations: Record<string, string[]>,
): Set<string> {
  const ownershipChildIds = new Set<string>();

  for (const entry of entries) {
    for (const child of entry.renders) {
      ownershipChildIds.add(child.symbolId);
    }
  }

  for (const childIds of Object.values(fiberRelations)) {
    for (const childId of childIds) {
      ownershipChildIds.add(childId);
    }
  }

  return ownershipChildIds;
}

export function buildLayout(
  entries: DocEntry[],
  staticJsx: Record<string, string[]>,
  fiberRelations: Record<string, string[]>,
): Layout {
  const allEntries = [...entries];
  if (allEntries.length === 0) return { nodes: [], edges: [], canvasW: 300, canvasH: 200 };

  const byId  = new Map(allEntries.map(e => [e.symbolId, e]));
  const byName = new Map<string, DocEntry>();
  for (const entry of entries) {
    const existing = byName.get(entry.name);
    if (!existing || (existing.source !== 'runtime' && entry.source === 'runtime')) {
      byName.set(entry.name, entry);
    }
  }
  const ownershipChildIds = buildOwnershipChildIds(entries, fiberRelations);

  // ── Build combined adjacency: runtime renders/uses + fiberRelations ──
  // staticJsx is declaration metadata and should only act as a fallback when a child
  // has no ownership parent in the current screen.
  const childEdges  = new Map<string, string[]>(); // parentId → [childId]
  const parentEdges = new Map<string, string[]>(); // childId  → [parentId]
  const edgeDedup   = new Set<string>();

  function addEdge(fromId: string, toId: string) {
    const key = `${fromId}|${toId}`;
    if (edgeDedup.has(key) || !byId.has(fromId) || !byId.has(toId) || fromId === toId) return;
    edgeDedup.add(key);
    if (!childEdges.has(fromId))  childEdges.set(fromId, []);
    if (!parentEdges.has(toId))   parentEdges.set(toId, []);
    childEdges.get(fromId)!.push(toId);
    parentEdges.get(toId)!.push(fromId);
  }

  for (const entry of entries) {
    for (const c of [...entry.renders, ...entry.uses]) addEdge(entry.symbolId, c.symbolId);
  }
  for (const [fromId, names] of Object.entries(staticJsx)) {
    for (const name of names) {
      const child = byName.get(name);
      if (child && !ownershipChildIds.has(child.symbolId)) addEdge(fromId, child.symbolId);
    }
  }
  for (const [fromId, childIds] of Object.entries(fiberRelations)) {
    for (const childId of childIds) addEdge(fromId, childId);
  }

  // ── Topological longest-path depth assignment (Kahn's algorithm) ──────────
  const depthMap = new Map<string, number>();
  const inDeg    = new Map<string, number>();
  for (const e of allEntries) inDeg.set(e.symbolId, (parentEdges.get(e.symbolId) ?? []).length);

  // Roots = in-degree 0 in the combined graph
  const topoQueue: string[] = [];
  for (const e of allEntries) {
    if (inDeg.get(e.symbolId) === 0) { depthMap.set(e.symbolId, 0); topoQueue.push(e.symbolId); }
  }

  while (topoQueue.length > 0) {
    const id = topoQueue.shift()!;
    const d  = depthMap.get(id) ?? 0;
    for (const childId of childEdges.get(id) ?? []) {
      depthMap.set(childId, Math.max(depthMap.get(childId) ?? 0, d + 1));
      const deg = (inDeg.get(childId) ?? 1) - 1;
      inDeg.set(childId, deg);
      if (deg === 0) topoQueue.push(childId);
    }
  }

  // Assign nodes not reached (cycles / fully disconnected) to their own row
  let maxDepth = depthMap.size > 0 ? Math.max(...depthMap.values()) : 0;
  for (const entry of allEntries) {
    if (!depthMap.has(entry.symbolId)) depthMap.set(entry.symbolId, ++maxDepth);
  }

  // Group by depth, sort hooks/functions after components.
  const colGroups = new Map<number, DocEntry[]>();
  for (const entry of allEntries) {
    const d = depthMap.get(entry.symbolId)!;
    if (!colGroups.has(d)) colGroups.set(d, []);
    colGroups.get(d)!.push(entry);
  }
  const sortGroup = (a: DocEntry, b: DocEntry) => {
    const catOrder = (e: DocEntry) => e.category === 'hook' ? 2 : e.category === 'function' ? 3 : 1;
    if (catOrder(a) !== catOrder(b)) return catOrder(a) - catOrder(b);
    return a.name.localeCompare(b.name);
  };
  for (const group of colGroups.values()) group.sort(sortGroup);

  const numLevels = maxDepth + 1;
  const levelWidths = Array.from({ length: numLevels }, (_, i) => {
    const cnt = colGroups.get(i)?.length ?? 0;
    return Math.max(0, cnt * NODE_STEP - NODE_GAP);
  });
  const maxLevelW = Math.max(...levelWidths, NODE_W);

  // Position nodes: depth → y (top-to-bottom), index → x (centered)
  const posMap = new Map<string, { x: number; y: number }>();
  for (let d = 0; d < numLevels; d++) {
    const group = colGroups.get(d) ?? [];
    const levelW = levelWidths[d] ?? 0;
    const startX = PAD + (maxLevelW - levelW) / 2;
    group.forEach((entry, i) => {
      posMap.set(entry.symbolId, {
        x: startX + i * NODE_STEP,
        y: PAD + d * LEVEL_STEP,
      });
    });
  }

  // Build edges (deduplicated) — mirrors addEdge logic above so all relation sources are visible
  const edgeSet = new Set<string>();
  const edges: LayoutEdge[] = [];

  function addVisualEdge(fromId: string, toId: string, kind: LayoutEdge['kind']) {
    const key = `${fromId}>${toId}:${kind}`;
    if (!edgeSet.has(key) && posMap.has(fromId) && posMap.has(toId) && fromId !== toId) {
      edgeSet.add(key);
      edges.push({ fromId, toId, kind });
    }
  }

  for (const entry of entries) {
    for (const child of entry.renders) addVisualEdge(entry.symbolId, child.symbolId, 'render');
    for (const hook  of entry.uses)    addVisualEdge(entry.symbolId, hook.symbolId,  'use');
  }
  for (const [fromId, names] of Object.entries(staticJsx)) {
    for (const name of names) {
      const child = byName.get(name);
      if (child && !ownershipChildIds.has(child.symbolId)) {
        addVisualEdge(fromId, child.symbolId, 'render');
      }
    }
  }
  for (const [fromId, childIds] of Object.entries(fiberRelations)) {
    for (const childId of childIds) addVisualEdge(fromId, childId, 'render');
  }

  const nodes: LayoutNode[] = allEntries
    .map(entry => {
      const pos = posMap.get(entry.symbolId);
      return pos ? { entry, ...pos } : null;
    })
    .filter(Boolean) as LayoutNode[];

  const canvasW = PAD + maxLevelW + PAD;
  const canvasH = PAD + numLevels * LEVEL_STEP - LEVEL_GAP + PAD;

  return { nodes, edges, canvasW, canvasH };
}

// ─── Edge path ────────────────────────────────────────────────────────────────

function edgePath(
  fx: number, fy: number,
  tx: number, ty: number,
): string {
  // Source: bottom-center of node, Target: top-center of node
  const sx = fx + NODE_W / 2;
  const sy = fy + NODE_H;
  const ex = tx + NODE_W / 2;
  const ey = ty;
  const dy = Math.abs(ey - sy);
  const cp = Math.max(dy * 0.45, 30);
  return `M ${sx} ${sy} C ${sx} ${sy + cp}, ${ex} ${ey - cp}, ${ex} ${ey}`;
}

function getCenteredPan(
  container: HTMLElement,
  layout: Pick<Layout, 'canvasW' | 'canvasH'>,
): { x: number; y: number } {
  const { width, height } = container.getBoundingClientRect();
  return {
    x: Math.max(0, (width - layout.canvasW) / 2),
    y: Math.max(0, (height - layout.canvasH) / 2),
  };
}

// ─── FullGraph ────────────────────────────────────────────────────────────────

export function FullGraph({
  entries,
  selectedId,
  hoveredId,
  staticJsx,
  fiberRelations,
  onSelect,
  onHover,
  onHoverEnd,
}: {
  entries: DocEntry[];
  selectedId: string;
  hoveredId: string;
  staticJsx: Record<string, string[]>;
  fiberRelations: Record<string, string[]>;
  onSelect: (symbolId: string) => void;
  onHover: (symbolId: string) => void;
  onHoverEnd: () => void;
}) {
  const layout = useMemo(
    () => buildLayout(entries, staticJsx, fiberRelations),
    [entries, staticJsx, fiberRelations],
  );

  // Pan & zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedViewRef = useRef(false);

  // 초기 pan: 최초 graph data가 들어왔을 때만 중앙 정렬한다.
  // 이후 graph-update/selection/hover는 사용자가 이동한 viewport를 보존한다.
  useEffect(() => {
    if (initializedViewRef.current || layout.nodes.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const frameId = window.requestAnimationFrame(() => {
      setPan(getCenteredPan(el, layout));
      initializedViewRef.current = true;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [layout]);

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
      data-rfm-graph-viewport
      className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing select-none bg-[#fafafa]"
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* zoom reset */}
      <button
        type="button"
        onClick={() => {
          const el = containerRef.current;
          if (el) {
            setPan(getCenteredPan(el, layout));
          }
          setZoom(1);
        }}
        className="absolute bottom-3 right-3 z-10 text-[10px] text-rfm-text-400 border border-rfm-border-light bg-white rounded-md px-2 py-1 hover:text-rfm-text-700 hover:border-rfm-text-300 transition-colors"
      >
        Reset view
      </button>

      <div
        data-rfm-graph-canvas
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
            const isHighlighted =
              edge.fromId === selectedId ||
              edge.toId === selectedId ||
              edge.fromId === hoveredId ||
              edge.toId === hoveredId;
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
          const isHovered = entry.symbolId === hoveredId;
          const palette = getNodePalette(entry, isSelected, isHovered);
          const ownershipBadge =
            entry.ownershipKind ??
            (entry.executionKind === 'static' ? 'STATIC-DECLARED' : 'LIVE');
          const roleBadge = formatRoleBadge(entry.role);

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
                background: palette.bg,
                border: `${isSelected ? 2 : 1}px solid ${palette.border}`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'center',
                padding: '8px 10px',
                gap: 5,
                cursor: 'pointer',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(59,130,246,0.16), 0 6px 16px rgba(15,23,42,0.08)'
                  : isHovered
                    ? '0 4px 12px rgba(15,23,42,0.08)'
                    : '0 1px 3px rgba(15,23,42,0.05)',
                transform: isHovered && !isSelected ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'border-color 100ms, box-shadow 100ms, background 100ms, transform 100ms',
              }}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                minWidth: 0,
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isSelected ? '#3b82f6' : palette.dot,
                }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 650 : 560,
                  color: isSelected ? '#1d4ed8' : palette.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  textAlign: 'left',
                  minWidth: 0,
                }}>
                  {entry.name}
                </span>
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingLeft: 13,
                minWidth: 0,
              }}>
                {roleBadge && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 650,
                    color: palette.badgeText,
                    background: palette.badgeBg,
                    padding: '2px 5px',
                    borderRadius: 5,
                    flexShrink: 0,
                    maxWidth: 78,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {roleBadge}
                  </span>
                )}
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: palette.badgeText,
                  background: palette.badgeBg,
                  padding: '2px 5px',
                  borderRadius: 5,
                  flexShrink: 0,
                  maxWidth: 112,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {ownershipBadge}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
