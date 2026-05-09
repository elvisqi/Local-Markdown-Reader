import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileTree } from './FileTree';
import type { FileTreeNode } from '../../shared/types';

describe('FileTree', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders nested folders and selects Markdown files', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
    ];

    render(<FileTree tree={tree} activePath="README.md" onSelect={onSelect} />);

    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'README.md' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'guide.md' }));

    expect(onSelect).toHaveBeenCalledWith('docs/guide.md');
  });

  it('marks and scrolls the active file into view', () => {
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
    ];

    render(<FileTree tree={tree} activePath="docs/guide.md" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'guide.md' })).toHaveClass('is-active');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });
});
