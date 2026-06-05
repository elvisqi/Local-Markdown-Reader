import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

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

    await user.click(screen.getByRole('button', { name: 'archive' }));

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

    expect(screen.getByRole('button', { name: 'docs' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'guides' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'archive' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'notes' })).toHaveAttribute('aria-expanded', 'false');
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

    await user.click(screen.getByRole('button', { name: 'archive' }));
    expect(screen.getByRole('button', { name: 'archive' })).toHaveAttribute('aria-expanded', 'true');

    rerender(<FileTree tree={tree} activePath="notes/daily.md" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'archive' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'notes' })).toHaveAttribute('aria-expanded', 'true');
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

    expect(screen.getByRole('button', { name: 'guides' })).toHaveAttribute('aria-expanded', 'true');

    rerender(<FileTree tree={tree} activePath="docs/archive/old.md" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'guides' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'archive' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens collapsed folders after a controlled tree is replaced', async () => {
    const user = userEvent.setup();
    const tree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: 'intro.md', path: 'docs/intro.md' },
          {
            type: 'directory',
            name: 'guides',
            path: 'docs/guides',
            children: [{ type: 'file', name: 'install.md', path: 'docs/guides/install.md' }],
          },
        ],
      },
    ];
    const updatedTree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: 'intro.md', path: 'docs/intro.md' },
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

    function ControlledTree({ nodes }: { nodes: FileTreeNode[] }) {
      const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

      return (
        <FileTree
          tree={nodes}
          activePath="docs/intro.md"
          expandedPaths={expandedPaths}
          onExpandedPathsChange={setExpandedPaths}
          onSelect={vi.fn()}
        />
      );
    }

    const { rerender } = render(<ControlledTree nodes={tree} />);

    rerender(<ControlledTree nodes={updatedTree} />);

    await user.click(screen.getByText('archive'));

    expect(await screen.findByRole('button', { name: 'old.md' })).toBeInTheDocument();
  });

  it('keeps previous controlled active branches open after the active file changes', () => {
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

    function ControlledTree({ activePath }: { activePath: string }) {
      const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

      return (
        <FileTree
          tree={tree}
          activePath={activePath}
          expandedPaths={expandedPaths}
          onExpandedPathsChange={setExpandedPaths}
          onSelect={vi.fn()}
        />
      );
    }

    const { rerender } = render(<ControlledTree activePath="docs/guides/install.md" />);

    expect(screen.getByRole('button', { name: 'guides' })).toHaveAttribute('aria-expanded', 'true');

    rerender(<ControlledTree activePath="docs/archive/old.md" />);

    expect(screen.getByRole('button', { name: 'guides' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'archive' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('lets users collapse the directory containing the active file', async () => {
    const user = userEvent.setup();
    const tree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
    ];

    render(<FileTree tree={tree} activePath="docs/guide.md" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'docs' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'docs' }));

    expect(screen.getByRole('button', { name: 'docs' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'guide.md' })).not.toBeInTheDocument();
  });

  it('lets users collapse the active directory in controlled mode without scrolling the active file again', async () => {
    const user = userEvent.setup();
    const tree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
    ];

    function ControlledTree() {
      const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

      return (
        <FileTree
          tree={tree}
          activePath="docs/guide.md"
          expandedPaths={expandedPaths}
          onExpandedPathsChange={setExpandedPaths}
          onSelect={vi.fn()}
        />
      );
    }

    render(<ControlledTree />);

    expect(await screen.findByRole('button', { name: 'guide.md' })).toBeInTheDocument();
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    await user.click(screen.getByRole('button', { name: 'docs' }));

    expect(screen.getByRole('button', { name: 'docs' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'guide.md' })).not.toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
