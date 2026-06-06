import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArboristFileTree } from './ArboristFileTree';
import type { LazyFileTreeNode } from '../../shared/types';

const tree: LazyFileTreeNode[] = [
  {
    id: 'docs',
    type: 'directory',
    name: 'docs',
    path: 'docs',
    loadState: 'loaded',
    children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
  },
  { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
];

describe('ArboristFileTree', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders files and activates a selected file', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    const onExpandedPathsChange = vi.fn();

    render(
      <ArboristFileTree
        nodes={tree}
        activePath="README.md"
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={onSelectFile}
      />,
    );

    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'README.md' })).toHaveAttribute('aria-current', 'page');

    act(() => {
      fireEvent.click(screen.getByText('guide.md'));
    });

    expect(onSelectFile).toHaveBeenCalledWith('docs/guide.md');
    expect(onSelectFile).toHaveBeenCalledOnce();
    expect(screen.getByRole('treeitem', { name: 'guide.md' })).toHaveAttribute('aria-selected', 'true');
  });

  it('exposes full paths in row titles while allowing visible names to truncate', () => {
    const nodes: LazyFileTreeNode[] = [
      {
        id: 'very-long-directory-name',
        type: 'directory',
        name: 'very-long-directory-name',
        path: 'very-long-directory-name',
        loadState: 'loaded',
        children: [
          {
            id: 'very-long-directory-name/extremely-long-document-name-that-will-truncate.md',
            type: 'file',
            name: 'extremely-long-document-name-that-will-truncate.md',
            path: 'very-long-directory-name/extremely-long-document-name-that-will-truncate.md',
          },
        ],
      },
    ];

    render(
      <ArboristFileTree
        nodes={nodes}
        activePath={null}
        expandedPaths={new Set(['very-long-directory-name'])}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText('very-long-directory-name')).toHaveAttribute('title', 'very-long-directory-name');
    expect(screen.getByText('extremely-long-document-name-that-will-truncate.md')).toHaveAttribute(
      'title',
      'very-long-directory-name/extremely-long-document-name-that-will-truncate.md',
    );
  });

  it('keeps file names aligned with directory names at the same tree depth', () => {
    render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    const readmeRow = screen.getByRole('treeitem', { name: 'README.md' });

    expect(readmeRow.querySelector('.file-tree__disclosure')).not.toBeInTheDocument();
  });

  it('does not reserve a directory chevron slot for file rows', () => {
    render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    const readmeRow = screen.getByRole('treeitem', { name: 'README.md' });

    expect(readmeRow.querySelector('.file-tree__disclosure')).not.toBeInTheDocument();
    expect(readmeRow.querySelector('.file-tree__icon')).toHaveAttribute('data-file-icon', 'markdown');
  });

  it('renders VS Code style directory chevrons and file icons by type', () => {
    const typedNodes: LazyFileTreeNode[] = [
      {
        id: 'docs',
        type: 'directory',
        name: 'docs',
        path: 'docs',
        loadState: 'loaded',
        children: [],
      },
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
      { id: 'index.html', type: 'file', name: 'index.html', path: 'index.html' },
      { id: 'settings.json', type: 'file', name: 'settings.json', path: 'settings.json' },
      { id: 'script.py', type: 'file', name: 'script.py', path: 'script.py' },
      { id: 'build.mjs', type: 'file', name: 'build.mjs', path: 'build.mjs' },
      { id: 'proposal.docx', type: 'file', name: 'proposal.docx', path: 'proposal.docx' },
      { id: 'LICENSE', type: 'file', name: 'LICENSE', path: 'LICENSE' },
    ];

    render(
      <ArboristFileTree
        nodes={typedNodes}
        activePath={null}
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    const docsRow = screen.getByRole('treeitem', { name: 'docs' });

    expect(docsRow.querySelector('.file-tree__disclosure')).toHaveClass('file-tree__disclosure--directory');
    expect(docsRow.querySelector('.file-tree__disclosure')).toBeEmptyDOMElement();
    expect(docsRow.querySelector('.file-tree__icon')).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'README.md' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'markdown',
    );
    expect(screen.getByRole('treeitem', { name: 'index.html' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'html',
    );
    expect(screen.getByRole('treeitem', { name: 'settings.json' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'json',
    );
    expect(screen.getByRole('treeitem', { name: 'script.py' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'python',
    );
    expect(screen.getByRole('treeitem', { name: 'build.mjs' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'javascript',
    );
    expect(screen.getByRole('treeitem', { name: 'proposal.docx' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'word',
    );
    expect(screen.getByRole('treeitem', { name: 'LICENSE' }).querySelector('.file-tree__icon')).toHaveAttribute(
      'data-file-icon',
      'file',
    );
  });

  it('renders indentation guides for nested tree rows', () => {
    render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('treeitem', { name: 'docs' }).querySelectorAll('.file-tree__indent-guide')).toHaveLength(0);
    expect(screen.getByRole('treeitem', { name: 'guide.md' }).querySelectorAll('.file-tree__indent-guide')).toHaveLength(1);
  });

  it('sizes the main folder tree from its top edge to the viewport bottom', () => {
    let resizeCallback: ResizeObserverCallback | null = null;
    const observers: ResizeObserver[] = [];
    let animationFrameCallback: FrameRequestCallback | null = null;

    class MockResizeObserver implements ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();

      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
        observers.push(this);
      }
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrameCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getMockRect(this: HTMLElement) {
      if (this.classList.contains('file-tree--arborist')) {
        return createRect({ top: 94, bottom: 594, height: 500 });
      }
      if (this.classList.contains('file-drawer')) {
        return createRect({ top: 57, bottom: 900, height: 843 });
      }

      return createRect({});
    });

    const { container } = render(
      <aside className="file-drawer" style={{ paddingBottom: '16px' }}>
        <ArboristFileTree
          heightMode="remaining-viewport"
          nodes={tree}
          activePath={null}
          expandedPaths={new Set()}
          onExpandedPathsChange={vi.fn()}
          onLoadDirectory={vi.fn()}
          onSelectFile={vi.fn()}
        />
      </aside>,
    );

    const treeContainer = container.querySelector('.file-tree--arborist') as HTMLElement;
    const parentPanel = treeContainer.parentElement as HTMLElement;

    expect(screen.getByRole('tree')).toHaveStyle({ height: '790px' });

    act(() => {
      animationFrameCallback?.(0);
    });

    expect(screen.getByRole('tree')).toHaveStyle({ height: '790px' });

    act(() => {
      resizeCallback?.([
        createResizeEntry(treeContainer, 500),
        createResizeEntry(parentPanel, 843),
      ], observers[0] as ResizeObserver);
    });

    expect(observers[0].observe).toHaveBeenCalledWith(treeContainer);
    expect(observers[0].observe).toHaveBeenCalledWith(parentPanel);
    expect(screen.getByRole('tree')).toHaveStyle({ height: '790px' });
  });

  it('uses the observed container height when the flex item fills more space than its current list height', () => {
    let resizeCallback: ResizeObserverCallback | null = null;
    let animationFrameCallback: FrameRequestCallback | null = null;

    class MockResizeObserver implements ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();

      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrameCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { container } = render(
      <section>
        <ArboristFileTree
          nodes={tree}
          activePath={null}
          expandedPaths={new Set()}
          onExpandedPathsChange={vi.fn()}
          onLoadDirectory={vi.fn()}
          onSelectFile={vi.fn()}
        />
      </section>,
    );

    const treeContainer = container.querySelector('.file-tree--arborist') as HTMLElement;

    vi
      .spyOn(treeContainer, 'getBoundingClientRect')
      .mockReturnValue(createRect({ top: 150, bottom: 650, height: 500 }));

    act(() => {
      animationFrameCallback?.(0);
    });

    expect(screen.getByRole('tree')).toHaveStyle({ height: '500px' });

    act(() => {
      resizeCallback?.([createResizeEntry(treeContainer, 1180)], {} as ResizeObserver);
    });

    expect(screen.getByRole('tree')).toHaveStyle({ height: '1180px' });
  });

  it('sizes the AI workspace tree from the nearest scroll container viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getMockRect(this: HTMLElement) {
      if (this.classList.contains('ai-projects__workspace')) {
        return createRect({ top: 120, bottom: 740, height: 620 });
      }
      if (this.classList.contains('file-tree--arborist')) {
        return createRect({ top: 170, bottom: 670, height: 500 });
      }

      return createRect({});
    });

    render(
      <section className="ai-projects__workspace" style={{ height: '620px', overflowY: 'auto' }}>
        <div>
          <ArboristFileTree
            heightMode="scroll-container"
            nodes={tree}
            activePath={null}
            expandedPaths={new Set()}
            onExpandedPathsChange={vi.fn()}
            onLoadDirectory={vi.fn()}
            onSelectFile={vi.fn()}
          />
        </div>
      </section>,
    );

    expect(screen.getByRole('tree')).toHaveStyle({ height: '620px' });
  });

  it('loads an unloaded directory when it is opened', async () => {
    const user = userEvent.setup();
    const onLoadDirectory = vi.fn();
    const onExpandedPathsChange = vi.fn();
    const unloaded: LazyFileTreeNode[] = [
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', loadState: 'unloaded', children: [] },
    ];

    render(
      <ArboristFileTree
        nodes={unloaded}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={onLoadDirectory}
        onSelectFile={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('treeitem', { name: 'docs' }));

    expect(onLoadDirectory).toHaveBeenCalledWith('docs');
    expect(onExpandedPathsChange).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded directories closed unless their path is externally expanded', () => {
    render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('treeitem', { name: 'docs' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: 'guide.md' })).not.toBeInTheDocument();
  });

  it('lets users collapse the directory containing the active file', async () => {
    const user = userEvent.setup();
    const onExpandedPathsChange = vi.fn();

    render(
      <ArboristFileTree
        nodes={tree}
        activePath="docs/guide.md"
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('treeitem', { name: 'docs' }));

    expect(onExpandedPathsChange).toHaveBeenCalledWith(new Set());
  });

  it('syncs externally controlled expanded paths without reporting a user toggle', () => {
    const onExpandedPathsChange = vi.fn();
    const { rerender } = render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    rerender(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(onExpandedPathsChange).not.toHaveBeenCalled();
  });

  it('shows loading and error state on directory rows', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'loading', type: 'directory', name: 'loading', path: 'loading', loadState: 'loading', children: [] },
      {
        id: 'broken',
        type: 'directory',
        name: 'broken',
        path: 'broken',
        loadState: 'error',
        errorMessage: 'No permission',
        children: [],
      },
    ];

    render(
      <ArboristFileTree
        nodes={nodes}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText('正在加载')).toBeInTheDocument();
    expect(screen.getByText('No permission')).toBeInTheDocument();
  });
});

function createRect(overrides: Partial<DOMRectReadOnly>): DOMRectReadOnly {
  return {
    x: 0,
    y: 0,
    top: 0,
    right: 320,
    bottom: 0,
    left: 0,
    width: 320,
    height: 0,
    toJSON: () => ({}),
    ...overrides,
  };
}

function createResizeEntry(target: Element, height: number): ResizeObserverEntry {
  return {
    target,
    contentRect: createRect({ height }),
  } as ResizeObserverEntry;
}
