import { selectPathAncestors, sortLazyFileTreeNodes } from '../shared/fileSystem';
import type { LazyFileTreeNode } from '../shared/types';

export type LazyFileTreeState = {
  nodes: LazyFileTreeNode[];
  expandedPaths: Set<string>;
  loadedDirectoryPaths: Set<string>;
};

export type LoadedPathSegment = {
  path: string;
  children: LazyFileTreeNode[];
};

export function createEmptyLazyFileTree(): LazyFileTreeState {
  return {
    nodes: [],
    expandedPaths: new Set(),
    loadedDirectoryPaths: new Set(),
  };
}

export function replaceDirectoryChildren(
  state: LazyFileTreeState,
  directoryPath: string,
  children: LazyFileTreeNode[],
): LazyFileTreeState {
  const sortedChildren = sortLazyFileTreeNodes(children);
  const loadedDirectoryPaths = new Set(state.loadedDirectoryPaths).add(directoryPath);

  if (!directoryPath) {
    return {
      ...state,
      nodes: sortedChildren,
      loadedDirectoryPaths,
    };
  }

  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      children: sortedChildren,
      loadState: 'loaded',
      errorMessage: undefined,
    })),
    loadedDirectoryPaths,
  };
}

export function markDirectoryLoading(state: LazyFileTreeState, directoryPath: string): LazyFileTreeState {
  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      loadState: 'loading',
      errorMessage: undefined,
    })),
  };
}

export function markDirectoryError(
  state: LazyFileTreeState,
  directoryPath: string,
  errorMessage: string,
): LazyFileTreeState {
  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      loadState: 'error',
      errorMessage,
    })),
  };
}

export function clearDirectoryError(state: LazyFileTreeState, directoryPath: string): LazyFileTreeState {
  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      loadState: 'unloaded',
      errorMessage: undefined,
    })),
  };
}

export function setExpandedPaths(state: LazyFileTreeState, paths: Iterable<string>): LazyFileTreeState {
  return {
    ...state,
    expandedPaths: new Set(paths),
  };
}

export function pruneExpandedPaths(state: LazyFileTreeState): LazyFileTreeState {
  const existingDirectoryPaths = collectDirectoryPaths(state.nodes);
  return {
    ...state,
    expandedPaths: new Set([...state.expandedPaths].filter((path) => existingDirectoryPaths.has(path))),
  };
}

export function upsertLoadedPath(
  state: LazyFileTreeState,
  documentPath: string,
  segments: LoadedPathSegment[],
): LazyFileTreeState {
  const expandedPaths = new Set(state.expandedPaths);
  selectPathAncestors(documentPath).forEach((path) => expandedPaths.add(path));

  const nextState = segments.reduce(
    (current, segment) => replaceDirectoryChildren(current, segment.path, segment.children),
    state,
  );

  return { ...nextState, expandedPaths };
}

export function selectDirectoryNode(
  nodes: LazyFileTreeNode[],
  path: string,
): Extract<LazyFileTreeNode, { type: 'directory' }> | null {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === path) {
      return node;
    }

    const child = selectDirectoryNode(node.children, path);
    if (child) {
      return child;
    }
  }

  return null;
}

export function selectLoadedDocumentExists(nodes: LazyFileTreeNode[], path: string): boolean {
  return nodes.some((node) => {
    if (node.type === 'file') {
      return node.path === path;
    }

    return selectLoadedDocumentExists(node.children, path);
  });
}

function collectDirectoryPaths(nodes: LazyFileTreeNode[], paths = new Set<string>()): Set<string> {
  nodes.forEach((node) => {
    if (node.type !== 'directory') {
      return;
    }

    paths.add(node.path);
    collectDirectoryPaths(node.children, paths);
  });

  return paths;
}

function updateDirectory(
  nodes: LazyFileTreeNode[],
  directoryPath: string,
  update: (node: Extract<LazyFileTreeNode, { type: 'directory' }>) => LazyFileTreeNode,
): LazyFileTreeNode[] {
  return nodes.map((node) => {
    if (node.type !== 'directory') {
      return node;
    }

    if (node.path === directoryPath) {
      return update(node) as LazyFileTreeNode;
    }

    return {
      ...node,
      children: updateDirectory(node.children, directoryPath, update),
    };
  });
}
