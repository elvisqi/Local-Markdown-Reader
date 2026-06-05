import { useEffect, useMemo, useRef, useState } from 'react';

import type { FileTreeNode } from '../../shared/types';

type FileTreeProps = {
  tree: FileTreeNode[];
  activePath: string | null;
  expandedPaths?: string[];
  onExpandedPathsChange?: (paths: string[]) => void;
  onSelect: (path: string) => void;
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

  useEffect(() => {
    const nextPaths = [...expandedPathSet];

    if (expandedPaths && !pathsEqual(expandedPaths, nextPaths)) {
      onExpandedPathsChange?.(nextPaths);
      return;
    }

    if (!expandedPaths && !pathsEqual(uncontrolledExpandedPaths, nextPaths)) {
      setUncontrolledExpandedPaths(nextPaths);
    }
  }, [expandedPathSet, expandedPaths, onExpandedPathsChange, uncontrolledExpandedPaths]);

  if (!tree.length) {
    return <p className="empty-note">没有找到 Markdown、HTML 或 JSON 文件。</p>;
  }

  function handleToggleDirectory(path: string, open: boolean) {
    const next = new Set(expandedPathSet);

    if (open) {
      next.add(path);
    } else {
      next.delete(path);
    }

    if (expandedPaths) {
      onExpandedPathsChange?.([...next]);
    } else {
      setUncontrolledExpandedPaths([...next]);
    }
  }

  return (
    <nav aria-label="文档文件" className="file-tree">
      <TreeList
        nodes={tree}
        activePath={activePath}
        expandedPaths={treeState.expandedPaths}
        activeDirectoryPaths={treeState.activeDirectoryPaths}
        onToggleDirectory={handleToggleDirectory}
        onSelect={onSelect}
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
  onSelect: (path: string) => void;
};

function TreeList({
  nodes,
  activePath,
  expandedPaths,
  activeDirectoryPaths,
  onToggleDirectory,
  onSelect,
}: TreeListProps) {
  return (
    <ul>
      {nodes.map((node) => {
        const activeBranch = node.type === 'directory' && activeDirectoryPaths.has(node.path);
        const open = activeBranch || expandedPaths.has(node.path);

        return (
          <li key={node.path} className={activeBranch ? 'is-active-branch' : undefined}>
            {node.type === 'directory' ? (
              <details
                open={open}
                onToggle={(event) => {
                  event.stopPropagation();
                  onToggleDirectory(node.path, event.currentTarget.open);
                }}
              >
                <summary>{node.name}</summary>
                {open && (
                  <TreeList
                    nodes={node.children}
                    activePath={activePath}
                    expandedPaths={expandedPaths}
                    activeDirectoryPaths={activeDirectoryPaths}
                    onToggleDirectory={onToggleDirectory}
                    onSelect={onSelect}
                  />
                )}
              </details>
            ) : (
              <FileTreeButton node={node} active={node.path === activePath} onSelect={onSelect} />
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
  onSelect: (path: string) => void;
};

function FileTreeButton({ node, active, onSelect }: FileTreeButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (active) {
      buttonRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [active]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`file-tree__file${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(node.path)}
    >
      {node.name}
    </button>
  );
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
    const containsActiveFile = node.children.some(visit);

    if (containsActiveFile) {
      activeDirectoryPaths.add(node.path);
    }

    return containsActiveFile;
  }

  nodes.forEach(visit);

  const nextExpandedPaths = new Set(expandedPaths.filter((path) => directoryPaths.has(path)));
  activeDirectoryPaths.forEach((path) => nextExpandedPaths.add(path));

  return {
    activeDirectoryPaths,
    directoryPaths,
    expandedPaths: nextExpandedPaths,
  };
}

function pathsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((path) => rightSet.has(path));
}
