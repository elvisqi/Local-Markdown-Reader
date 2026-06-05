import { type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Tree,
  type NodeApi,
  type NodeRendererProps,
  type RowRendererProps,
  type TreeApi,
} from 'react-arborist';

import type { LazyFileTreeNode } from '../../shared/types';

type ArboristFileTreeProps = {
  nodes: LazyFileTreeNode[];
  activePath: string | null;
  expandedPaths: Set<string>;
  onExpandedPathsChange: (paths: Set<string>) => void;
  onLoadDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
};

const ROW_HEIGHT = 24;
const INDENT = 18;
const FALLBACK_TREE_HEIGHT = 500;

export function ArboristFileTree({
  nodes,
  activePath,
  expandedPaths,
  onExpandedPathsChange,
  onLoadDirectory,
  onSelectFile,
}: ArboristFileTreeProps) {
  const treeRef = useRef<TreeApi<LazyFileTreeNode> | undefined>(undefined);
  const containerRef = useRef<HTMLElement | null>(null);
  const syncingOpenStateRef = useRef(false);
  const [treeHeight, setTreeHeight] = useState(FALLBACK_TREE_HEIGHT);
  const initialOpenStateRef = useRef<Record<string, boolean> | null>(null);

  if (!initialOpenStateRef.current) {
    initialOpenStateRef.current = Object.fromEntries([...expandedPaths].map((path) => [path, true]));
  }

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = Math.max(ROW_HEIGHT, Math.floor(entry.contentRect.height));
      setTreeHeight(nextHeight || FALLBACK_TREE_HEIGHT);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) {
      return;
    }

    syncingOpenStateRef.current = true;
    const next = new Set(expandedPaths);
    const currentOpenIds = new Set(Object.entries(tree.openState).filter(([, open]) => open).map(([id]) => id));

    for (const path of expandedPaths) {
      tree.open(path, false);
    }
    for (const path of currentOpenIds) {
      if (!next.has(path)) {
        tree.close(path, false);
      }
    }
    tree.redrawList();
    syncingOpenStateRef.current = false;
  }, [expandedPaths, nodes]);

  const handleToggle = useCallback((id: string) => {
    if (syncingOpenStateRef.current) {
      return;
    }

    const next = new Set(expandedPaths);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      const directory = findDirectory(nodes, id);
      if (directory?.loadState === 'unloaded' || directory?.loadState === 'error') {
        onLoadDirectory(id);
      }
    }
    onExpandedPathsChange(next);
  }, [expandedPaths, nodes, onExpandedPathsChange, onLoadDirectory]);

  const handleActivate = useCallback((node: NodeApi<LazyFileTreeNode>) => {
    if (node.data.type === 'file') {
      onSelectFile(node.data.path);
    }
  }, [onSelectFile]);

  if (!nodes.length) {
    return <p className="empty-note">当前目录层级没有可显示的文件或子目录。</p>;
  }

  return (
    <nav ref={containerRef} aria-label="文档文件" className="file-tree file-tree--arborist">
      <Tree<LazyFileTreeNode>
        ref={treeRef}
        data={nodes}
        idAccessor="id"
        childrenAccessor="children"
        rowHeight={ROW_HEIGHT}
        height={treeHeight}
        width="100%"
        indent={INDENT}
        overscanCount={12}
        openByDefault={false}
        initialOpenState={initialOpenStateRef.current ?? {}}
        disableDrag
        disableDrop
        disableEdit
        disableMultiSelection
        selection={activePath ?? undefined}
        onActivate={handleActivate}
        onToggle={handleToggle}
        renderRow={(props) => (
          <FileTreeRowContainer
            {...props}
            activePath={activePath}
          />
        )}
      >
        {(props) => (
          <FileTreeNode
            {...props}
            expandedPaths={expandedPaths}
          />
        )}
      </Tree>
    </nav>
  );
}

type FileTreeRowContainerProps = RowRendererProps<LazyFileTreeNode> & {
  activePath: string | null;
};

function FileTreeRowContainer({ node, attrs, innerRef, children, activePath }: FileTreeRowContainerProps) {
  const active = node.data.type === 'file' && node.data.path === activePath;

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    node.handleClick(event);

    if (node.data.type === 'directory') {
      node.toggle();
    }
  }

  return (
    <div
      {...attrs}
      ref={innerRef}
      aria-current={active ? 'page' : undefined}
      className={`file-tree__row file-tree__row--${node.data.type}${active ? ' is-active' : ''}${node.isSelected ? ' is-selected' : ''}`}
      onClick={handleClick}
      onFocus={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

type FileTreeNodeProps = NodeRendererProps<LazyFileTreeNode> & {
  expandedPaths: Set<string>;
};

function FileTreeNode({ node, style, dragHandle, expandedPaths }: FileTreeNodeProps) {
  const data = node.data;
  const open = data.type === 'directory' && expandedPaths.has(data.path);

  return (
    <div
      ref={dragHandle}
      style={style}
      className="file-tree__node"
    >
      {data.type === 'directory' && (
        <span className="file-tree__disclosure" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      )}
      <span className="file-tree__name" title={data.path}>{data.name}</span>
      {data.type === 'directory' && data.loadState === 'loading' && (
        <span className="file-tree__state">正在加载</span>
      )}
      {data.type === 'directory' && data.loadState === 'error' && (
        <span className="file-tree__state is-error">{data.errorMessage}</span>
      )}
    </div>
  );
}

function findDirectory(nodes: LazyFileTreeNode[], path: string): Extract<LazyFileTreeNode, { type: 'directory' }> | null {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === path) {
      return node;
    }

    const child = findDirectory(node.children, path);
    if (child) {
      return child;
    }
  }

  return null;
}
