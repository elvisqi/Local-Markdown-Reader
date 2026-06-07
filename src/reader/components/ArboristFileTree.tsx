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
const MAX_LAYOUT_MEASURE_FRAMES = 6;

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
  const layoutMeasureKey = `${createTreeLayoutKey(nodes)}|${[...expandedPaths].sort().join('\n')}`;

  if (!initialOpenStateRef.current) {
    initialOpenStateRef.current = Object.fromEntries([...expandedPaths].map((path) => [path, true]));
  }

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const scheduledFrames = new Set<number>();
    const scheduleAnimationFrame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    const cancelScheduledFrame = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : window.clearTimeout;

    const scheduleLayoutMeasurement = (remainingFrames: number) => {
      if (remainingFrames <= 0) {
        return;
      }

      const frameId = scheduleAnimationFrame(() => {
        scheduledFrames.delete(frameId);
        const result = updateTreeHeight();

        if (result.source === 'fallback') {
          scheduleLayoutMeasurement(remainingFrames - 1);
        }
      });

      scheduledFrames.add(frameId);
    };

    const updateTreeHeight = (observedHeight?: number, observedParentHeight?: number): TreeHeightMeasureResult => {
      const result = measureAvailableTreeHeight(element, {
        heightMode,
        observedHeight,
        observedParentHeight,
      });
      const nextHeight = result.height;
      setTreeHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
      return result;
    };
    const initialResult = updateTreeHeight();
    scheduleLayoutMeasurement(initialResult.source === 'fallback' ? MAX_LAYOUT_MEASURE_FRAMES : 2);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        scheduledFrames.forEach((frameId) => cancelScheduledFrame(frameId));
        scheduledFrames.clear();
      };
    }

    const observer = new ResizeObserver((entries) => {
      const observedEntry = entries.find((entry) => entry.target === element);
      const observedParentEntry = entries.find((entry) => entry.target === element.parentElement);
      const result = updateTreeHeight(observedEntry?.contentRect.height, observedParentEntry?.contentRect.height);

      if (result.source === 'fallback') {
        scheduleLayoutMeasurement(MAX_LAYOUT_MEASURE_FRAMES);
      }
    });
    observer.observe(element);
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }

    return () => {
      scheduledFrames.forEach((frameId) => cancelScheduledFrame(frameId));
      scheduledFrames.clear();
      observer.disconnect();
    };
  }, [heightMode, layoutMeasureKey, nodes]);

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

function createTreeLayoutKey(nodes: LazyFileTreeNode[]): string {
  return nodes.map((node) => {
    if (node.type === 'file') {
      return `f:${node.id}`;
    }

    return `d:${node.id}:${node.loadState}:${createTreeLayoutKey(node.children)}`;
  }).join('|');
}

type TreeHeightMeasureOptions = {
  heightMode: 'content' | 'remaining-viewport' | 'scroll-container';
  observedHeight?: number;
  observedParentHeight?: number;
};

type TreeHeightMeasureSource = 'remaining-viewport' | 'scroll-container' | 'parent' | 'observed' | 'own' | 'fallback';

type TreeHeightMeasureResult = {
  height: number;
  source: TreeHeightMeasureSource;
};

function measureAvailableTreeHeight(
  element: HTMLElement,
  { heightMode, observedHeight = 0, observedParentHeight = 0 }: TreeHeightMeasureOptions,
): TreeHeightMeasureResult {
  const parent = element.parentElement;
  const elementRect = element.getBoundingClientRect();
  const ownHeight = element.clientHeight || elementRect.height;
  const heightCandidates: Array<{ height: number; source: TreeHeightMeasureSource }> = [];

  if (heightMode === 'remaining-viewport') {
    const viewportRemainingHeight = window.innerHeight - elementRect.top - getFileDrawerBottomInset(element);

    if (viewportRemainingHeight > 0) {
      return { height: Math.max(ROW_HEIGHT, Math.floor(viewportRemainingHeight)), source: 'remaining-viewport' };
    }

    return { height: FALLBACK_TREE_HEIGHT, source: 'fallback' };
  }

  if (heightMode === 'scroll-container') {
    const scrollContainerHeight = findNearestScrollContainerHeight(element);

    if (scrollContainerHeight > 0) {
      return { height: Math.max(ROW_HEIGHT, Math.floor(scrollContainerHeight)), source: 'scroll-container' };
    }
  }

  if (parent) {
    const parentRect = parent.getBoundingClientRect();
    const parentHeight = observedParentHeight || parent.clientHeight || parentRect.height;
    const offsetWithinParent = Math.max(0, elementRect.top - parentRect.top);
    const remainingParentHeight = parentHeight - offsetWithinParent;

    if (remainingParentHeight > 0) {
      heightCandidates.push({ height: remainingParentHeight, source: 'parent' });
    }
  }

  if (observedHeight > ownHeight && ownHeight > 0) {
    heightCandidates.push({ height: observedHeight, source: 'observed' });
  }
  if (heightMode === 'content' && !heightCandidates.length && ownHeight > 0) {
    heightCandidates.push({ height: ownHeight, source: 'own' });
  }

  const validHeights = heightCandidates.filter(({ height }) => height > 0);
  const measured = validHeights.reduce<{ height: number; source: TreeHeightMeasureSource } | null>(
    (largest, candidate) => (!largest || candidate.height > largest.height ? candidate : largest),
    null,
  );

  if (!measured) {
    return { height: FALLBACK_TREE_HEIGHT, source: 'fallback' };
  }

  return { height: Math.max(ROW_HEIGHT, Math.floor(measured.height)), source: measured.source };
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
    case 'yaml':
    case 'yml':
      return 'yaml';
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
