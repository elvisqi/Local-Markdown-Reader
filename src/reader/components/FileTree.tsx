import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { FileTreeNode } from '../../shared/types';

type FileTreeProps = {
  tree: FileTreeNode[];
  activePath: string | null;
  expandedPaths?: string[];
  onExpandedPathsChange?: (paths: string[]) => void;
  onSelect: (path: string) => void;
};

type ScrollSnapshot = {
  element: HTMLElement;
  scrollTop: number;
  scrollLeft: number;
};

export function FileTree({
  tree,
  activePath,
  expandedPaths,
  onExpandedPathsChange,
  onSelect,
}: FileTreeProps) {
  const [uncontrolledExpandedPaths, setUncontrolledExpandedPaths] = useState<string[]>(() => [
    ...selectActiveDirectoryPaths(tree, activePath),
  ]);
  const currentExpandedPaths = expandedPaths ?? uncontrolledExpandedPaths;
  const treeState = useMemo(
    () => createFileTreeState(tree, activePath, currentExpandedPaths),
    [activePath, currentExpandedPaths, tree],
  );
  const expandedPathSet = treeState.expandedPaths;
  const latestExpandedPathsRef = useRef(currentExpandedPaths);
  const manuallyCollapsedActivePathsRef = useRef(new Set<string>());
  const skipNextActiveScrollPathRef = useRef<string | null>(null);
  const treeContainerRef = useRef<HTMLElement | null>(null);
  const pendingScrollRestoreRef = useRef<{ path: string; snapshots: ScrollSnapshot[] } | null>(null);
  const scrollRestoreFrameIdsRef = useRef<number[]>([]);

  useEffect(() => {
    latestExpandedPathsRef.current = currentExpandedPaths;
  }, [currentExpandedPaths]);

  useEffect(() => {
    manuallyCollapsedActivePathsRef.current.clear();
  }, [activePath, tree]);

  useEffect(() => {
    const activePaths = [...selectActiveDirectoryPaths(tree, activePath)];
    const latestExpandedPaths = latestExpandedPathsRef.current;
    const pathsToOpen = activePaths.filter((path) => !manuallyCollapsedActivePathsRef.current.has(path));
    const hasMissingActivePath = pathsToOpen.some((path) => !latestExpandedPaths.includes(path));

    if (!hasMissingActivePath) {
      return;
    }

    const nextPaths = [...new Set([...latestExpandedPaths, ...pathsToOpen])];

    if (expandedPaths) {
      onExpandedPathsChange?.(nextPaths);
    } else {
      setUncontrolledExpandedPaths(nextPaths);
    }
  }, [activePath, expandedPaths, onExpandedPathsChange, tree]);

  useEffect(() => () => {
    scrollRestoreFrameIdsRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    scrollRestoreFrameIdsRef.current = [];
  }, []);

  if (!tree.length) {
    return <p className="empty-note">没有找到 Markdown、HTML 或 JSON 文件。</p>;
  }

  function handleToggleDirectory(path: string, open: boolean) {
    const next = new Set(currentExpandedPaths.filter((currentPath) => treeState.directoryPaths.has(currentPath)));

    if (open) {
      manuallyCollapsedActivePathsRef.current.delete(path);
      next.add(path);
    } else {
      if (treeState.activeDirectoryPaths.has(path)) {
        manuallyCollapsedActivePathsRef.current.add(path);
      }
      next.delete(path);
    }

    if (expandedPaths) {
      onExpandedPathsChange?.([...next]);
    } else {
      setUncontrolledExpandedPaths([...next]);
    }
  }

  const handleSelectFile = useCallback((path: string, element: HTMLButtonElement | null) => {
    skipNextActiveScrollPathRef.current = path;
    scrollRestoreFrameIdsRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    scrollRestoreFrameIdsRef.current = [];
    pendingScrollRestoreRef.current = { path, snapshots: captureScrollSnapshots(element ?? treeContainerRef.current) };
    onSelect(path);
  }, [onSelect]);

  const restorePendingTreeScroll = useCallback((path: string): boolean => {
    const pendingScrollRestore = pendingScrollRestoreRef.current;

    if (pendingScrollRestore?.path !== path) {
      return false;
    }

    pendingScrollRestore.snapshots.forEach(({ element, scrollTop, scrollLeft }) => {
      element.scrollTop = scrollTop;
      element.scrollLeft = scrollLeft;
    });
    return true;
  }, []);

  const schedulePendingTreeScrollRestore = useCallback((path: string, remainingFrames = 2) => {
    if (remainingFrames <= 0) {
      pendingScrollRestoreRef.current = null;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollRestoreFrameIdsRef.current = scrollRestoreFrameIdsRef.current.filter((currentFrameId) => currentFrameId !== frameId);

      if (!restorePendingTreeScroll(path)) {
        pendingScrollRestoreRef.current = null;
        return;
      }

      schedulePendingTreeScrollRestore(path, remainingFrames - 1);
    });

    scrollRestoreFrameIdsRef.current.push(frameId);
  }, [restorePendingTreeScroll]);

  const handleActiveFileRendered = useCallback((path: string, element: HTMLButtonElement | null) => {
    if (skipNextActiveScrollPathRef.current) {
      if (skipNextActiveScrollPathRef.current === path) {
        skipNextActiveScrollPathRef.current = null;
        restorePendingTreeScroll(path);
        schedulePendingTreeScrollRestore(path);
        return;
      }

      skipNextActiveScrollPathRef.current = null;
      pendingScrollRestoreRef.current = null;
    }

    element?.scrollIntoView({ block: 'center' });
  }, [restorePendingTreeScroll, schedulePendingTreeScrollRestore]);

  return (
    <nav ref={treeContainerRef} aria-label="文档文件" className="file-tree">
      <TreeList
        nodes={tree}
        activePath={activePath}
        expandedPaths={treeState.expandedPaths}
        activeDirectoryPaths={treeState.activeDirectoryPaths}
        onToggleDirectory={handleToggleDirectory}
        onSelect={handleSelectFile}
        onActiveFileRendered={handleActiveFileRendered}
      />
    </nav>
  );
}

type TreeListProps = {
  nodes: FileTreeNode[];
  activePath: string | null;
  expandedPaths: Set<string>;
  activeDirectoryPaths: Set<string>;
  onToggleDirectory: (path: string, open: boolean) => void;
  onSelect: (path: string, element: HTMLButtonElement | null) => void;
  onActiveFileRendered: (path: string, element: HTMLButtonElement | null) => void;
};

function TreeList({
  nodes,
  activePath,
  expandedPaths,
  activeDirectoryPaths,
  onToggleDirectory,
  onSelect,
  onActiveFileRendered,
}: TreeListProps) {
  return (
    <ul>
      {nodes.map((node) => {
        const activeBranch = node.type === 'directory' && activeDirectoryPaths.has(node.path);
        const open = expandedPaths.has(node.path);

        return (
          <li key={node.path} className={activeBranch ? 'is-active-branch' : undefined}>
            {node.type === 'directory' ? (
              <>
                <button
                  type="button"
                  className="file-tree__directory"
                  aria-expanded={open}
                  onClick={() => onToggleDirectory(node.path, !open)}
                >
                  {node.name}
                </button>
                {open && (
                  <TreeList
                    nodes={node.children}
                    activePath={activePath}
                    expandedPaths={expandedPaths}
                    activeDirectoryPaths={activeDirectoryPaths}
                    onToggleDirectory={onToggleDirectory}
                    onSelect={onSelect}
                    onActiveFileRendered={onActiveFileRendered}
                  />
                )}
              </>
            ) : (
              <FileTreeButton
                node={node}
                active={node.path === activePath}
                onSelect={onSelect}
                onActiveFileRendered={onActiveFileRendered}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

type FileTreeButtonProps = {
  node: Extract<FileTreeNode, { type: 'file' }>;
  active: boolean;
  onSelect: (path: string, element: HTMLButtonElement | null) => void;
  onActiveFileRendered: (path: string, element: HTMLButtonElement | null) => void;
};

function FileTreeButton({ node, active, onSelect, onActiveFileRendered }: FileTreeButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    if (active) {
      onActiveFileRendered(node.path, buttonRef.current);
    }
  }, [active, node.path, onActiveFileRendered]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`file-tree__file${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(node.path, buttonRef.current)}
    >
      {node.name}
    </button>
  );
}

function captureScrollSnapshots(startElement: HTMLElement | null): ScrollSnapshot[] {
  const snapshots: ScrollSnapshot[] = [];
  const seen = new Set<HTMLElement>();
  let element: HTMLElement | null = startElement;

  while (element) {
    if (!seen.has(element) && isScrollableElement(element)) {
      snapshots.push({ element, scrollTop: element.scrollTop, scrollLeft: element.scrollLeft });
      seen.add(element);
    }

    element = element.parentElement;
  }

  const scrollingElement = document.scrollingElement;

  if (scrollingElement instanceof HTMLElement && !seen.has(scrollingElement) && isScrollableElement(scrollingElement)) {
    snapshots.push({
      element: scrollingElement,
      scrollTop: scrollingElement.scrollTop,
      scrollLeft: scrollingElement.scrollLeft,
    });
  }

  return snapshots;
}

function isScrollableElement(element: HTMLElement): boolean {
  return element.scrollTop > 0
    || element.scrollLeft > 0
    || element.scrollHeight > element.clientHeight
    || element.scrollWidth > element.clientWidth
    || element.classList.contains('file-tree')
    || element.classList.contains('ai-projects__list');
}

function selectActiveDirectoryPaths(nodes: FileTreeNode[], activePath: string | null): Set<string> {
  const paths = new Set<string>();

  function visit(node: FileTreeNode): boolean {
    if (node.type === 'file') {
      return node.path === activePath;
    }

    const containsActiveFile = node.children.some(visit);

    if (containsActiveFile) {
      paths.add(node.path);
    }

    return containsActiveFile;
  }

  nodes.forEach(visit);
  return paths;
}

type FileTreeState = {
  activeDirectoryPaths: Set<string>;
  directoryPaths: Set<string>;
  expandedPaths: Set<string>;
};

function createFileTreeState(nodes: FileTreeNode[], activePath: string | null, expandedPaths: string[]): FileTreeState {
  const activeDirectoryPaths = new Set<string>();
  const directoryPaths = new Set<string>();

  function visit(node: FileTreeNode): boolean {
    if (node.type === 'file') {
      return node.path === activePath;
    }

    directoryPaths.add(node.path);
    let containsActiveFile = false;

    for (const child of node.children) {
      containsActiveFile = visit(child) || containsActiveFile;
    }

    if (containsActiveFile) {
      activeDirectoryPaths.add(node.path);
    }

    return containsActiveFile;
  }

  nodes.forEach(visit);

  const nextExpandedPaths = new Set(expandedPaths.filter((path) => directoryPaths.has(path)));

  return {
    activeDirectoryPaths,
    directoryPaths,
    expandedPaths: nextExpandedPaths,
  };
}
