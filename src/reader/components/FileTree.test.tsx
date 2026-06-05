import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileTree } from './FileTree';
import type { FileTreeNode } from '../../shared/types';

describe('FileTree', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders expanded folders and selects document files', async () => {
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
    expect(screen.queryByRole('button', { name: 'report.html' })).not.toBeInTheDocument();

    await user.click(screen.getByText('docs'));

    expect(screen.getByRole('button', { name: 'report.html' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'guide.md' }));

    expect(onSelect).toHaveBeenCalledWith('docs/guide.md');
  });

  it('does not render files inside collapsed folders until the folder is opened', async () => {
    const user = userEvent.setup();
    const tree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          {
            type: 'directory',
            name: 'archive',
            path: 'docs/archive',
            children: [{ type: 'file', name: 'old.md', path: 'docs/archive/old.md' }],
          },
        ],
      },
    ];

    render(<FileTree tree={tree} activePath={null} onSelect={vi.fn()} />);

    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.queryByText('archive')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'old.md' })).not.toBeInTheDocument();

    await user.click(screen.getByText('docs'));

    expect(screen.getByText('archive')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'old.md' })).not.toBeInTheDocument();

    await user.click(screen.getByText('archive'));

    expect(screen.getByRole('button', { name: 'old.md' })).toBeInTheDocument();
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

  it('keeps manually expanded folders open after the active file changes', async () => {
    const user = userEvent.setup();
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

    const { rerender } = render(
      <FileTree tree={tree} activePath="docs/guides/install.md" onSelect={vi.fn()} />,
    );

    await user.click(screen.getByText('archive'));
    expect(screen.getByText('archive').closest('details')).toHaveAttribute('open');

    rerender(<FileTree tree={tree} activePath="notes/daily.md" onSelect={vi.fn()} />);

    expect(screen.getByText('archive').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('notes').closest('details')).toHaveAttribute('open');
  });

  it('keeps the previous active branch open after another file is selected', () => {
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
    ];

    const { rerender } = render(
      <FileTree tree={tree} activePath="docs/guides/install.md" onSelect={vi.fn()} />,
    );

    expect(screen.getByText('guides').closest('details')).toHaveAttribute('open');

    rerender(<FileTree tree={tree} activePath="docs/archive/old.md" onSelect={vi.fn()} />);

    expect(screen.getByText('guides').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('archive').closest('details')).toHaveAttribute('open');
  });
});
