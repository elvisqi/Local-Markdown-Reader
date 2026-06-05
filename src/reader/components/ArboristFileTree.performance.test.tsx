import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArboristFileTree } from './ArboristFileTree';
import type { LazyFileTreeNode } from '../../shared/types';

function createLargeLoadedTree(count: number): LazyFileTreeNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `file-${index}.md`,
    type: 'file',
    name: `file-${index}.md`,
    path: `file-${index}.md`,
  }));
}

function createUnloadedDirectoryRoots(directoryCount: number): LazyFileTreeNode[] {
  return Array.from({ length: directoryCount }, (_, directoryIndex) => ({
    id: `dir-${directoryIndex}`,
    type: 'directory',
    name: `dir-${directoryIndex}`,
    path: `dir-${directoryIndex}`,
    loadState: 'unloaded',
    children: [],
  }));
}

describe('ArboristFileTree performance guardrails', () => {
  it('does not mount every row for a very large loaded root', () => {
    render(
      <div style={{ height: 420 }}>
        <ArboristFileTree
          nodes={createLargeLoadedTree(100_000)}
          activePath={null}
          expandedPaths={new Set()}
          onExpandedPathsChange={vi.fn()}
          onLoadDirectory={vi.fn()}
          onSelectFile={vi.fn()}
        />
      </div>,
    );

    expect(screen.getAllByRole('treeitem').length).toBeLessThan(200);
  });

  it('keeps reachable descendants out of Arborist data until a directory is loaded', async () => {
    const user = userEvent.setup();
    const onLoadDirectory = vi.fn();

    render(
      <div style={{ height: 420 }}>
        <ArboristFileTree
          nodes={createUnloadedDirectoryRoots(1_000)}
          activePath={null}
          expandedPaths={new Set()}
          onExpandedPathsChange={vi.fn()}
          onLoadDirectory={onLoadDirectory}
          onSelectFile={vi.fn()}
        />
      </div>,
    );

    expect(screen.getAllByRole('treeitem').length).toBeLessThan(200);
    expect(screen.queryByRole('treeitem', { name: 'file-0.md' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('treeitem', { name: 'dir-0' }));

    expect(onLoadDirectory).toHaveBeenCalledWith('dir-0');
    expect(screen.queryByRole('treeitem', { name: 'file-0.md' })).not.toBeInTheDocument();
  });
});
