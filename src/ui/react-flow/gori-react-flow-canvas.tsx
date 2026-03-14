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

import type { ReactFlowEdgeData, ReactFlowGraph, ReactFlowNodeData } from './project-to-react-flow.js';

type GoriReactFlowCanvasProps = {
  graph: ReactFlowGraph;
  height?: number;
  onNodeClick?: (node: ReactFlowGraph['nodes'][number]) => void;
  onEdgeClick?: (edge: ReactFlowGraph['edges'][number]) => void;
};

function GoriFlowNode({ data }: NodeProps<Node<ReactFlowNodeData>>) {
  const isApi = data.kind === 'api';

  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 260,
        padding: '0.85rem 0.95rem',
        borderRadius: '0.9rem',
        border: isApi ? '1px solid #7dd3fc' : '1px solid #cbd5e1',
        background: isApi ? '#eff6ff' : '#ffffff',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#0f172a' }} />
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
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#0f172a' }} />
    </div>
  );
}

const nodeTypes = {
  file: GoriFlowNode,
  api: GoriFlowNode,
};

function toFlowNodes(graph: ReactFlowGraph): Node<ReactFlowNodeData>[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    draggable: false,
  }));
}

function toFlowEdges(graph: ReactFlowGraph): Edge<ReactFlowEdgeData>[] {
  return graph.edges.map((edge) => {
    const isRequestEdge = edge.data.relationTypes.includes('request');

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: edge.label,
      data: edge.data,
      animated: isRequestEdge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: isRequestEdge ? '#0369a1' : '#64748b',
      },
      style: {
        stroke: isRequestEdge ? '#0369a1' : '#64748b',
        strokeWidth: isRequestEdge ? 2.5 : 2,
      },
      labelStyle: {
        fill: '#334155',
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
  onNodeClick,
  onEdgeClick,
}: GoriReactFlowCanvasProps) {
  const nodes = toFlowNodes(graph);
  const edges = toFlowEdges(graph);
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
