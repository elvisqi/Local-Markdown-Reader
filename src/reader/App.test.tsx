import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FileTreeNode } from '../shared/types';
import { App } from './App';
import * as aiProjects from './aiProjects';
import * as fileSystemAccess from './fileSystemAccess';
import * as recentDocument from './recentDocument';

vi.mock('./fileSystemAccess', async () => {
  const actual = await vi.importActual<typeof import('./fileSystemAccess')>('./fileSystemAccess');

  return {
    ...actual,
    openDirectory: vi.fn(),
    openDocumentFile: vi.fn(),
    openMarkdownFile: vi.fn(),
    readAssetFile: vi.fn(),
    readDocumentFile: vi.fn(),
    readDocumentFileSnapshot: vi.fn(),
    readMarkdownFile: vi.fn(),
    readMarkdownFileSlice: vi.fn(),
    readMarkdownFileSnapshot: vi.fn(),
    scanMarkdownDirectory: vi.fn(),
  };
});

const largeDocumentClient = {
  buildIndex: vi.fn(),
  readLines: vi.fn(),
  search: vi.fn(),
  terminate: vi.fn(),
};

vi.mock('./largeDocumentWorkerClient', () => ({
  createLargeDocumentWorkerClient: vi.fn(() => largeDocumentClient),
}));

vi.mock('./recentDocument', async () => {
  const actual = await vi.importActual<typeof import('./recentDocument')>('./recentDocument');

  return {
    ...actual,
    loadLastDocument: vi.fn(async () => null),
    saveLastDocument: vi.fn(async () => undefined),
  };
});

vi.mock('./aiProjects', async () => {
  const actual = await vi.importActual<typeof import('./aiProjects')>('./aiProjects');

  return {
    ...actual,
    loadAiProjectState: vi.fn(async () => ({ sources: {}, projects: [] })),
    saveAiProjectState: vi.fn(async () => undefined),
  };
});

vi.mock('../shared/temporaryDocument', async () => {
  const actual = await vi.importActual<typeof import('../shared/temporaryDocument')>('../shared/temporaryDocument');

  return {
    ...actual,
    consumeTemporaryMarkdownDocument: vi.fn(async () => null),
  };
});

import * as temporaryDocument from '../shared/temporaryDocument';

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
    window.localStorage.clear();
    window.history.replaceState(null, '', '/reader.html');
    Element.prototype.scrollIntoView = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:preview-url');
    URL.revokeObjectURL = vi.fn();
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(tree);
    vi.mocked(fileSystemAccess.readDocumentFile).mockImplementation(async (_handle, path) => `# ${path}`);
    vi.mocked(fileSystemAccess.readAssetFile).mockResolvedValue(null);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const type = /\.html?$/i.test(path) ? 'text/html' : 'text/markdown';
      const body = type === 'text/html' ? `<h1>${path}</h1>` : `# ${path}`;
      const file = new File([body], path.split('/').at(-1) ?? path, { type });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });
    vi.mocked(fileSystemAccess.readMarkdownFile).mockImplementation(async (_handle, path) => `# ${path}`);
    vi.mocked(fileSystemAccess.readMarkdownFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path.split('/').at(-1) ?? path, { type: 'text/markdown' });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# sample');
    vi.mocked(fileSystemAccess.openDocumentFile).mockRejectedValue(new DOMException('AbortError', 'AbortError'));
    vi.mocked(fileSystemAccess.openMarkdownFile).mockRejectedValue(new DOMException('AbortError', 'AbortError'));
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'big.md',
      size: 2 * 1024 * 1024,
      lineCount: 2,
      lineStarts: [0, 6],
      title: 'Big',
      outline: [{ id: 'big', text: 'Big', depth: 1, line: 1, children: [] }],
      warnings: [],
    });
    largeDocumentClient.readLines.mockResolvedValue({ startLine: 1, endLine: 2, text: '# Big\ncontent\n' });
    largeDocumentClient.search.mockResolvedValue([]);
    vi.mocked(recentDocument.loadLastDocument).mockResolvedValue(null);
    vi.mocked(recentDocument.saveLastDocument).mockResolvedValue(undefined);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({ sources: {}, projects: [] });
    vi.mocked(aiProjects.saveAiProjectState).mockResolvedValue(undefined);
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue(null);
  });

  it('restores drawer open state and width from local layout preferences without live cross-tab updates', async () => {
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: true, fileDrawerWidth: 420 }),
    );

    render(<App />);

    const drawer = screen.getByLabelText('文件列表');
    const shell = drawer.parentElement;

    expect(drawer).toBeInTheDocument();
    expect(shell).toHaveStyle({ '--file-drawer-width': '420px' });

    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 280 }),
    );
    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'localMarkdownReader.layoutPreferences',
        newValue: JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 280 }),
      }),
    );

    expect(screen.getByLabelText('文件列表')).toBeInTheDocument();
    expect(shell).toHaveStyle({ '--file-drawer-width': '420px' });
  });

  it('falls back to the default drawer layout when local layout preferences are malformed', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('localMarkdownReader.layoutPreferences', '{malformed-json');

    render(<App />);

    expect(screen.queryByLabelText('文件列表')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByLabelText('文件列表').parentElement).toHaveStyle({ '--file-drawer-width': '360px' });
  });

  it('saves drawer open state and resized width as local layout preferences', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));

    const separator = screen.getByRole('separator', { name: '调整文件面板宽度' });
    fireEvent.pointerDown(separator, { clientX: 360 });
    fireEvent.pointerMove(window, { clientX: 480 });
    fireEvent.pointerUp(window);

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        fileDrawerOpen: true,
        fileDrawerWidth: 480,
      }),
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '关闭文件面板' }));

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        fileDrawerOpen: false,
        fileDrawerWidth: 480,
      }),
    );
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

  it('opens relative document links inside rendered Markdown using the authorized folder', async () => {
    const user = userEvent.setup();
    const linkTree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: '01-intro.md', path: 'docs/01-intro.md' }],
      },
      {
        type: 'directory',
        name: 'references',
        path: 'references',
        children: [{ type: 'file', name: 'guide.md', path: 'references/guide.md' }],
      },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(linkTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'docs/01-intro.md'
        ? '# Intro\n\n[Guide](../references/guide.md#target)'
        : '# Guide\n\n## Target';
      const file = new File([source], path.split('/').at(-1) ?? path, { type: 'text/markdown' });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Intro' })).not.toHaveLength(0));

    await user.click(screen.getByRole('link', { name: 'Guide' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Guide' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(directoryHandle, 'references/guide.md');
  });

  it('opens URL-encoded Chinese relative document links using decoded file paths', async () => {
    const user = userEvent.setup();
    const linkTree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: '业务需求基线说明书.md', path: '业务需求基线说明书.md' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(linkTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'README.md'
        ? '# Index\n\n[业务需求基线说明书](%E4%B8%9A%E5%8A%A1%E9%9C%80%E6%B1%82%E5%9F%BA%E7%BA%BF%E8%AF%B4%E6%98%8E%E4%B9%A6.md)'
        : '# 业务需求基线说明书';
      const file = new File([source], path.split('/').at(-1) ?? path, { type: 'text/markdown' });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Index' })).not.toHaveLength(0));

    await user.click(screen.getByRole('link', { name: '业务需求基线说明书' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: '业务需求基线说明书' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(directoryHandle, '业务需求基线说明书.md');
  });

  it('does not open root-relative Markdown links through the authorized folder', async () => {
    const user = userEvent.setup();
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'docs/01-intro.md'
        ? '# Intro\n\n[Root Guide](/references/guide.md)'
        : '# Should not open';
      const file = new File([source], path.split('/').at(-1) ?? path, { type: 'text/markdown' });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Intro' })).not.toHaveLength(0));
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockClear();

    const rootRelativeLink = screen.getByRole('link', { name: 'Root Guide' });
    rootRelativeLink.addEventListener('click', (event) => event.preventDefault());
    await user.click(rootRelativeLink);

    expect(fileSystemAccess.readDocumentFileSnapshot).not.toHaveBeenCalled();
  });

  it('keeps the file drawer docked when the reading area is clicked', async () => {
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

    expect(screen.getByLabelText('文件列表')).toBeInTheDocument();
    expect(contentClick).toHaveBeenCalledOnce();
  });

  it('removes the closed file drawer text from the page and keeps the docked drawer open while selecting files', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    expect(screen.queryByRole('button', { name: '02-design.md' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByRole('button', { name: '02-design.md' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '02-design.md' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));
    expect(screen.getByRole('button', { name: '02-design.md' })).toBeInTheDocument();
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

  it('opens AI project directories inline in the AI project workspace', async () => {
    const user = userEvent.setup();
    const projectHandle = { kind: 'directory', name: 'md-viewer' } as FileSystemDirectoryHandle;
    const aiTree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
    ];
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'md-viewer',
    };

    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {
        codex: {
          provider: 'codex',
          rootHandle: { kind: 'directory', name: '.codex' } as FileSystemDirectoryHandle,
          rootName: '.codex',
          scannedAt: 123,
          projectCount: 1,
        },
      },
      projects: [project],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(aiTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path.split('/').at(-1) ?? path, { type: 'text/markdown' });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(screen.getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/md-viewer'));

    const drawer = screen.getByLabelText('文件列表');
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: 'README.md' })).toHaveAttribute('aria-current', 'page'),
    );
    expect(drawer).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'guide.md' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/guide.md' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(projectHandle, 'docs/guide.md');
  });

  it('keeps previously opened AI project trees visible after opening another project', async () => {
    const user = userEvent.setup();
    const projectHandleA = { kind: 'directory', name: 'alpha' } as FileSystemDirectoryHandle;
    const projectHandleB = { kind: 'directory', name: 'beta' } as FileSystemDirectoryHandle;
    const projectA = {
      id: 'codex:/Users/qiyu/Github/alpha',
      provider: 'codex' as const,
      name: 'alpha',
      expectedPath: '/Users/qiyu/Github/alpha',
      discoveredAt: 123,
      directoryHandle: projectHandleA,
      directoryName: 'alpha',
    };
    const projectB = {
      id: 'claude:/Users/qiyu/Github/beta',
      provider: 'claude' as const,
      name: 'beta',
      expectedPath: '/Users/qiyu/Github/beta',
      discoveredAt: 456,
      directoryHandle: projectHandleB,
      directoryName: 'beta',
    };

    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [projectA, projectB],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce([{ type: 'file', name: 'alpha.md', path: 'alpha.md' }])
      .mockResolvedValueOnce([{ type: 'file', name: 'beta.md', path: 'beta.md' }]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });
      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(screen.getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/alpha'));
    await waitFor(() => expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'alpha.md' })).toBeInTheDocument());

    await user.click(screen.getByTitle('/Users/qiyu/Github/beta'));

    const drawer = screen.getByLabelText('文件列表');
    await waitFor(() => expect(within(drawer).getByRole('button', { name: 'beta.md' })).toBeInTheDocument());
    expect(within(drawer).getByRole('button', { name: 'alpha.md' })).toBeInTheDocument();
  });

  it('keeps folder and AI project reading sessions independent when switching tabs', async () => {
    const user = userEvent.setup();
    const folderHandle = { kind: 'directory', name: 'Folder Docs' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const folderTree: FileTreeNode[] = [
      { type: 'file', name: 'folder-a.md', path: 'folder-a.md' },
      { type: 'file', name: 'folder-b.md', path: 'folder-b.md' },
    ];
    const projectTree: FileTreeNode[] = [
      { type: 'file', name: 'project-a.md', path: 'project-a.md' },
      { type: 'file', name: 'project-b.md', path: 'project-b.md' },
    ];
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };

    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(folderHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce(folderTree)
      .mockResolvedValueOnce(projectTree);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });
      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-a.md' })).not.toHaveLength(0));
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'folder-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));

    const folderDrawer = screen.getByLabelText('文件列表');
    expect(within(folderDrawer).getByRole('button', { name: 'folder-a.md' })).toBeInTheDocument();
    expect(within(folderDrawer).getByRole('button', { name: 'folder-b.md' })).toHaveAttribute('aria-current', 'page');
    expect(within(folderDrawer).queryByRole('button', { name: 'project-a.md' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(folderDrawer).getByRole('tab', { name: 'AI 项目' }));

    const aiDrawer = screen.getByLabelText('文件列表');
    expect(within(aiDrawer).getByRole('button', { name: 'project-a.md' })).toBeInTheDocument();
    expect(within(aiDrawer).getByRole('button', { name: 'project-b.md' })).toHaveAttribute('aria-current', 'page');
    expect(within(aiDrawer).queryByRole('button', { name: 'folder-a.md' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(projectHandle, 'project-b.md');
  });

  it('keeps the AI project session after opening another folder and restores the project active file', async () => {
    const user = userEvent.setup();
    const firstFolderHandle = { kind: 'directory', name: 'First Folder' } as FileSystemDirectoryHandle;
    const secondFolderHandle = { kind: 'directory', name: 'Second Folder' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };

    vi.mocked(fileSystemAccess.openDirectory)
      .mockResolvedValueOnce(firstFolderHandle)
      .mockResolvedValueOnce(secondFolderHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce([{ type: 'file', name: 'folder-a.md', path: 'folder-a.md' }])
      .mockResolvedValueOnce([
        { type: 'file', name: 'project-a.md', path: 'project-a.md' },
        { type: 'file', name: 'project-b.md', path: 'project-b.md' },
      ])
      .mockResolvedValueOnce([{ type: 'file', name: 'folder-c.md', path: 'folder-c.md' }]);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });
      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-a.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-c.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(projectHandle, 'project-b.md');
  });

  it('reopens an AI project at its previous active file instead of the default document', async () => {
    const user = userEvent.setup();
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };

    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: 'project-b.md', path: 'project-b.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });
      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'README.md' })).not.toHaveLength(0));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    await user.click(screen.getByTitle('/Users/qiyu/Github/ai-docs'));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(projectHandle, 'project-b.md');
  });

  it('ignores stale async tab restore results when switching sources quickly', async () => {
    const user = userEvent.setup();
    const folderHandle = { kind: 'directory', name: 'Folder Docs' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };
    let resolveProjectRestore: (() => void) | null = null;

    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(folderHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce([{ type: 'file', name: 'folder-b.md', path: 'folder-b.md' }])
      .mockResolvedValueOnce([{ type: 'file', name: 'project-b.md', path: 'project-b.md' }]);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (handle, path) => {
      if (handle === projectHandle && path === 'project-b.md') {
        await new Promise<void>((resolve) => {
          resolveProjectRestore = resolve;
        });
      }

      const file = new File([`# ${path}`], path, { type: 'text/markdown' });
      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(resolveProjectRestore).toBeTypeOf('function'));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    const finishProjectRestore = resolveProjectRestore as (() => void) | null;
    if (!finishProjectRestore) {
      throw new Error('Project restore was not started.');
    }
    finishProjectRestore();

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));
    expect(screen.queryByRole('heading', { name: 'project-b.md' })).not.toBeInTheDocument();
  });

  it('does not let a stale normal document open close the current large document session', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['# Big\ncontent'.padEnd(2 * 1024 * 1024, 'x')], 'z-big.md', {
      type: 'text/markdown',
    });
    let resolveNormalSample: ((source: string) => void) | null = null;

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'a-normal.md', path: 'a-normal.md' },
      { type: 'file', name: 'z-big.md', path: 'z-big.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'z-big.md' ? '# Big\ncontent' : '# Normal';
      const file = path === 'z-big.md'
        ? largeFile
        : new File([source], path, { type: 'text/markdown' });

      return {
        path,
        name: path,
        size: file.size,
        type: 'text/markdown',
        lastModified: file.lastModified,
        file,
      };
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockImplementation(async (file) => {
      if (file instanceof File && file.name === 'a-normal.md') {
        return new Promise<string>((resolve) => {
          resolveNormalSample = resolve;
        });
      }

      return '# Big\n';
    });
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'z-big.md',
      size: largeFile.size,
      lineCount: 500,
      lineStarts: [0, 6],
      title: 'Big',
      outline: [],
      warnings: [],
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(resolveNormalSample).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'z-big.md' }));
    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());

    const finishNormalSample = resolveNormalSample as ((source: string) => void) | null;
    if (!finishNormalSample) {
      throw new Error('Normal document sample was not requested.');
    }
    await act(async () => {
      finishNormalSample('# Normal');
    });

    expect(screen.getByText('大文件安全模式')).toBeInTheDocument();
    expect(largeDocumentClient.terminate).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Normal' })).not.toBeInTheDocument();
  });

  it('keeps a standalone file open when an older folder request finishes later', async () => {
    const user = userEvent.setup();
    let resolveFolderSample: ((source: string) => void) | null = null;

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'folder.md', path: 'folder.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File(['# Folder'], path, { type: 'text/markdown' });

      return {
        path,
        name: path,
        size: file.size,
        type: 'text/markdown',
        lastModified: file.lastModified,
        file,
      };
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockImplementation(async (file) => {
      if (file instanceof File && file.name === 'folder.md') {
        return new Promise<string>((resolve) => {
          resolveFolderSample = resolve;
        });
      }

      return '# Standalone';
    });
    const standalone = new File(['# Standalone'], 'standalone.md', { type: 'text/markdown' });
    vi.mocked(fileSystemAccess.openDocumentFile).mockResolvedValue({
      path: 'standalone.md',
      name: 'standalone.md',
      size: standalone.size,
      type: standalone.type,
      lastModified: standalone.lastModified,
      file: standalone,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(resolveFolderSample).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: '打开文件' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Standalone' })).toBeInTheDocument());

    const finishFolderSample = resolveFolderSample as ((source: string) => void) | null;
    if (!finishFolderSample) {
      throw new Error('Folder document sample was not requested.');
    }
    await act(async () => {
      finishFolderSample('# Folder');
    });

    expect(screen.getByRole('heading', { name: 'Standalone' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Folder' })).not.toBeInTheDocument();
  });

  it('does not let a stale AI project scan reopen over a newer standalone document', async () => {
    const user = userEvent.setup();
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };
    let resolveProjectScan: ((tree: FileTreeNode[]) => void) | null = null;

    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockImplementation(async (handle) => {
      if (handle === projectHandle) {
        return new Promise<FileTreeNode[]>((resolve) => {
          resolveProjectScan = resolve;
        });
      }

      return tree;
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });

      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });
    const standalone = new File(['# Standalone'], 'standalone.md', { type: 'text/markdown' });
    vi.mocked(fileSystemAccess.openDocumentFile).mockResolvedValue({
      path: 'standalone.md',
      name: 'standalone.md',
      size: standalone.size,
      type: standalone.type,
      lastModified: standalone.lastModified,
      file: standalone,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(resolveProjectScan).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: '打开文件' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Standalone' })).toBeInTheDocument());

    const finishProjectScan = resolveProjectScan as ((tree: FileTreeNode[]) => void) | null;
    if (!finishProjectScan) {
      throw new Error('Project scan was not started.');
    }
    await act(async () => {
      finishProjectScan([{ type: 'file', name: 'project.md', path: 'project.md' }]);
    });

    expect(screen.getByRole('heading', { name: 'Standalone' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'project.md' })).not.toBeInTheDocument();
  });

  it('does not let a stale empty folder scan close the current large document session', async () => {
    const user = userEvent.setup();
    const staleFolderHandle = { kind: 'directory', name: 'Empty Folder' } as FileSystemDirectoryHandle;
    const currentFolderHandle = { kind: 'directory', name: 'Current Folder' } as FileSystemDirectoryHandle;
    const largeFile = new File(['# Big\ncontent'.padEnd(2 * 1024 * 1024, 'x')], 'big.md', {
      type: 'text/markdown',
    });
    let resolveEmptyScan: ((tree: FileTreeNode[]) => void) | null = null;

    vi.mocked(fileSystemAccess.openDirectory)
      .mockResolvedValueOnce(staleFolderHandle)
      .mockResolvedValueOnce(currentFolderHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockImplementation(async (handle) => {
      if (handle === staleFolderHandle) {
        return new Promise<FileTreeNode[]>((resolve) => {
          resolveEmptyScan = resolve;
        });
      }

      return [{ type: 'file', name: 'big.md', path: 'big.md' }];
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'big.md',
      name: 'big.md',
      size: largeFile.size,
      type: 'text/markdown',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# Big\n');
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'big.md',
      size: largeFile.size,
      lineCount: 500,
      lineStarts: [0, 6],
      title: 'Big',
      outline: [],
      warnings: [],
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(resolveEmptyScan).toBeTypeOf('function'));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());

    const finishEmptyScan = resolveEmptyScan as ((tree: FileTreeNode[]) => void) | null;
    if (!finishEmptyScan) {
      throw new Error('Empty folder scan was not started.');
    }
    await act(async () => {
      finishEmptyScan([]);
    });

    expect(screen.getByText('大文件安全模式')).toBeInTheDocument();
    expect(largeDocumentClient.terminate).not.toHaveBeenCalled();
  });

  it('does not let a stale markdown reload overwrite a newer active document', async () => {
    const user = userEvent.setup();
    let holdReload = false;
    let resolveReload: (() => void) | null = null;

    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      if (holdReload && path === 'docs/01-intro.md') {
        await new Promise<void>((resolve) => {
          resolveReload = resolve;
        });
        const file = new File(['# Reloaded first document'], path, { type: 'text/markdown' });

        return {
          path,
          name: path,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file,
        };
      }

      const file = new File([`# ${path}`], path, { type: 'text/markdown' });

      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    holdReload = true;
    await user.click(screen.getByRole('button', { name: '重载' }));
    await waitFor(() => expect(resolveReload).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: '下一个' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));

    const finishReload = resolveReload as (() => void) | null;
    if (!finishReload) {
      throw new Error('Reload was not started.');
    }
    await act(async () => {
      finishReload();
    });

    expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Reloaded first document' })).not.toBeInTheDocument();
  });

  it('clears the reader when opening an AI project with no readable documents', async () => {
    const user = userEvent.setup();
    const projectHandle = { kind: 'directory', name: 'Empty AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/empty-ai-docs',
      provider: 'codex' as const,
      name: 'Empty AI Docs',
      expectedPath: '/Users/qiyu/Github/empty-ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'Empty AI Docs',
    };

    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce(tree)
      .mockResolvedValueOnce([]);

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/empty-ai-docs'));

    await waitFor(() => expect(screen.getByText('这个项目目录里没有找到 Markdown 或 HTML 文件。')).toBeInTheDocument());
    expect(screen.queryAllByRole('heading', { name: 'docs/01-intro.md' })).toHaveLength(0);
    expect(screen.getByRole('heading', { name: '打开本地文件夹' })).toBeInTheDocument();
  });

  it('keeps manually expanded folder and AI project branches independent across drawer tabs', async () => {
    const user = userEvent.setup();
    const folderHandle = { kind: 'directory', name: 'Folder Docs' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const folderTree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'folder-docs',
        path: 'folder-docs',
        children: [{ type: 'file', name: 'folder-a.md', path: 'folder-docs/folder-a.md' }],
      },
      {
        type: 'directory',
        name: 'folder-notes',
        path: 'folder-notes',
        children: [{ type: 'file', name: 'note.md', path: 'folder-notes/note.md' }],
      },
    ];
    const projectTree: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'project-docs',
        path: 'project-docs',
        children: [{ type: 'file', name: 'project-a.md', path: 'project-docs/project-a.md' }],
      },
      {
        type: 'directory',
        name: 'project-notes',
        path: 'project-notes',
        children: [{ type: 'file', name: 'project-note.md', path: 'project-notes/project-note.md' }],
      },
    ];
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };

    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(folderHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory)
      .mockResolvedValueOnce(folderTree)
      .mockResolvedValueOnce(projectTree);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });
      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-docs/folder-a.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByText('folder-notes'));
    expect(within(screen.getByLabelText('文件列表')).getByText('folder-notes').closest('details')).toHaveAttribute('open');

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-docs/project-a.md' })).not.toHaveLength(0));
    await user.click(within(screen.getByLabelText('文件列表')).getByText('project-notes'));
    expect(within(screen.getByLabelText('文件列表')).getByText('project-notes').closest('details')).toHaveAttribute('open');

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-docs/folder-a.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByText('folder-notes').closest('details')).toHaveAttribute('open');

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-docs/project-a.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByText('project-notes').closest('details')).toHaveAttribute('open');
  });

  it('opens HTML files from the authorized folder in a raw iframe preview with scripts enabled', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: 'report.html', path: 'report.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'report.html'
        ? '<!doctype html><html><head><title>Report</title><script src="app.js"></script></head><body><h1>Report</h1><h2>Section</h2></body></html>'
        : `# ${path}`;
      const type = path === 'report.html' ? 'text/html' : 'text/markdown';
      const file = new File([source], path, { type });
      return {
        path,
        name: path,
        size: file.size,
        type,
        lastModified: file.lastModified,
        file,
      };
    });
    vi.mocked(fileSystemAccess.readAssetFile).mockImplementation(async (_handle, path) =>
      path === 'app.js' ? new File(['window.reportLoaded = true'], 'app.js', { type: 'text/javascript' }) : null,
    );

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'README.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'report.html' }));

    const preview = await screen.findByTitle('HTML 预览：report.html');
    expect(preview).toBeInstanceOf(HTMLIFrameElement);
    expect(preview).toHaveAttribute('src', 'blob:preview-url');
    expect(preview).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals');
    expect(fileSystemAccess.readAssetFile).toHaveBeenCalledWith(directoryHandle, 'app.js');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(within(screen.getByRole('article')).queryByRole('heading', { name: 'Report' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一个' })).toHaveAttribute('title', '上一个文件：README.md');
    expect(screen.getByLabelText('文档大纲')).toHaveTextContent('Section');
    expect(fileSystemAccess.readMarkdownFileSlice).toHaveBeenCalledTimes(1);
  });

  it('keeps drawer resizing active while the pointer crosses an HTML iframe preview', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: 'report.html', path: 'report.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'report.html' ? '<!doctype html><h1>Report</h1>' : `# ${path}`;
      const type = path === 'report.html' ? 'text/html' : 'text/markdown';
      const file = new File([source], path, { type });
      return {
        path,
        name: path,
        size: file.size,
        type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'README.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'report.html' }));

    const preview = await screen.findByTitle('HTML 预览：report.html');
    const shell = screen.getByLabelText('文件列表').parentElement;
    const separator = screen.getByRole('separator', { name: '调整文件面板宽度' });

    fireEvent.pointerDown(separator, { clientX: 360 });

    await waitFor(() => expect(shell).toHaveClass('is-resizing-file-drawer'));
    expect(preview).toHaveClass('html-preview');

    fireEvent.pointerMove(window, { clientX: 480 });

    expect(shell).toHaveStyle({ '--file-drawer-width': '480px' });

    fireEvent.pointerUp(window);

    await waitFor(() => expect(shell).not.toHaveClass('is-resizing-file-drawer'));
  });

  it('opens a temporary standalone Markdown file without overwriting the remembered directory document', async () => {
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue({
      url: 'file:///Users/qiyu/Desktop/Temporary.md',
      name: 'Temporary.md',
      createdAt: 123,
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('# Temporary document')));
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');

    render(<App />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Temporary document' })).toBeInTheDocument());
    expect(screen.queryByLabelText('文件列表')).not.toBeInTheDocument();
    expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
    expect(recentDocument.saveLastDocument).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('preserves folder and AI project sessions after a delayed temporary document opens', async () => {
    const user = userEvent.setup();
    const folderHandle = { kind: 'directory', name: 'Folder Docs' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };
    let resolveTemporaryDocument:
      | ((document: Awaited<ReturnType<typeof temporaryDocument.consumeTemporaryMarkdownDocument>>) => void)
      | null = null;

    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTemporaryDocument = resolve;
        }),
    );
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(folderHandle);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockImplementation(async (handle) => {
      if (handle === folderHandle) {
        return [
          { type: 'file', name: 'folder-a.md', path: 'folder-a.md' },
          { type: 'file', name: 'folder-b.md', path: 'folder-b.md' },
        ];
      }

      if (handle === projectHandle) {
        return [
          { type: 'file', name: 'project-a.md', path: 'project-a.md' },
          { type: 'file', name: 'project-b.md', path: 'project-b.md' },
        ];
      }

      return tree;
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });

      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);
    await waitFor(() => expect(resolveTemporaryDocument).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-a.md' })).not.toHaveLength(0));
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'folder-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    const finishTemporaryDocument = resolveTemporaryDocument as
      | ((document: Awaited<ReturnType<typeof temporaryDocument.consumeTemporaryMarkdownDocument>>) => void)
      | null;
    if (!finishTemporaryDocument) {
      throw new Error('Temporary document was not requested.');
    }
    await act(async () => {
      finishTemporaryDocument({
        url: 'file:///Users/qiyu/Desktop/Temporary.md',
        name: 'Temporary.md',
        source: '# Temporary document',
        createdAt: 123,
      });
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Temporary document' })).toBeInTheDocument());

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'folder-b.md' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('preserves folder and AI project sessions when a delayed temporary document needs authorization', async () => {
    const user = userEvent.setup();
    const folderHandle = { kind: 'directory', name: 'Folder Docs' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/ai-docs',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/Users/qiyu/Github/ai-docs',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
    };
    let resolveTemporaryDocument:
      | ((document: Awaited<ReturnType<typeof temporaryDocument.consumeTemporaryMarkdownDocument>>) => void)
      | null = null;

    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTemporaryDocument = resolve;
        }),
    );
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(folderHandle);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockImplementation(async (handle) => {
      if (handle === folderHandle) {
        return [
          { type: 'file', name: 'folder-a.md', path: 'folder-a.md' },
          { type: 'file', name: 'folder-b.md', path: 'folder-b.md' },
        ];
      }

      if (handle === projectHandle) {
        return [
          { type: 'file', name: 'project-a.md', path: 'project-a.md' },
          { type: 'file', name: 'project-b.md', path: 'project-b.md' },
        ];
      }

      return tree;
    });
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([`# ${path}`], path, { type: 'text/markdown' });

      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    render(<App />);
    await waitFor(() => expect(resolveTemporaryDocument).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-a.md' })).not.toHaveLength(0));
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'folder-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    const finishTemporaryDocument = resolveTemporaryDocument as
      | ((document: Awaited<ReturnType<typeof temporaryDocument.consumeTemporaryMarkdownDocument>>) => void)
      | null;
    if (!finishTemporaryDocument) {
      throw new Error('Temporary document was not requested.');
    }
    await act(async () => {
      finishTemporaryDocument({
        url: 'file:///Users/qiyu/Desktop/huge.md',
        name: 'huge.md',
        sourceAvailable: false,
        sourceSize: 108 * 1024 * 1024,
        createdAt: 123,
      });
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          '这个临时 Markdown 文件太大，浏览器无法从当前页面安全传递完整内容。请通过“打开文件”或“打开文件夹”授权读取后继续阅读。',
        ),
      ).toBeInTheDocument(),
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'folder-b.md' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(within(screen.getByLabelText('文件列表')).getByRole('button', { name: 'project-b.md' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens standalone HTML files from the file picker', async () => {
    const user = userEvent.setup();
    const selected = new File(['<html><body><h1>Standalone HTML</h1></body></html>'], 'standalone.html', {
      type: 'text/html',
    });

    vi.mocked(fileSystemAccess.openDocumentFile).mockResolvedValue({
      path: 'standalone.html',
      name: 'standalone.html',
      size: selected.size,
      type: selected.type,
      lastModified: selected.lastModified,
      file: selected,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '打开文件' }));

    await waitFor(() => expect(screen.getByTitle('HTML 预览：standalone.html')).toBeInTheDocument());
    expect(screen.getByTitle('HTML 预览：standalone.html')).toHaveAttribute('src', 'blob:preview-url');
    expect(fileSystemAccess.readMarkdownFileSlice).not.toHaveBeenCalled();
    expect(recentDocument.saveLastDocument).not.toHaveBeenCalled();
  });

  it('opens large directory documents without full markdown rendering', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['# Big\n'.padEnd(2 * 1024 * 1024, 'x')], 'big.md', {
      type: 'text/markdown',
    });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'big.md', path: 'big.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'big.md',
      name: 'big.md',
      size: largeFile.size,
      type: 'text/markdown',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# Big\n');

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());
    expect(fileSystemAccess.readDocumentFile).not.toHaveBeenCalled();
  });

  it('asks for file authorization when a temporary standalone file is too large to inline', async () => {
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue({
      url: 'file:///Users/qiyu/Desktop/huge.md',
      name: 'huge.md',
      sourceSize: 108 * 1024 * 1024,
      sourceAvailable: false,
      createdAt: 123,
    });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText(
          '这个临时 Markdown 文件太大，浏览器无法从当前页面安全传递完整内容。请通过“打开文件”或“打开文件夹”授权读取后继续阅读。',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: '打开文件' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('asks for file authorization when a temporary standalone source is empty and unavailable', async () => {
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue({
      url: 'file:///Users/qiyu/Desktop/huge.md',
      name: 'huge.md',
      sourceSize: 0,
      sourceAvailable: false,
      createdAt: 123,
    });
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText(
          '这个临时 Markdown 文件太大，浏览器无法从当前页面安全传递完整内容。请通过“打开文件”或“打开文件夹”授权读取后继续阅读。',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: '打开文件' })).toBeInTheDocument();
  });

  it('does not fetch omitted temporary source when the recorded file is large', async () => {
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue({
      url: 'file:///Users/qiyu/Desktop/huge.md',
      name: 'huge.md',
      sourceSize: 108 * 1024 * 1024,
      createdAt: 123,
    });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.resolve(new Response('# Huge'))));
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText(
          '这个临时 Markdown 文件太大，浏览器无法从当前页面安全传递完整内容。请通过“打开文件”或“打开文件夹”授权读取后继续阅读。',
        ),
      ).toBeInTheDocument(),
    );
    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('terminates the large document worker when indexing fails', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['# Big\n'.padEnd(2 * 1024 * 1024, 'x')], 'big.md', {
      type: 'text/markdown',
    });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'big.md', path: 'big.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'big.md',
      name: 'big.md',
      size: largeFile.size,
      type: 'text/markdown',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# Big\n');
    largeDocumentClient.buildIndex.mockRejectedValueOnce(new Error('index failed'));

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getByText('index failed')).toBeInTheDocument());
    expect(largeDocumentClient.terminate).toHaveBeenCalled();
  });

  it('navigates large document outline items by line window', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['# Big\n## Deep\ncontent'.padEnd(2 * 1024 * 1024, 'x')], 'big.md', {
      type: 'text/markdown',
    });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'big.md', path: 'big.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'big.md',
      name: 'big.md',
      size: largeFile.size,
      type: 'text/markdown',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# Big\n');
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'big.md',
      size: largeFile.size,
      lineCount: 500,
      lineStarts: Array.from({ length: 500 }, (_value, index) => index * 20),
      title: 'Big',
      outline: [{ id: 'deep', text: 'Deep', depth: 2, line: 240, children: [] }],
      warnings: [],
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());

    await user.click(within(screen.getByLabelText('文档大纲')).getByRole('button', { name: 'Deep' }));

    await waitFor(() =>
      expect(largeDocumentClient.readLines).toHaveBeenLastCalledWith(expect.any(File), expect.any(Object), {
        startLine: 240,
        endLine: 500,
      }),
    );
  });

  it('reloads large documents through the large-file path and keeps the current line window', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['# Big\ncontent'.padEnd(2 * 1024 * 1024, 'x')], 'big.md', {
      type: 'text/markdown',
    });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'big.md', path: 'big.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'big.md',
      name: 'big.md',
      size: 60 * 1024 * 1024,
      type: 'text/markdown',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# Big\n');
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'big.md',
      size: 60 * 1024 * 1024,
      lineCount: 500,
      lineStarts: [0, 6],
      title: 'Big',
      outline: [],
      warnings: [],
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() =>
      expect(largeDocumentClient.readLines).toHaveBeenLastCalledWith(expect.any(File), expect.any(Object), {
        startLine: 121,
        endLine: 361,
      }),
    );

    await user.click(screen.getByRole('button', { name: '重载' }));

    await waitFor(() => expect(largeDocumentClient.buildIndex).toHaveBeenCalledTimes(2));
    expect(largeDocumentClient.readLines).toHaveBeenLastCalledWith(expect.any(File), expect.any(Object), {
      startLine: 121,
      endLine: 361,
    });
  });

  it('falls back to the remembered directory document after a consumed temporary document is refreshed', async () => {
    const rememberedRecord = {
      directoryHandle,
      directoryName: 'Docs',
      path: 'docs/02-design.md',
      updatedAt: 456,
    };
    vi.mocked(recentDocument.loadLastDocument).mockResolvedValue(rememberedRecord);
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue(null);
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');

    render(<App />);

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));
    expect(temporaryDocument.consumeTemporaryMarkdownDocument).toHaveBeenCalledWith('temp-1');
    expect(fileSystemAccess.scanMarkdownDirectory).toHaveBeenCalledWith(directoryHandle);
  });

  it('copies markdown source from raw mode inside the document page', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.click(screen.getByLabelText('原文'));
    await user.click(within(screen.getByRole('article')).getByRole('button', { name: '复制源码' }));

    expect(writeText).toHaveBeenCalledWith('# docs/01-intro.md');
    expect(screen.getByText('已复制')).toBeInTheDocument();
  });

  it('saves markdown source from raw mode beside the copy action', async () => {
    const user = userEvent.setup();
    const write = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const createWritable = vi.fn(async () => ({ write, close }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: showSaveFilePicker,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    await user.click(screen.getByLabelText('原文'));
    await user.click(within(screen.getByRole('article')).getByRole('button', { name: '另存为' }));

    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: '01-intro.md',
      }),
    );
    expect(write).toHaveBeenCalledWith('# docs/01-intro.md');
    expect(close).toHaveBeenCalled();
    expect(screen.getByText('已保存')).toBeInTheDocument();
  });
});
