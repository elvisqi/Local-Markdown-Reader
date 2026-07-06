import { isReadableDocumentFile } from '../shared/fileSystem';
import type { DocumentFileEntry, FileTreeNode, LazyFileTreeNode } from '../shared/types';

type FileNavigation = {
  previous: DocumentFileEntry | null;
  next: DocumentFileEntry | null;
};

export function selectSiblingDocumentNavigation(tree: FileTreeNode[], activePath: string | null): FileNavigation {
  if (!activePath) {
    return emptyNavigation();
  }

  const siblings = findSiblingDocumentFiles(tree, activePath);
  return selectAround(siblings, activePath);
}

export function selectSiblingDocumentNavigationFromLazyTree(
  tree: LazyFileTreeNode[],
  activePath: string | null,
): FileNavigation {
  if (!activePath) {
    return emptyNavigation();
  }

  const activeDirectory = getDirectoryPath(activePath);
  const directory = activeDirectory ? findLazyDirectory(tree, activeDirectory) : tree;
  const siblings = directory
    .filter(
      (node): node is Extract<LazyFileTreeNode, { type: 'file' }> =>
        node.type === 'file' && isReadableDocumentFile(node.name),
    )
    .map((node) => ({ name: node.name, path: node.path }));

  return selectAround(siblings, activePath);
}

function selectAround(siblings: DocumentFileEntry[], activePath: string): FileNavigation {
  const activeIndex = siblings.findIndex((file) => file.path === activePath);

  if (activeIndex < 0) {
    return emptyNavigation();
  }

  return {
    previous: siblings[activeIndex - 1] ?? null,
    next: siblings[activeIndex + 1] ?? null,
  };
}

export const selectSiblingMarkdownNavigation = selectSiblingDocumentNavigation;

function findSiblingDocumentFiles(nodes: FileTreeNode[], activePath: string): DocumentFileEntry[] {
  const activeDirectory = getDirectoryPath(activePath);
  const directory = activeDirectory ? findDirectory(nodes, activeDirectory) : nodes;

  return directory
    .filter((node): node is Extract<FileTreeNode, { type: 'file' }> => node.type === 'file' && isReadableDocumentFile(node.name))
    .map((node) => ({ name: node.name, path: node.path }));
}

function findDirectory(nodes: FileTreeNode[], directoryPath: string): FileTreeNode[] {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === directoryPath) {
      return node.children;
    }

    const nested = findDirectory(node.children, directoryPath);
    if (nested.length) {
      return nested;
    }
  }

  return [];
}

function findLazyDirectory(nodes: LazyFileTreeNode[], directoryPath: string): LazyFileTreeNode[] {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === directoryPath) {
      return node.children;
    }

    const nested = findLazyDirectory(node.children, directoryPath);
    if (nested.length) {
      return nested;
    }
  }

  return [];
}

function getDirectoryPath(path: string): string {
  const slashIndex = path.lastIndexOf('/');
  return slashIndex < 0 ? '' : path.slice(0, slashIndex);
}

function emptyNavigation(): FileNavigation {
  return {
    previous: null,
    next: null,
  };
}
