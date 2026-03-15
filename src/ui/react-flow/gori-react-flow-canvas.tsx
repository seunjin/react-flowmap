import { useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type EdgeMouseHandler,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getSymbolAccent } from '../colors/get-symbol-accent.js';
import { filterNodeExports } from './filter-node-exports.js';
import { FSD_LAYER_ACCENT } from './project-to-react-flow.js';
import type { ReactFlowEdgeData, ReactFlowGraph, ReactFlowNodeData } from './project-to-react-flow.js';

const API_COLLECTION_ID = 'api-collection';

const HTTP_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: '#dcfce7', color: '#15803d' },
  POST:   { bg: '#dbeafe', color: '#1d4ed8' },
  PUT:    { bg: '#fef9c3', color: '#b45309' },
  PATCH:  { bg: '#f3e8ff', color: '#7e22ce' },
  DELETE: { bg: '#fee2e2', color: '#b91c1c' },
};

type GoriReactFlowCanvasProps = {
  graph: ReactFlowGraph;
  height?: number;
  showChrome?: boolean;
  selectedFileId?: string;
  selectedSymbolIds?: string[];
  selectedEdgeId?: string;
  onToggleSymbol?: (symbolId: string) => void;
  onNodeClick?: (node: ReactFlowGraph['nodes'][number]) => void;
  onEdgeClick?: (edge: ReactFlowGraph['edges'][number]) => void;
};

function GoriFlowNode({ data }: NodeProps<Node<ReactFlowNodeData>>) {
  const isApi = data.kind === 'api';
  const isFolder = data.kind === 'folder';
  const selectedSymbolIds = data.selectedSymbolIds ?? [];
  const [query, setQuery] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const selectedExport = data.exports?.find((item) => selectedSymbolIds.includes(item.symbolId));
  const selectedAccent = selectedExport ? getSymbolAccent(selectedExport.symbolId) : undefined;
  const isSelected = Boolean(data.isSelected);
  const visibleExports = useMemo(
    () =>
      filterNodeExports({
        exports: data.exports ?? [],
        query,
        selectedOnly,
        selectedSymbolIds,
      }),
    [data.exports, query, selectedOnly, selectedSymbolIds]
  );

  if (isFolder) {
    const isAncestor = data.isAncestor === true;
    return (
      <div
        style={{
          width: data.width ?? 320,
          height: data.height ?? 220,
          borderRadius: isAncestor ? '18px' : '12px',
          border: isAncestor
            ? '1.5px dashed rgba(148,163,184,0.3)'
            : '1px solid rgba(148,163,184,0.22)',
          background: isAncestor
            ? 'rgba(241,245,249,0.18)'
            : 'rgba(241,245,249,0.5)',
          boxShadow: isAncestor ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.8)',
          padding: '10px 12px',
          display: 'grid',
          alignContent: 'start',
          gap: '3px',
          pointerEvents: 'none',
        }}
      >
        <strong
          style={{
            color: isAncestor ? '#94a3b8' : '#475569',
            fontSize: isAncestor ? '11px' : '12px',
            fontWeight: isAncestor ? 500 : 600,
            letterSpacing: isAncestor ? '0.04em' : undefined,
            textTransform: isAncestor ? 'uppercase' : undefined,
          }}
        >
          {data.label}
        </strong>
        {!isAncestor && (
          <small style={{ color: '#94a3b8', fontSize: '11px' }}>{data.subtitle}</small>
        )}
      </div>
    );
  }

  // ── API 컬렉션 카드 ─────────────────────────────────────────────────────────
  if (isApi && data.apiEndpoints && data.apiEndpoints.length > 0) {
    return (
      <div style={{ minWidth: 240, borderRadius: '10px', border: '1px solid #93c5fd', background: '#eff6ff', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <Handle type="target" position={Position.Left} style={{ background: '#93c5fd', border: 'none', width: 8, height: 8 }} />
        <div style={{ padding: '7px 11px 6px', borderBottom: '1px solid #bfdbfe', background: '#dbeafe', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API</span>
          <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>Endpoints</span>
          <span style={{ marginLeft: 'auto', padding: '1px 5px', borderRadius: '4px', background: '#bfdbfe', color: '#1d4ed8', fontSize: '10px', fontWeight: 700 }}>
            {data.apiEndpoints.length}
          </span>
        </div>
        <div style={{ padding: '3px 0' }}>
          {data.apiEndpoints.map((ep) => {
            const c = HTTP_COLORS[ep.method] ?? { bg: '#f1f5f9', color: '#64748b' };
            return (
              <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 11px' }}>
                <span style={{ padding: '1px 5px', borderRadius: '3px', background: c.bg, color: c.color, fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', flexShrink: 0, minWidth: '34px', textAlign: 'center' }}>
                  {ep.method}
                </span>
                <span style={{ fontSize: '11px', color: '#1e40af', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ep.path}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const borderColor = isSelected
    ? (selectedAccent?.border ?? '#0f172a')
    : '#e2e8f0';

  const bg = isSelected ? (selectedAccent?.soft ?? '#f8fafc') : '#ffffff';

  return (
    <div
      style={{
        minWidth: 240,
        maxWidth: 300,
        padding: '10px 11px',
        borderRadius: '10px',
        border: isSelected ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
        background: bg,
        boxShadow: isSelected
          ? '0 12px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08)'
          : '0 2px 8px rgba(15,23,42,0.06)',
        transform: isSelected ? 'translateY(-1px)' : 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: selectedAccent?.border ?? '#94a3b8', border: 'none', width: 8, height: 8 }}
      />

      <div style={{ display: 'grid', gap: '4px' }}>
        {/* 노드 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isApi && (
            <span
              style={{
                padding: '1px 5px',
                borderRadius: '3px',
                background: '#dbeafe',
                color: '#1d4ed8',
                fontSize: '9px',
                fontWeight: 700,
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              API
            </span>
          )}
          <strong
            style={{
              color: '#0f172a',
              fontSize: '12px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.label}
          </strong>
        </div>

        <small style={{ color: '#94a3b8', lineHeight: 1.4, fontSize: '10px', wordBreak: 'break-all' }}>
          {data.subtitle}
        </small>

        {typeof data.exportCount === 'number' && (
          <div style={{ justifySelf: 'start', display: 'flex', gap: '4px' }}>
            {(data.depCount ?? 0) > 0 && (
              <span style={{
                padding: '1px 6px', borderRadius: '4px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                color: '#15803d', fontSize: '10px', fontWeight: 600,
              }}>
                dep {data.depCount}
              </span>
            )}
            {data.exportCount > 0 && (
              <span style={{
                padding: '1px 6px', borderRadius: '4px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                color: '#64748b', fontSize: '10px', fontWeight: 600,
              }}>
                exp {data.exportCount}
              </span>
            )}
          </div>
        )}

        {/* 익스포트 목록 */}
        {data.kind === 'file' && data.exports?.length ? (
          <div
            style={{
              display: 'grid',
              gap: '6px',
              marginTop: '4px',
              paddingTop: '8px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
              <small style={{ color: '#64748b', fontWeight: 700, fontSize: '10px' }}>익스포트</small>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedOnly((p) => !p); }}
                style={{
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${selectedOnly ? '#0f172a' : '#e2e8f0'}`,
                  background: selectedOnly ? '#0f172a' : '#ffffff',
                  color: selectedOnly ? '#f8fafc' : '#64748b',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                선택만
              </button>
            </div>

            <input
              type="search"
              value={query}
              placeholder="익스포트 검색"
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '5px 7px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '11px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'grid', gap: '3px', maxHeight: 200, overflowY: 'auto' }}>
              {visibleExports.length === 0 ? (
                <small
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px dashed #e2e8f0',
                    color: '#94a3b8',
                    fontSize: '11px',
                  }}
                >
                  일치하는 익스포트가 없습니다.
                </small>
              ) : null}

              {visibleExports.map((item) => {
                const checked = selectedSymbolIds.includes(item.symbolId);
                const accent = getSymbolAccent(item.symbolId);

                return (
                  <label
                    key={item.symbolId}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 7px',
                      borderRadius: '6px',
                      border: checked ? `1px solid ${accent.border}` : '1px solid #f1f5f9',
                      background: checked ? accent.soft : '#ffffff',
                      cursor: data.onToggleSymbol ? 'pointer' : 'default',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => data.onToggleSymbol?.(item.symbolId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'none' }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '999px',
                        background: accent.border,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ display: 'grid', gap: '1px', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          color: checked ? accent.solid : '#0f172a',
                          fontSize: '11px',
                          fontWeight: checked ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>{item.symbolType}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: selectedAccent?.border ?? '#94a3b8', border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}

function GoriFlowEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label, selected, style, markerEnd,
}: EdgeProps<Edge<ReactFlowEdgeData>>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} {...(markerEnd ? { markerEnd } : {})} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 200,
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid #e2e8f0',
              fontSize: 11,
              fontWeight: 600,
              color: selected ? '#0f172a' : '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function GoriFolderCardNode({ data }: NodeProps<Node<ReactFlowNodeData>>) {
  const files = data.folderFiles ?? [];
  const isSelected = data.isSelected === true;
  const accent = data.fsdLayer !== undefined ? FSD_LAYER_ACCENT[data.fsdLayer] : undefined;

  return (
    <div
      style={{
        minWidth: 220,
        borderRadius: '10px',
        border: isSelected
          ? `2px solid ${accent?.border ?? '#3b82f6'}`
          : `1px solid ${accent?.border ?? 'rgba(148,163,184,0.4)'}`,
        background: isSelected ? (accent?.bg ?? '#eff6ff') : '#ffffff',
        boxShadow: isSelected
          ? '0 8px 24px rgba(15,23,42,0.10)'
          : '0 2px 8px rgba(15,23,42,0.06)',
        overflow: 'hidden',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: accent?.color ?? '#94a3b8', border: 'none', width: 8, height: 8 }} />

      {/* 폴더 헤더 */}
      <div style={{
        padding: '8px 11px 7px',
        background: accent?.bg ?? 'rgba(241,245,249,0.8)',
        borderBottom: `1px solid ${accent?.border ?? 'rgba(148,163,184,0.15)'}`,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span style={{ fontSize: '12px', lineHeight: 1, flexShrink: 0 }}>📁</span>
        <strong style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {data.label}
        </strong>
        <span style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.7)', border: `1px solid ${accent?.border ?? '#e2e8f0'}`, color: accent?.color ?? '#64748b', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>
          {files.length}
        </span>
      </div>

      {/* 파일 목록 */}
      <div style={{ padding: '3px 0 4px' }}>
        {files.map((file) => (
          <div key={file.fileId} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 11px' }}>
            <span style={{ fontSize: '10px', color: '#cbd5e1', flexShrink: 0 }}>📄</span>
            <span style={{ fontSize: '11px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {file.name}
            </span>
            <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
              {file.depCount > 0 && (
                <span style={{ padding: '0 4px', borderRadius: '3px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '9px', fontWeight: 600 }}>
                  dep {file.depCount}
                </span>
              )}
              {file.exportCount > 0 && (
                <span style={{ padding: '0 4px', borderRadius: '3px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '9px', fontWeight: 600 }}>
                  exp {file.exportCount}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: accent?.color ?? '#94a3b8', border: 'none', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { folder: GoriFlowNode, file: GoriFlowNode, api: GoriFlowNode, 'folder-card': GoriFolderCardNode };
const edgeTypes = { fileRelation: GoriFlowEdge };

function toFlowNodes(
  graph: ReactFlowGraph,
  selectedFileId: string | undefined,
  selectedSymbolIds: string[],
  onToggleSymbol?: (symbolId: string) => void
): Node<ReactFlowNodeData>[] {
  const apiGraphNodes = graph.nodes.filter((n) => n.data.kind === 'api');
  const nonApiNodes = graph.nodes.filter((n) => n.data.kind !== 'api');

  const regularNodes: Node<ReactFlowNodeData>[] = nonApiNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      ...(node.data.kind === 'file'
        ? {
            selectedSymbolIds,
            isSelected:
              node.data.fileId === selectedFileId ||
              (node.data.symbolIds ?? []).some((id) => selectedSymbolIds.includes(id)),
            ...(onToggleSymbol ? { onToggleSymbol } : {}),
          }
        : node.data.kind === 'folder-card'
        ? {
            isSelected: (node.data.symbolIds ?? []).some((id) => selectedSymbolIds.includes(id)),
          }
        : { isSelected: false }),
    },
    draggable: false,
    selectable: node.data.kind !== 'folder',
    connectable: node.data.kind !== 'folder',
    focusable: node.data.kind !== 'folder',
    zIndex: node.data.kind === 'folder'
      ? (node.data.isAncestor ? -2 : -1)
      : node.data.kind === 'file' &&
          (node.data.fileId === selectedFileId ||
            (node.data.symbolIds ?? []).some((id) => selectedSymbolIds.includes(id)))
        ? 2
        : 1,
  }));

  if (apiGraphNodes.length === 0) return regularNodes;

  const minX = Math.min(...apiGraphNodes.map((n) => n.position.x));
  const minY = Math.min(...apiGraphNodes.map((n) => n.position.y));

  const collectionNode: Node<ReactFlowNodeData> = {
    id: API_COLLECTION_ID,
    type: 'api',
    position: { x: minX, y: minY },
    data: {
      kind: 'api',
      label: 'API Endpoints',
      subtitle: `${apiGraphNodes.length}개 엔드포인트`,
      isSelected: false,
      apiEndpoints: apiGraphNodes.map((n) => ({
        method: n.data.method ?? '',
        path: n.data.subtitle,
      })),
    },
    draggable: false,
    selectable: true,
    connectable: false,
    focusable: true,
    zIndex: 1,
  };

  return [...regularNodes, collectionNode];
}

function toFlowEdges(graph: ReactFlowGraph, selectedEdgeId?: string): Edge<ReactFlowEdgeData>[] {
  const apiNodeIds = new Set(graph.nodes.filter((n) => n.data.kind === 'api').map((n) => n.id));

  // Remap edges targeting individual API nodes → API_COLLECTION_ID, then deduplicate.
  const edgeByKey = new Map<string, Edge<ReactFlowEdgeData>>();

  for (const edge of graph.edges) {
    const targetId = apiNodeIds.has(edge.target) ? API_COLLECTION_ID : edge.target;
    const key = `${edge.source}->${targetId}`;

    const existing = edgeByKey.get(key);
    const mergedRelationTypes = existing
      ? [...new Set([...existing.data!.relationTypes, ...edge.data.relationTypes])]
      : edge.data.relationTypes;
    const mergedSupportingEdges = existing
      ? [...new Set([...existing.data!.supportingEdges, ...edge.data.supportingEdges])]
      : edge.data.supportingEdges;
    const mergedIsViolation = (existing?.data?.isViolation ?? false) || (edge.data.isViolation ?? false);

    const isRequest = mergedRelationTypes.includes('request');
    const isSelected = (!existing && edge.id === selectedEdgeId) ||
      (existing?.id === selectedEdgeId);
    const stroke = isSelected
      ? '#0f172a'
      : mergedIsViolation
      ? '#ef4444'
      : isRequest
      ? '#3b82f6'
      : '#94a3b8';

    edgeByKey.set(key, {
      id: existing?.id ?? `${edge.source}->${targetId}`,
      source: edge.source,
      target: targetId,
      type: 'fileRelation' as const,
      label: mergedRelationTypes.join(', '),
      data: { relationTypes: mergedRelationTypes, supportingEdges: mergedSupportingEdges, isViolation: mergedIsViolation },
      animated: (isSelected || isRequest) && !mergedIsViolation,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke },
      style: {
        stroke,
        strokeWidth: isSelected ? 3 : mergedIsViolation ? 2.5 : isRequest ? 2 : 1.5,
        opacity: selectedEdgeId && !isSelected ? 0.35 : 1,
      },
    });
  }

  return [...edgeByKey.values()];
}

export function GoriReactFlowCanvas({
  graph,
  height = 520,
  showChrome = true,
  selectedFileId,
  selectedSymbolIds = [],
  selectedEdgeId,
  onToggleSymbol,
  onNodeClick,
  onEdgeClick,
}: GoriReactFlowCanvasProps) {
  const nodes = toFlowNodes(graph, selectedFileId, selectedSymbolIds, onToggleSymbol);
  const edges = toFlowEdges(graph, selectedEdgeId);
  const graphNodeById = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const graphEdgeById = new Map(graph.edges.map((e) => [e.id, e] as const));

  const handleNodeClick: NodeMouseHandler<Node<ReactFlowNodeData>> = (_e, node) => {
    const next = graphNodeById.get(node.id);
    if (next && onNodeClick) onNodeClick(next);
  };

  const handleEdgeClick: EdgeMouseHandler<Edge<ReactFlowEdgeData>> = (_e, edge) => {
    const next = graphEdgeById.get(edge.id);
    if (next && onEdgeClick) onEdgeClick(next);
  };

  const canvas = (
    <div
      style={{
        height,
        borderRadius: showChrome ? '10px' : 0,
        overflow: 'hidden',
        border: showChrome ? '1px solid #e2e8f0' : 'none',
        background: '#f8fafc',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        style={{ background: '#f8fafc' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="rgba(148,163,184,0.3)"
        />
        <Controls
          showInteractive={false}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
          }}
        />
      </ReactFlow>
    </div>
  );

  if (!showChrome) return canvas;

  return (
    <section
      style={{
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
      }}
    >
      <header style={{ marginBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>React Flow 미리보기</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>
          현재 파일 그래프 프로젝션의 다이어그램 뷰입니다.
        </p>
      </header>
      {canvas}
    </section>
  );
}
