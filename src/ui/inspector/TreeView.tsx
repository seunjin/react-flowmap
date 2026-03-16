import { useState } from 'react';
import type React from 'react';
import { Folder, FileCode, Component } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { AnyTreeNode, FolderTreeNode } from './tree-utils';
import { folderHasHovered } from './tree-utils';

// ─── Icons ────────────────────────────────────────────────────────────────────

export function FolderIcon({ hovered }: { hovered: boolean }) {
  return <Folder size={12} style={{ flexShrink: 0, color: hovered ? '#374151' : '#9ca3af' }} />;
}

export function FileIcon({ hovered, selected }: { hovered: boolean; selected: boolean }) {
  return <FileCode size={12} style={{ flexShrink: 0, color: selected ? '#1e40af' : hovered ? '#374151' : '#9ca3af' }} />;
}

export function ComponentIcon({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  return <Component size={10} style={{ flexShrink: 0, color: isSelected ? '#1e40af' : isHovered ? '#374151' : '#d1d5db' }} />;
}

// ─── TreeNodeView ─────────────────────────────────────────────────────────────

export function TreeNodeView({
  node, depth, hoveredIds, treeHoveredId, selectedId, focusedSymbolId, onSelect, selectedRef,
  onHover, onHoverEnd, forceExpanded,
}: {
  node: AnyTreeNode;
  depth: number;
  hoveredIds: Set<string>;
  treeHoveredId: string;
  selectedId: string;
  focusedSymbolId: string;
  onSelect: (symbolId: string) => void;
  selectedRef: React.RefObject<HTMLButtonElement | null>;
  onHover: (symbolId: string) => void;
  onHoverEnd: () => void;
  forceExpanded: boolean;
}) {
  if (node.kind === 'folder') {
    const hasHovered = node.name !== '' && folderHasHovered(node as FolderTreeNode, hoveredIds);
    const [collapsed, setCollapsed] = useState(false);
    const isCollapsed = forceExpanded ? false : collapsed;
    return (
      <div>
        {node.name !== '' && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setCollapsed(c => !c)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed(c => !c); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: `4px 10px 4px ${10 + depth * 14}px`,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: 7, color: '#9ca3af', display: 'inline-block',
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 120ms', flexShrink: 0,
            }}>▶</span>
            <FolderIcon hovered={hasHovered} />
            <span style={{
              fontSize: 11, fontWeight: hasHovered ? 600 : 500,
              color: hasHovered ? '#374151' : '#6b7280',
            }}>
              {node.name}
            </span>
          </div>
        )}
        {!isCollapsed && node.children.map((child) => (
          <TreeNodeView
            key={child.fullPath || '__root__'}
            node={child}
            depth={node.name !== '' ? depth + 1 : depth}
            hoveredIds={hoveredIds}
            treeHoveredId={treeHoveredId}
            selectedId={selectedId}
            focusedSymbolId={focusedSymbolId}
            onSelect={onSelect}
            selectedRef={selectedRef}
            onHover={onHover}
            onHoverEnd={onHoverEnd}
            forceExpanded={forceExpanded}
          />
        ))}
      </div>
    );
  }

  // 파일 노드
  const fileHovered = node.entries.some((e: DocEntry) => hoveredIds.has(e.symbolId));
  const fileSelected = node.entries.some((e: DocEntry) => e.symbolId === selectedId);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: `4px 10px 3px ${10 + depth * 14}px`,
        background: fileSelected ? '#f3f4f6' : fileHovered ? '#f3f4f6' : 'transparent',
      }}>
        <FileIcon hovered={fileHovered} selected={fileSelected} />
        <span style={{
          fontSize: 11,
          fontWeight: fileSelected ? 600 : fileHovered ? 500 : 400,
          color: fileSelected ? '#111827' : fileHovered ? '#374151' : '#9ca3af',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {node.name}
        </span>
      </div>

      {node.entries.map((entry: DocEntry) => {
        const isHovered  = hoveredIds.has(entry.symbolId) || treeHoveredId === entry.symbolId;
        const isSelected = entry.symbolId === selectedId;
        const isFocused  = entry.symbolId === focusedSymbolId && !isSelected;

        return (
          <button
            key={entry.symbolId}
            data-tree-entry
            type="button"
            ref={isSelected ? (el) => { selectedRef.current = el; } : undefined}
            onClick={() => onSelect(entry.symbolId)}
            onMouseEnter={() => onHover(entry.symbolId)}
            onMouseLeave={onHoverEnd}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: `4px 10px 4px ${10 + (depth + 1) * 14}px`,
              border: 'none',
              borderLeft: isSelected
                ? '2px solid #1e40af'
                : isFocused
                  ? '2px solid #bfdbfe'
                  : isHovered
                    ? '2px solid #9ca3af'
                    : '2px solid transparent',
              textAlign: 'left', cursor: 'pointer',
              background: isSelected ? '#dbeafe' : isFocused ? '#f3f4f6' : isHovered ? '#f3f4f6' : 'transparent',
              outline: 'none',
              transition: 'background 60ms',
            }}
          >
            <ComponentIcon isSelected={isSelected} isHovered={isHovered} />
            <span style={{
              fontSize: 12,
              fontWeight: isSelected ? 700 : isHovered ? 500 : 400,
              color: isSelected ? '#111827' : isHovered ? '#374151' : '#9ca3af',
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
