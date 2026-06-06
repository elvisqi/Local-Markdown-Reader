import { type CSSProperties, type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  heightMode?: 'content' | 'remaining-viewport' | 'scroll-container';
  getNodeTitle?: (node: LazyFileTreeNode) => string;
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
  heightMode = 'content',
  getNodeTitle,
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
    if (!element) {
      return;
    }

    const updateTreeHeight = (observedHeight?: number, observedParentHeight?: number) => {
      const nextHeight = measureAvailableTreeHeight(element, {
        heightMode,
        observedHeight,
        observedParentHeight,
      });
      setTreeHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };
    updateTreeHeight();
    const scheduleAnimationFrame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    const cancelScheduledFrame = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : window.clearTimeout;
    const animationFrame = scheduleAnimationFrame(updateTreeHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => cancelScheduledFrame(animationFrame);
    }

    const observer = new ResizeObserver((entries) => {
      const observedEntry = entries.find((entry) => entry.target === element);
      const observedParentEntry = entries.find((entry) => entry.target === element.parentElement);
      updateTreeHeight(observedEntry?.contentRect.height, observedParentEntry?.contentRect.height);
    });
    observer.observe(element);
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }

    return () => {
      cancelScheduledFrame(animationFrame);
      observer.disconnect();
    };
  }, [heightMode]);

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
            getNodeTitle={getNodeTitle}
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
  const depth = Math.max(0, node.level);

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
      style={{
        ...attrs.style,
        '--file-tree-depth': depth,
      } as CSSProperties}
      onClick={handleClick}
      onFocus={(event) => event.stopPropagation()}
    >
      <span className="file-tree__indent-guides" aria-hidden="true">
        {Array.from({ length: depth }, (_, index) => (
          <span
            key={index}
            className="file-tree__indent-guide"
            style={{ '--file-tree-guide-index': index } as CSSProperties}
          />
        ))}
      </span>
      {children}
    </div>
  );
}

type FileTreeNodeProps = NodeRendererProps<LazyFileTreeNode> & {
  getNodeTitle?: (node: LazyFileTreeNode) => string;
};

function FileTreeNode({ node, style, getNodeTitle }: FileTreeNodeProps) {
  const data = node.data;
  const fileIcon = data.type === 'file' ? selectFileTreeIcon(data) : null;
  const title = getNodeTitle ? getNodeTitle(data) : data.path;

  return (
    <div
      style={style}
      className="file-tree__node"
    >
      {data.type === 'directory' && (
        <span className="file-tree__disclosure file-tree__disclosure--directory" aria-hidden="true" />
      )}
      {fileIcon && (
        <span
          className={`file-tree__icon file-tree__icon--${fileIcon}`}
          data-file-icon={fileIcon}
          aria-hidden="true"
        />
      )}
      <span className="file-tree__name" title={title}>{data.name}</span>
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

type TreeHeightMeasureOptions = {
  heightMode: 'content' | 'remaining-viewport' | 'scroll-container';
  observedHeight?: number;
  observedParentHeight?: number;
};

function measureAvailableTreeHeight(
  element: HTMLElement,
  { heightMode, observedHeight = 0, observedParentHeight = 0 }: TreeHeightMeasureOptions,
): number {
  const parent = element.parentElement;
  const elementRect = element.getBoundingClientRect();
  const ownHeight = element.clientHeight || elementRect.height;
  const heightCandidates: number[] = [];

  if (heightMode === 'remaining-viewport') {
    const viewportRemainingHeight = window.innerHeight - elementRect.top - getFileDrawerBottomInset(element);

    if (viewportRemainingHeight > 0) {
      return Math.max(ROW_HEIGHT, Math.floor(viewportRemainingHeight));
    }
  }

  if (heightMode === 'scroll-container') {
    const scrollContainerHeight = findNearestScrollContainerHeight(element);

    if (scrollContainerHeight > 0) {
      return Math.max(ROW_HEIGHT, Math.floor(scrollContainerHeight));
    }
  }

  if (parent) {
    const parentRect = parent.getBoundingClientRect();
    const parentHeight = observedParentHeight || parent.clientHeight || parentRect.height;
    const offsetWithinParent = Math.max(0, elementRect.top - parentRect.top);
    const remainingParentHeight = parentHeight - offsetWithinParent;

    if (remainingParentHeight > 0) {
      heightCandidates.push(remainingParentHeight);
    }
  }

  if (observedHeight > ownHeight && ownHeight > 0) {
    heightCandidates.push(observedHeight);
  }
  if (!heightCandidates.length && ownHeight > 0) {
    heightCandidates.push(ownHeight);
  }

  const validHeights = heightCandidates.filter((height) => height > 0);
  const measuredHeight = validHeights.length ? Math.max(...validHeights) : FALLBACK_TREE_HEIGHT;

  return Math.max(ROW_HEIGHT, Math.floor(measuredHeight));
}

function getFileDrawerBottomInset(element: HTMLElement): number {
  const drawer = element.closest('.file-drawer');
  if (!(drawer instanceof HTMLElement)) {
    return 0;
  }

  const paddingBottom = Number.parseFloat(getComputedStyle(drawer).paddingBottom);
  return Number.isFinite(paddingBottom) ? paddingBottom : 0;
}

function findNearestScrollContainerHeight(element: HTMLElement): number {
  let current = element.parentElement;

  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY || style.overflow;
    const canScroll = overflowY === 'auto' || overflowY === 'scroll';
    const rect = current.getBoundingClientRect();
    const measuredHeight = current.clientHeight || rect.height;

    if (canScroll && measuredHeight > 0) {
      return measuredHeight;
    }

    current = current.parentElement;
  }

  return 0;
}

function selectFileTreeIcon(node: LazyFileTreeNode): string {
  const extension = selectFileExtension(node.name);
  switch (extension) {
    case 'md':
    case 'markdown':
    case 'mdown':
    case 'mkdn':
    case 'mdtxt':
    case 'mdtext':
      return 'markdown';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'py':
    case 'pyw':
      return 'python';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
    case 'ts':
    case 'tsx':
      return 'javascript';
    case 'doc':
    case 'docx':
      return 'word';
    default:
      return 'file';
  }
}

function selectFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');

  return dot >= 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : '';
}
