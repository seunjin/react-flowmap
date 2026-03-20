import { useState } from 'react';
import type React from 'react';
import { Folder, FileCode, Component, ChevronRight } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { AnyTreeNode, FolderTreeNode } from './tree-utils';
import { folderHasHovered } from './tree-utils';

// ─── Icons ────────────────────────────────────────────────────────────────────

export function FolderIcon({ hovered }: { hovered: boolean }) {
  return <Folder size={12} className={`shrink-0 ${hovered ? 'text-rfm-text-700' : 'text-rfm-text-400'}`} />;
}

export function FileIcon({ hovered, selected }: { hovered: boolean; selected: boolean }) {
  return <FileCode size={12} className={`shrink-0 ${selected ? 'text-rfm-blue' : hovered ? 'text-rfm-text-700' : 'text-rfm-text-400'}`} />;
}

export function ComponentIcon({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  return <Component size={10} className={`shrink-0 ${isSelected ? 'text-rfm-blue' : isHovered ? 'text-rfm-text-700' : 'text-rfm-text-300'}`} />;
}

// ─── TreeNodeView ─────────────────────────────────────────────────────────────

export function TreeNodeView({
  node, depth, hoveredIds, treeHoveredId, selectedId, focusedSymbolId, onSelect, onDetail, selectedRef,
  onHover, onHoverEnd, forceExpanded,
}: {
  node: AnyTreeNode;
  depth: number;
  hoveredIds: Set<string>;
  treeHoveredId: string;
  selectedId: string;
  focusedSymbolId: string;
  onSelect: (symbolId: string) => void;
  onDetail: () => void;
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
            className="flex items-center gap-[5px] cursor-pointer select-none"
            style={{ padding: `4px 10px 4px ${8 + depth * 14}px` }}
          >
            <span
              className={`text-[7px] text-rfm-text-400 inline-block shrink-0 transition-transform duration-120 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
            >▶</span>
            <FolderIcon hovered={hasHovered} />
            <span className={`text-[11px] ${hasHovered ? 'font-semibold text-rfm-text-700' : 'font-medium text-rfm-text-500'}`}>
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
            onDetail={onDetail}
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
      <div
        className={`flex items-center gap-[5px] ${fileSelected || fileHovered ? 'bg-rfm-bg-100' : 'bg-transparent'}`}
        style={{ padding: `4px 10px 3px ${8 + depth * 14}px` }}
      >
        <FileIcon hovered={fileHovered} selected={fileSelected} />
        <span className={`text-[11px] truncate flex-1 text-left ${fileSelected ? 'font-semibold text-rfm-text-900' : fileHovered ? 'font-medium text-rfm-text-700' : 'font-normal text-rfm-text-400'}`}>
          {node.name}
        </span>
      </div>

      {node.entries.map((entry: DocEntry) => {
        const isHovered = hoveredIds.has(entry.symbolId) || treeHoveredId === entry.symbolId;
        const isSelected = entry.symbolId === selectedId;
        const isFocused = entry.symbolId === focusedSymbolId && !isSelected;

        return (
          <div
            key={entry.symbolId}
            className={`flex items-center transition-[background] duration-60 ${isSelected
                ? 'border-l-2 border-rfm-blue bg-rfm-blue-light'
                : isFocused
                  ? 'border-l-2 border-rfm-blue-border bg-rfm-bg-100'
                  : isHovered
                    ? 'border-l-2 border-rfm-text-400 bg-rfm-bg-100'
                    : 'border-l-2 border-transparent bg-transparent'
              }`}
          >
            <button
              data-tree-entry
              type="button"
              ref={isSelected ? (el) => { selectedRef.current = el; } : undefined}
              onClick={() => onSelect(entry.symbolId)}
              onMouseEnter={() => onHover(entry.symbolId)}
              onMouseLeave={onHoverEnd}
              className="flex items-center gap-[6px] flex-1 border-none bg-transparent text-left cursor-pointer outline-none"
              style={{ padding: `4px 6px 4px ${8 + (depth + 1) * 14}px` }}
            >
              <ComponentIcon isSelected={isSelected} isHovered={isHovered} />
              <span className={`text-[12px] font-normal truncate flex-1 ${isSelected ? 'text-rfm-text-900' : isHovered ? 'text-rfm-text-700' : 'text-rfm-text-400'}`}>
                {entry.name}
              </span>
            </button>
            {isSelected && (
              <button
                type="button"
                onClick={onDetail}
                title="View details"
                className="shrink-0 w-6 h-6 mr-1.5 flex items-center justify-center border border-rfm-border-light rounded-[4px] bg-transparent cursor-pointer text-rfm-blue transition-[background] duration-80 hover:bg-rfm-blue-xlight"
              >
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
