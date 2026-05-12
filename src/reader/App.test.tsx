import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FileTreeNode } from '../shared/types';
import { App } from './App';
import * as fileSystemAccess from './fileSystemAccess';

vi.mock('./fileSystemAccess', async () => {
  const actual = await vi.importActual<typeof import('./fileSystemAccess')>('./fileSystemAccess');

  return {
    ...actual,
    openDirectory: vi.fn(),
    readMarkdownFile: vi.fn(),
    scanMarkdownDirectory: vi.fn(),
  };
});

vi.mock('./recentDocument', async () => {
  const actual = await vi.importActual<typeof import('./recentDocument')>('./recentDocument');

  return {
    ...actual,
    loadLastDocument: vi.fn(async () => null),
    saveLastDocument: vi.fn(async () => undefined),
  };
});

vi.mock('./mermaidRenderer', () => ({
  renderMermaidBlocks: vi.fn(async () => undefined),
  resetMermaidRendererForTests: vi.fn(),
}));

describe('App file navigation and drawer behavior', () => {
  const directoryHandle = { name: 'Docs' } as FileSystemDirectoryHandle;
  const tree: FileTreeNode[] = [
    {
      type: 'directory',
      name: 'docs',
      path: 'docs',
      children: [
        { type: 'file', name: '01-intro.md', path: 'docs/01-intro.md' },
        { type: 'file', name: '02-design.md', path: 'docs/02-design.md' },
        { type: 'file', name: '03-api.md', path: 'docs/03-api.md' },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(tree);
    vi.mocked(fileSystemAccess.readMarkdownFile).mockImplementation(async (_handle, path) => `# ${path}`);
  });

  it('opens sibling files from the toolbar and exposes target filenames in tooltips', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    const nextButton = screen.getByRole('button', { name: '下一个' });
    expect(nextButton).toHaveAttribute('title', '下一个文件：02-design.md');

    await user.click(nextButton);

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));
    expect(screen.getByRole('button', { name: '上一个' })).toHaveAttribute('title', '上一个文件：01-intro.md');
    expect(screen.getByRole('button', { name: '下一个' })).toHaveAttribute('title', '下一个文件：03-api.md');

    await user.click(screen.getByRole('button', { name: '上一个' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));
  });

  it('closes the file drawer from the reading area and prevents the first content click', async () => {
    const user = userEvent.setup();
    const contentClick = vi.fn();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    expect(screen.getByLabelText('文件列表')).toHaveClass('is-open');

    screen.getByRole('article').addEventListener('click', contentClick);
    await user.click(screen.getByRole('article'));

    await waitFor(() => expect(screen.getByLabelText('文件列表')).not.toHaveClass('is-open'));
    expect(contentClick).not.toHaveBeenCalled();

    await user.click(screen.getByRole('article'));

    expect(contentClick).toHaveBeenCalledOnce();
  });

  it('opens sibling files with left and right arrow keys outside editable controls', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.keyboard('{ArrowRight}');

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));

    screen.getByLabelText('原文').focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0);

    screen.getByLabelText('原文').blur();
    await user.keyboard('{ArrowLeft}');

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));
  });

  it('scrolls the reading page with up and down arrow keys outside editable controls', async () => {
    const user = userEvent.setup();
    const scrollBy = vi.fn();
    Object.defineProperty(window, 'scrollBy', { configurable: true, value: scrollBy });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.keyboard('{ArrowDown}');

    expect(scrollBy).toHaveBeenLastCalledWith({ top: 160 });

    screen.getByLabelText('原文').focus();
    await user.keyboard('{ArrowDown}');

    expect(scrollBy).toHaveBeenCalledTimes(1);

    screen.getByLabelText('原文').blur();
    await user.keyboard('{ArrowUp}');

    expect(scrollBy).toHaveBeenLastCalledWith({ top: -160 });
  });

  it('reloads the folder tree from the file drawer while keeping the current document open', async () => {
    const user = userEvent.setup();
    const updatedTree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: '01-intro.md', path: 'docs/01-intro.md' },
          { type: 'file', name: '02-design.md', path: 'docs/02-design.md' },
          { type: 'file', name: '03-api.md', path: 'docs/03-api.md' },
          { type: 'file', name: '04-new.md', path: 'docs/04-new.md' },
        ],
      },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce(tree)
      .mockResolvedValueOnce(updatedTree);

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '重载目录' }));

    await waitFor(() =>
      expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '04-new.md' })).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0);
    expect(fileSystemAccess.scanMarkdownDirectory).toHaveBeenCalledTimes(2);
  });
});
