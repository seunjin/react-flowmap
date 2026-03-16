import type { DocEntry } from '../doc/build-doc-index';
import { normalizePath } from './utils';

// ─── Folder Tree Types ────────────────────────────────────────────────────────

export type FileTreeNode   = { kind: 'file';   name: string; fullPath: string; entries: DocEntry[] };
export type FolderTreeNode = { kind: 'folder'; name: string; fullPath: string; children: (FolderTreeNode | FileTreeNode)[] };
export type AnyTreeNode    = FolderTreeNode | FileTreeNode;

// ─── Entry file priority (lower = first) ─────────────────────────────────────

export const ENTRY_FILE_PRIORITY: Record<string, number> = {
  'app.tsx': 0, 'app.jsx': 0, 'app.ts': 0,
  '_app.tsx': 1, '_app.jsx': 1,
  'layout.tsx': 2, 'layout.jsx': 2,
  'index.tsx': 3, 'index.jsx': 3, 'index.ts': 3,
  'main.tsx': 4, 'main.jsx': 4,
  'page.tsx': 5, 'page.jsx': 5,
};

// ─── Tree building ────────────────────────────────────────────────────────────

export function sortTreeChildren(children: (FolderTreeNode | FileTreeNode)[]): (FolderTreeNode | FileTreeNode)[] {
  return [...children].sort((a, b) => {
    const aPri = a.kind === 'file' ? (ENTRY_FILE_PRIORITY[a.name] ?? 99) : 100;
    const bPri = b.kind === 'file' ? (ENTRY_FILE_PRIORITY[b.name] ?? 99) : 100;
    if (aPri !== bPri) return aPri - bPri;
    return a.name.localeCompare(b.name);
  });
}

export function sortTreeRecursive(node: FolderTreeNode): void {
  node.children = sortTreeChildren(node.children);
  for (const child of node.children) {
    if (child.kind === 'folder') sortTreeRecursive(child);
  }
}

export function flattenTreeEntries(node: FolderTreeNode | FileTreeNode): DocEntry[] {
  if (node.kind === 'file') return node.entries;
  return node.children.flatMap(flattenTreeEntries);
}

export function buildFolderTree(entries: DocEntry[]): FolderTreeNode {
  const root: FolderTreeNode = { kind: 'folder', name: '', fullPath: '', children: [] };

  for (const entry of entries) {
    if (!entry.filePath) continue;
    const normalized = normalizePath(entry.filePath);
    const parts = normalized.split('/');

    let node: FolderTreeNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      let child = node.children.find(
        (c): c is FolderTreeNode => c.kind === 'folder' && c.name === part,
      );
      if (!child) {
        child = { kind: 'folder', name: part, fullPath: parts.slice(0, i + 1).join('/'), children: [] };
        node.children.push(child);
      }
      node = child;
    }

    const fileName = parts[parts.length - 1]!;
    let fileNode = node.children.find(
      (c): c is FileTreeNode => c.kind === 'file' && c.name === fileName,
    );
    if (!fileNode) {
      fileNode = { kind: 'file', name: fileName, fullPath: normalized, entries: [] };
      node.children.push(fileNode);
    }
    if (!fileNode.entries.some(e => e.symbolId === entry.symbolId)) {
      fileNode.entries.push(entry);
    }
  }

  sortTreeRecursive(root);
  return root;
}

export function folderHasHovered(node: FolderTreeNode, hoveredIds: Set<string>): boolean {
  for (const child of node.children) {
    if (child.kind === 'file') {
      if (child.entries.some(e => hoveredIds.has(e.symbolId))) return true;
    } else {
      if (folderHasHovered(child, hoveredIds)) return true;
    }
  }
  return false;
}
