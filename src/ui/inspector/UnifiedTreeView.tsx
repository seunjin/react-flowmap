import { useState } from 'react';
import type React from 'react';
import { Folder, FileCode, Component, ChevronRight } from 'lucide-react';
import type { DocEntry } from '../doc/build-doc-index';
import type { RfmNextRoute, RfmNextServerComponent } from './types';
import { openInEditor } from './utils';

// ─── Data types ───────────────────────────────────────────────────────────────

export type UnifiedFile = {
  kind: 'file';
  name: string;
  fullPath: string;
  route?: RfmNextRoute;
  entries: DocEntry[];
};

export type UnifiedFolder = {
  kind: 'folder';
  name: string;
  fullPath: string;
  children: (UnifiedFolder | UnifiedFile)[];
};

// ─── Tree builder ─────────────────────────────────────────────────────────────

function ensureFolder(parent: UnifiedFolder, parts: string[], offset: number): UnifiedFolder {
  if (offset >= parts.length) return parent;
  const part = parts[offset]!;
  let child = parent.children.find(
    (c): c is UnifiedFolder => c.kind === 'folder' && c.name === part,
  );
  if (!child) {
    child = { kind: 'folder', name: part, fullPath: parts.slice(0, offset + 1).join('/'), children: [] };
    parent.children.push(child);
  }
  return ensureFolder(child, parts, offset + 1);
}

function ensureFile(root: UnifiedFolder, filePath: string): UnifiedFile {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const folderParts = parts.slice(0, -1);
  const fileName = parts[parts.length - 1]!;
  const folder = folderParts.length > 0 ? ensureFolder(root, folderParts, 0) : root;

  let file = folder.children.find(
    (c): c is UnifiedFile => c.kind === 'file' && c.name === fileName,
  );
  if (!file) {
    file = { kind: 'file', name: fileName, fullPath: filePath, entries: [] };
    folder.children.push(file);
  }
  return file;
}

function sortTree(node: UnifiedFolder): void {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    if (child.kind === 'folder') sortTree(child);
  }
}

export function buildUnifiedTree(
  nextRoutes: RfmNextRoute[] | null,
  displayEntries: DocEntry[],
): UnifiedFolder {
  const root: UnifiedFolder = { kind: 'folder', name: '', fullPath: '', children: [] };

  // 런타임 파일 경로 집합 — 이미 자체 노드로 나오는 파일은 import 자식에서 제거
  const runtimePaths = new Set(
    displayEntries.map(e => e.filePath).filter((p): p is string => Boolean(p)),
  );

  if (nextRoutes) {
    for (const route of nextRoutes) {
      const file = ensureFile(root, route.filePath);
      const filteredChildren = route.children?.filter(child => !runtimePaths.has(child.filePath));
      const routeWithFiltered: RfmNextRoute = {
        urlPath: route.urlPath,
        filePath: route.filePath,
        type: route.type,
        componentName: route.componentName,
        isServer: route.isServer,
      };
      if (filteredChildren && filteredChildren.length > 0) {
        routeWithFiltered.children = filteredChildren;
      }
      file.route = routeWithFiltered;
    }
  }

  for (const entry of displayEntries) {
    if (!entry.filePath) continue;
    const file = ensureFile(root, entry.filePath);
    if (!file.entries.some(e => e.symbolId === entry.symbolId)) {
      file.entries.push(entry);
    }
  }

  sortTree(root);
  return root;
}

export function flattenUnifiedEntries(node: UnifiedFolder | UnifiedFile): DocEntry[] {
  if (node.kind === 'file') return node.entries;
  return node.children.flatMap(flattenUnifiedEntries);
}

const SERVER_ICON_COLOR = 'text-amber-500';
const SERVER_ICON_COLOR_HOVER = 'text-amber-600';

// ─── Import 자식 (서버 컴포넌트, 재귀) ────────────────────────────────────────

function ImportNode({
  node,
  depth,
}: {
  node: RfmNextServerComponent;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className="flex items-center border-l-2 border-transparent hover:bg-rfm-bg-50 cursor-pointer"
        style={{ padding: `4px 6px 4px ${8 + depth * 14}px` }}
        onClick={() => openInEditor(node.filePath, '', '1')}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            className="border-none bg-transparent p-0 cursor-pointer mr-0.5 flex items-center"
          >
            <span className={`text-[7px] text-rfm-text-300 inline-block shrink-0 transition-transform duration-120 ${expanded ? 'rotate-90' : 'rotate-0'}`}>▶</span>
          </button>
        )}
        {!hasChildren && <span className="w-[10px] shrink-0" />}
        <Component
          size={10}
          className={`shrink-0 ml-[2px] ${node.isServer ? SERVER_ICON_COLOR : 'text-rfm-text-300'}`}
        />
        <span className="text-[12px] font-normal text-rfm-text-400 truncate flex-1 ml-[6px]">
          {node.componentName}
        </span>
      </div>
      {expanded && hasChildren && node.children!.map((c, i) => (
        <ImportNode key={`${c.filePath}-${i}`} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── 파일 노드 ────────────────────────────────────────────────────────────────

function FileNode({
  file,
  depth,
  selectedId,
  focusedSymbolId,
  hoveredIds,
  treeHoveredId,
  selectedRouteFilePath,
  onSelect,
  onDetail,
  onActivateRoute,
  onSelectRoute,
  onHoverRoute,
  onHoverRouteEnd,
  onHover,
  onHoverEnd,
  selectedRef,
}: {
  file: UnifiedFile;
  depth: number;
} & TreeNodeProps) {
  const { route, entries } = file;
  const fileHovered = entries.some(e => hoveredIds.has(e.symbolId));
  const fileSelected = entries.some(e => e.symbolId === selectedId);
  const routeSelected = !!route && route.filePath === selectedRouteFilePath;

  return (
    <div>
      {/* 파일명 행 */}
      <div
        role={route ? 'button' : undefined}
        tabIndex={route ? 0 : undefined}
        onClick={route ? () => { if (routeSelected) onSelectRoute(route); else onActivateRoute(route); } : undefined}
        onKeyDown={route ? (e) => { if (e.key === 'Enter') { if (routeSelected) onSelectRoute(route); else onActivateRoute(route); } } : undefined}
        onMouseEnter={route ? () => onHoverRoute(route) : undefined}
        onMouseLeave={route ? onHoverRouteEnd : undefined}
        className={`flex items-center gap-[5px] ${
          route ? 'cursor-pointer hover:bg-rfm-bg-50' : ''
        } ${routeSelected ? 'border-l-2 border-rfm-blue bg-rfm-blue-light' : fileSelected || fileHovered ? 'bg-rfm-bg-100' : 'bg-transparent'}`}
        style={{ padding: `4px 10px 3px ${8 + depth * 14}px` }}
      >
        <FileCode
          size={12}
          className={`shrink-0 ${
            routeSelected ? 'text-rfm-blue'
            : fileSelected ? 'text-rfm-blue'
            : route?.isServer ? (fileHovered ? SERVER_ICON_COLOR_HOVER : SERVER_ICON_COLOR)
            : fileHovered ? 'text-rfm-text-700'
            : 'text-rfm-text-400'
          }`}
        />
        <span
          className={`text-[11px] truncate flex-1 text-left ${
            routeSelected ? 'text-rfm-text-900' : fileSelected ? 'text-rfm-text-900' : fileHovered ? 'text-rfm-text-700' : 'text-rfm-text-400'
          }`}
        >
          {file.name}
        </span>
      </div>

      {/* 라우트 파일 — 서버 컴포넌트 import 자식 (런타임에 없는 것만) */}
      {route?.children?.map((child, i) => (
        <ImportNode key={`${child.filePath}-${i}`} node={child} depth={depth + 1} />
      ))}

      {/* 런타임 컴포넌트 항목 */}
      {entries.map(entry => {
        const isHovered = hoveredIds.has(entry.symbolId) || treeHoveredId === entry.symbolId;
        const isSelected = entry.symbolId === selectedId;
        const isFocused = entry.symbolId === focusedSymbolId && !isSelected;

        return (
          <div
            key={entry.symbolId}
            className={`flex items-center transition-[background] duration-60 ${
              isSelected
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
              onClick={() => { if (isSelected) onDetail(); else onSelect(entry.symbolId); }}
              onMouseEnter={() => onHover(entry.symbolId)}
              onMouseLeave={onHoverEnd}
              className="flex items-center gap-[6px] flex-1 border-none bg-transparent text-left cursor-pointer outline-none"
              style={{ padding: `4px 6px 4px ${8 + (depth + 1) * 14}px` }}
            >
              <Component
                size={10}
                className={`shrink-0 ${isSelected ? 'text-rfm-blue' : isHovered ? 'text-rfm-text-700' : 'text-rfm-text-300'}`}
              />
              <span
                className={`text-[12px] font-normal truncate flex-1 ${
                  isSelected ? 'text-rfm-text-900' : isHovered ? 'text-rfm-text-700' : 'text-rfm-text-400'
                }`}
              >
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

// ─── 폴더 노드 (재귀) ─────────────────────────────────────────────────────────

type TreeNodeProps = {
  selectedId: string;
  focusedSymbolId: string;
  hoveredIds: Set<string>;
  treeHoveredId: string;
  selectedRouteFilePath: string;
  onSelect: (symbolId: string, el?: HTMLElement) => void;
  onDetail: () => void;
  onActivateRoute: (route: RfmNextRoute) => void;
  onSelectRoute: (route: RfmNextRoute) => void;
  onHoverRoute: (route: RfmNextRoute) => void;
  onHoverRouteEnd: () => void;
  onHover: (symbolId: string) => void;
  onHoverEnd: () => void;
  selectedRef: React.RefObject<HTMLButtonElement | null>;
};

function FolderNode({
  node,
  depth,
  ...props
}: { node: UnifiedFolder | UnifiedFile; depth: number } & TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (node.kind === 'file') {
    return <FileNode file={node} depth={depth} {...props} />;
  }

  const hasHovered = node.children.some(c => {
    if (c.kind === 'file') return c.entries.some(e => props.hoveredIds.has(e.symbolId));
    return false;
  });

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
          <span className={`text-[7px] text-rfm-text-400 inline-block shrink-0 transition-transform duration-120 ${collapsed ? 'rotate-0' : 'rotate-90'}`}>
            ▶
          </span>
          <Folder size={12} className={`shrink-0 ${hasHovered ? 'text-rfm-text-700' : 'text-rfm-text-400'}`} />
          <span className={`text-[11px] ${hasHovered ? 'font-semibold text-rfm-text-700' : 'font-medium text-rfm-text-500'}`}>
            {node.name}
          </span>
        </div>
      )}
      {!collapsed && node.children.map(child => (
        <FolderNode
          key={child.fullPath}
          node={child}
          depth={node.name !== '' ? depth + 1 : depth}
          {...props}
        />
      ))}
    </div>
  );
}

// ─── UnifiedTreeView (외부 노출) ─────────────────────────────────────────────

export function UnifiedTreeView({
  tree,
  selectedId,
  focusedSymbolId,
  hoveredIds,
  treeHoveredId,
  selectedRouteFilePath,
  onSelect,
  onDetail,
  onActivateRoute,
  onSelectRoute,
  onHoverRoute,
  onHoverRouteEnd,
  onHover,
  onHoverEnd,
  selectedRef,
}: {
  tree: UnifiedFolder;
} & TreeNodeProps) {
  if (tree.children.length === 0) {
    return (
      <p className="m-0 px-2 py-4 text-[11px] text-rfm-text-400 leading-relaxed">
        No components rendered on screen
      </p>
    );
  }

  return (
    <>
      {tree.children.map(child => (
        <FolderNode
          key={child.fullPath}
          node={child}
          depth={0}
          selectedId={selectedId}
          focusedSymbolId={focusedSymbolId}
          hoveredIds={hoveredIds}
          treeHoveredId={treeHoveredId}
          selectedRouteFilePath={selectedRouteFilePath}
          onSelect={onSelect}
          onDetail={onDetail}
          onActivateRoute={onActivateRoute}
          onSelectRoute={onSelectRoute}
          onHoverRoute={onHoverRoute}
          onHoverRouteEnd={onHoverRouteEnd}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
          selectedRef={selectedRef}
        />
      ))}
    </>
  );
}
