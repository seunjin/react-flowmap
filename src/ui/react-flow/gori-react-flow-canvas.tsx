import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type EdgeMouseHandler,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getSymbolAccent } from '../colors/get-symbol-accent.js';
import type { ReactFlowEdgeData, ReactFlowGraph, ReactFlowNodeData } from './project-to-react-flow.js';

type GoriReactFlowCanvasProps = {
  graph: ReactFlowGraph;
  height?: number;
  selectedFileId?: string;
  selectedSymbolIds?: string[];
  selectedEdgeId?: string;
  onToggleSymbol?: (symbolId: string) => void;
  onNodeClick?: (node: ReactFlowGraph['nodes'][number]) => void;
  onEdgeClick?: (edge: ReactFlowGraph['edges'][number]) => void;
};

function GoriFlowNode({ data }: NodeProps<Node<ReactFlowNodeData>>) {
  const isApi = data.kind === 'api';
  const selectedSymbolIds = data.selectedSymbolIds ?? [];
  const selectedExport = data.exports?.find((item) => selectedSymbolIds.includes(item.symbolId));
  const selectedAccent = selectedExport ? getSymbolAccent(selectedExport.symbolId) : undefined;
  const isSelected = Boolean(data.isSelected);

  return (
    <div
      style={{
        minWidth: 260,
        maxWidth: 320,
        padding: '0.85rem 0.95rem',
        borderRadius: '0.9rem',
        border: isSelected
          ? `2px solid ${selectedAccent?.border ?? '#0f172a'}`
          : isApi
            ? '1px solid #7dd3fc'
            : '1px solid #cbd5e1',
        background: isSelected ? selectedAccent?.soft ?? '#f8fafc' : isApi ? '#eff6ff' : '#ffffff',
        boxShadow: isSelected
          ? '0 18px 40px rgba(15, 23, 42, 0.18)'
          : '0 10px 30px rgba(15, 23, 42, 0.08)',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: selectedAccent?.border ?? '#0f172a' }}
      />
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <strong style={{ color: '#0f172a' }}>{data.label}</strong>
        <small style={{ color: '#64748b', lineHeight: 1.4 }}>{data.subtitle}</small>
        {typeof data.exportCount === 'number' ? (
          <span
            style={{
              justifySelf: 'start',
              padding: '0.22rem 0.5rem',
              borderRadius: '999px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            exports {data.exportCount}
          </span>
        ) : null}
        {data.kind === 'file' && data.exports?.length ? (
          <div
            style={{
              display: 'grid',
              gap: '0.4rem',
              marginTop: '0.35rem',
              paddingTop: '0.55rem',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <small style={{ color: '#475569', fontWeight: 700 }}>Exports</small>
            {data.exports.map((item) => {
              const checked = selectedSymbolIds.includes(item.symbolId);
              const accent = getSymbolAccent(item.symbolId);

              return (
                <label
                  key={item.symbolId}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.42rem 0.5rem',
                    borderRadius: '0.65rem',
                    border: checked ? `1px solid ${accent.border}` : '1px solid #e2e8f0',
                    background: checked ? accent.soft : '#ffffff',
                    cursor: data.onToggleSymbol ? 'pointer' : 'default',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => data.onToggleSymbol?.(item.symbolId)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      width: '0.55rem',
                      height: '0.55rem',
                      borderRadius: '999px',
                      background: accent.border,
                    }}
                  />
                  <span style={{ display: 'grid', gap: '0.12rem' }}>
                    <span style={{ color: '#0f172a', fontSize: '0.84rem', fontWeight: 600 }}>
                      {item.name}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                      {item.symbolType}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: selectedAccent?.border ?? '#0f172a' }}
      />
    </div>
  );
}

const nodeTypes = {
  file: GoriFlowNode,
  api: GoriFlowNode,
};

function toFlowNodes(
  graph: ReactFlowGraph,
  selectedFileId: string | undefined,
  selectedSymbolIds: string[],
  onToggleSymbol?: (symbolId: string) => void
): Node<ReactFlowNodeData>[] {
  return graph.nodes.map((node) => ({
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
              (node.data.symbolIds ?? []).some((symbolId) => selectedSymbolIds.includes(symbolId)),
            ...(onToggleSymbol ? { onToggleSymbol } : {}),
          }
        : {
            isSelected: false,
          }),
    },
    draggable: false,
    zIndex:
      node.data.kind === 'file' &&
      (node.data.fileId === selectedFileId ||
        (node.data.symbolIds ?? []).some((symbolId) => selectedSymbolIds.includes(symbolId)))
        ? 2
        : 1,
  }));
}

function toFlowEdges(graph: ReactFlowGraph, selectedEdgeId?: string): Edge<ReactFlowEdgeData>[] {
  return graph.edges.map((edge) => {
    const isRequestEdge = edge.data.relationTypes.includes('request');
    const isSelected = edge.id === selectedEdgeId;
    const stroke = isSelected ? '#0f172a' : isRequestEdge ? '#0369a1' : '#64748b';

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: edge.label,
      data: edge.data,
      animated: isSelected || isRequestEdge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: stroke,
      },
      style: {
        stroke,
        strokeWidth: isSelected ? 3.5 : isRequestEdge ? 2.5 : 2,
        opacity: selectedEdgeId && !isSelected ? 0.42 : 1,
      },
      labelStyle: {
        fill: isSelected ? '#0f172a' : '#334155',
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.9,
      },
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 6,
    };
  });
}

export function GoriReactFlowCanvas({
  graph,
  height = 520,
  selectedFileId,
  selectedSymbolIds = [],
  selectedEdgeId,
  onToggleSymbol,
  onNodeClick,
  onEdgeClick,
}: GoriReactFlowCanvasProps) {
  const nodes = toFlowNodes(graph, selectedFileId, selectedSymbolIds, onToggleSymbol);
  const edges = toFlowEdges(graph, selectedEdgeId);
  const graphNodeById = new Map(graph.nodes.map((node) => [node.id, node] as const));
  const graphEdgeById = new Map(graph.edges.map((edge) => [edge.id, edge] as const));

  const handleNodeClick: NodeMouseHandler<Node<ReactFlowNodeData>> = (_event, node) => {
    const nextNode = graphNodeById.get(node.id);

    if (nextNode && onNodeClick) {
      onNodeClick(nextNode);
    }
  };

  const handleEdgeClick: EdgeMouseHandler<Edge<ReactFlowEdgeData>> = (_event, edge) => {
    const nextEdge = graphEdgeById.get(edge.id);

    if (nextEdge && onEdgeClick) {
      onEdgeClick(nextEdge);
    }
  };

  return (
    <section
      style={{
        padding: '1rem',
        borderRadius: '1rem',
        border: '1px solid #d7dce2',
        background: '#ffffff',
      }}
    >
      <header style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>React Flow Preview</h2>
        <p style={{ margin: '0.45rem 0 0', color: '#475569' }}>
          Adapter-backed diagram view for the current file graph projection.
        </p>
      </header>

      <div
        style={{
          height,
          borderRadius: '0.9rem',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          background:
            'radial-gradient(circle at top left, rgba(191,219,254,0.25), transparent 30%), #f8fafc',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          nodesDraggable={false}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
        >
          <Background gap={20} size={1} color="#cbd5e1" />
          <MiniMap
            pannable
            zoomable
            nodeStrokeColor={(node) => (node.type === 'api' ? '#0369a1' : '#334155')}
            nodeColor={(node) => (node.type === 'api' ? '#bfdbfe' : '#e2e8f0')}
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
