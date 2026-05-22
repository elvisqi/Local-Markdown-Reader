import { useEffect, useRef, useState } from 'react';

import type { FileTreeNode } from '../../shared/types';

type FileTreeProps = {
  tree: FileTreeNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
};

export function FileTree({ tree, activePath, onSelect }: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => selectActiveDirectoryPaths(tree, activePath));

  useEffect(() => {
    setExpandedPaths((current) => {
      const validPaths = collectDirectoryPaths(tree);
      const activePaths = selectActiveDirectoryPaths(tree, activePath);
      const next = new Set([...current].filter((path) => validPaths.has(path)));

      activePaths.forEach((path) => next.add(path));

      return next;
    });
  }, [activePath, tree]);

  if (!tree.length) {
    return <p className="empty-note">没有找到 Markdown 或 HTML 文件。</p>;
  }

  function handleToggleDirectory(path: string, open: boolean) {
    setExpandedPaths((current) => {
      const next = new Set(current);

      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }

      return next;
    });
  }

  return (
    <nav aria-label="文档文件" className="file-tree">
      <TreeList
        nodes={tree}
        activePath={activePath}
        expandedPaths={expandedPaths}
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
  onToggleDirectory: (path: string, open: boolean) => void;
  onSelect: (path: string) => void;
};

function TreeList({ nodes, activePath, expandedPaths, onToggleDirectory, onSelect }: TreeListProps) {
  return (
    <ul>
      {nodes.map((node) => {
        const activeBranch = node.type === 'directory' && containsActivePath(node, activePath);
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
                <TreeList
                  nodes={node.children}
                  activePath={activePath}
                  expandedPaths={expandedPaths}
                  onToggleDirectory={onToggleDirectory}
                  onSelect={onSelect}
                />
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

function containsActivePath(node: FileTreeNode, activePath: string | null): boolean {
  if (!activePath || node.type === 'file') {
    return false;
  }

  return node.children.some((child) => child.path === activePath || containsActivePath(child, activePath));
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

function collectDirectoryPaths(nodes: FileTreeNode[]): Set<string> {
  const paths = new Set<string>();

  function visit(node: FileTreeNode) {
    if (node.type === 'file') {
      return;
    }

    paths.add(node.path);
    node.children.forEach(visit);
  }

  nodes.forEach(visit);
  return paths;
}
