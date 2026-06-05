import { render, screen } from '@testing-library/react';
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

    await user.click(screen.getByRole('treeitem', { name: 'guide.md' }));

    expect(onSelectFile).toHaveBeenCalledWith('docs/guide.md');
    expect(onSelectFile).toHaveBeenCalledOnce();
    expect(screen.getByRole('treeitem', { name: 'guide.md' })).toHaveAttribute('aria-selected', 'true');
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
