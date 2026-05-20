import { useEffect, useRef } from 'react';

import type { FileTreeNode } from '../../shared/types';

type FileTreeProps = {
  tree: FileTreeNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
};

export function FileTree({ tree, activePath, onSelect }: FileTreeProps) {
  if (!tree.length) {
    return <p className="empty-note">没有找到 Markdown 或 HTML 文件。</p>;
  }

  return (
    <nav aria-label="文档文件" className="file-tree">
      <TreeList nodes={tree} activePath={activePath} onSelect={onSelect} />
    </nav>
  );
}

type TreeListProps = {
  nodes: FileTreeNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
};

function TreeList({ nodes, activePath, onSelect }: TreeListProps) {
  return (
    <ul>
      {nodes.map((node) => {
        const activeBranch = node.type === 'directory' && containsActivePath(node, activePath);

        return (
          <li key={node.path} className={activeBranch ? 'is-active-branch' : undefined}>
            {node.type === 'directory' ? (
              <details open={activeBranch}>
                <summary>{node.name}</summary>
                <TreeList nodes={node.children} activePath={activePath} onSelect={onSelect} />
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
