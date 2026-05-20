import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileTree } from './FileTree';
import type { FileTreeNode } from '../../shared/types';

describe('FileTree', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders nested folders and selects document files', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: 'guide.md', path: 'docs/guide.md' },
          { type: 'file', name: 'report.html', path: 'docs/report.html' },
        ],
      },
    ];

    render(<FileTree tree={tree} activePath="README.md" onSelect={onSelect} />);

    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'README.md' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'report.html' })).toBeInTheDocument();

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

  it('only expands the folder branch containing the active file by default', () => {
    const tree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          {
            type: 'directory',
            name: 'guides',
            path: 'docs/guides',
            children: [{ type: 'file', name: 'install.md', path: 'docs/guides/install.md' }],
          },
          {
            type: 'directory',
            name: 'archive',
            path: 'docs/archive',
            children: [{ type: 'file', name: 'old.md', path: 'docs/archive/old.md' }],
          },
        ],
      },
      {
        type: 'directory',
        name: 'notes',
        path: 'notes',
        children: [{ type: 'file', name: 'daily.md', path: 'notes/daily.md' }],
      },
    ];

    render(<FileTree tree={tree} activePath="docs/guides/install.md" onSelect={vi.fn()} />);

    expect(screen.getByText('docs').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('guides').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('archive').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('notes').closest('details')).not.toHaveAttribute('open');
  });
});
