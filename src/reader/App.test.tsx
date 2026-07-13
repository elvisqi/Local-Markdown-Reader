import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FileTreeNode, LazyFileTreeNode } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/settings';
import { App } from './App';
import * as aiProjects from './aiProjects';
import * as fileSystemAccess from './fileSystemAccess';
import * as recentDocument from './recentDocument';

vi.mock('./fileSystemAccess', async () => {
  const actual = await vi.importActual<typeof import('./fileSystemAccess')>('./fileSystemAccess');

  return {
    ...actual,
    createDirectoryScanSession: vi.fn(),
    hydrateDirectoryPath: vi.fn(),
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
    requestAiProjectDirectoryPermission: vi.fn(async () => true),
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

function isTestReaderHistoryState(value: unknown): value is { path: string; hash?: string } {
  return Boolean(value && typeof value === 'object' && (value as { marker?: unknown }).marker === 'local-markdown-reader');
}

function toLoadedLazyFileTree(nodes: FileTreeNode[]): LazyFileTreeNode[] {
  return nodes.map((node) => {
    if (node.type === 'file') {
      return {
        id: node.path,
        type: 'file',
        name: node.name,
        path: node.path,
      };
    }

    return {
      id: node.path,
      type: 'directory',
      name: node.name,
      path: node.path,
      loadState: 'loaded',
      children: toLoadedLazyFileTree(node.children),
    };
  });
}

function toHydratedLazySegments(nodes: FileTreeNode[], documentPath: string): Array<{ path: string; children: LazyFileTreeNode[] }> {
  const parts = documentPath.split('/').filter(Boolean);
  const segments: Array<{ path: string; children: LazyFileTreeNode[] }> = [
    { path: '', children: toLoadedLazyFileTree(nodes) },
  ];
  let currentNodes = nodes;
  const currentPath: string[] = [];

  for (const part of parts.slice(0, -1)) {
    currentPath.push(part);
    const directory = currentNodes.find((node) => node.type === 'directory' && node.name === part);
    if (!directory || directory.type !== 'directory') {
      break;
    }

    currentNodes = directory.children;
    segments.push({
      path: currentPath.join('/'),
      children: toLoadedLazyFileTree(currentNodes),
    });
  }

  return segments;
}

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
  let createdObjectUrlBlobs: Blob[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/reader.html');
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
    createdObjectUrlBlobs = [];
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      createdObjectUrlBlobs.push(blob as Blob);
      return 'blob:preview-url';
    });
    URL.revokeObjectURL = vi.fn();
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(tree);
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockImplementation((handle) => ({
      scanChildren: vi.fn(async (path) => {
        if (path) {
          return [];
        }

        return toLoadedLazyFileTree(await fileSystemAccess.scanMarkdownDirectory(handle));
      }),
    }));
    vi.mocked(fileSystemAccess.hydrateDirectoryPath).mockImplementation(async (_scanSession, path) =>
      toHydratedLazySegments(await fileSystemAccess.scanMarkdownDirectory(directoryHandle), path),
    );
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
    vi.mocked(aiProjects.requestAiProjectDirectoryPermission).mockResolvedValue(true);
    vi.mocked(aiProjects.saveAiProjectState).mockResolvedValue(undefined);
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStoredSettings(settings: unknown) {
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async () => ({ readerSettings: settings })),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  }

  async function readLatestObjectUrlBlobText(): Promise<string> {
    const blob = createdObjectUrlBlobs.at(-1);

    if (!blob) {
      throw new Error('No preview blob was created.');
    }

    return blob.text();
  }

  function expectHtmlPreviewPayloadHasNavigationLink(postMessage: ReturnType<typeof vi.fn>, linkId: string): void {
    const renderPayload = postMessage.mock.calls
      .map(([payload]) => payload)
      .find((payload) =>
        Boolean(payload && typeof payload === 'object' && (payload as { type?: unknown }).type === 'local-markdown-reader:render-html-preview'),
      ) as { html?: string } | undefined;

    expect(renderPayload?.html).toContain(`data-reader-link-id="${linkId}"`);
  }

  function getDrawerFileItem(name: string, drawer = screen.getByLabelText('文件列表')): HTMLElement {
    const drawerQueries = within(drawer);
    return drawerQueries.queryByRole('treeitem', { name }) ?? drawerQueries.getByRole('button', { name });
  }

  function queryDrawerFileItem(name: string, drawer = screen.queryByLabelText('文件列表')): HTMLElement | null {
    if (!drawer) {
      return null;
    }

    const drawerQueries = within(drawer);
    return drawerQueries.queryByRole('treeitem', { name }) ?? drawerQueries.queryByRole('button', { name });
  }

  it('restores drawer open state and width from local layout preferences without live cross-tab updates', async () => {
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: true, fileDrawerWidth: 420, outlineWidth: 180 }),
    );

    render(<App />);

    const drawer = screen.getByLabelText('文件列表');
    const shell = drawer.parentElement;

    expect(drawer).toBeInTheDocument();
    expect(shell).toHaveStyle({ '--file-drawer-width': '420px', '--outline-panel-width': '180px' });

    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 280, outlineWidth: 120 }),
    );
    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'localMarkdownReader.layoutPreferences',
        newValue: JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 280, outlineWidth: 120 }),
      }),
    );

    expect(screen.getByLabelText('文件列表')).toBeInTheDocument();
    expect(shell).toHaveStyle({ '--file-drawer-width': '420px', '--outline-panel-width': '180px' });
  });

  it('restores the default outline width from legacy layout preferences', async () => {
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: true, fileDrawerWidth: 420 }),
    );

    render(<App />);

    expect(screen.getByLabelText('文件列表').parentElement).toHaveStyle({
      '--file-drawer-width': '420px',
      '--outline-panel-width': '260px',
    });
  });

  it('clamps persisted side panel widths on narrow desktop screens', async () => {
    vi.stubGlobal('innerWidth', 960);
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: true, fileDrawerWidth: 640, outlineWidth: 420 }),
    );

    render(<App />);

    expect(screen.getByLabelText('文件列表').parentElement).toHaveStyle({
      '--file-drawer-width': '528px',
      '--outline-panel-width': '100px',
    });
  });

  it('keeps the hidden file drawer width from shrinking the visible outline on narrow desktop screens', async () => {
    vi.stubGlobal('innerWidth', 960);
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 640, outlineWidth: 260 }),
    );

    render(<App />);

    expect(screen.queryByLabelText('文件列表')).not.toBeInTheDocument();
    expect(screen.getByRole('main').parentElement).toHaveStyle({
      '--file-drawer-width': '540px',
      '--outline-panel-width': '260px',
    });
  });

  it('uses a single reading column when the outline is hidden', async () => {
    stubStoredSettings({
      ...DEFAULT_SETTINGS,
      reading: {
        ...DEFAULT_SETTINGS.reading,
        showOutline: false,
      },
    });
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 360, outlineWidth: 420 }),
    );

    render(<App />);

    await waitFor(() => expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument());
    expect(screen.getByRole('main')).not.toHaveClass('has-outline-panel');
  });

  it('does not reserve hidden outline width when opening the file drawer on narrow desktop screens', async () => {
    const user = userEvent.setup();

    stubStoredSettings({
      ...DEFAULT_SETTINGS,
      reading: {
        ...DEFAULT_SETTINGS.reading,
        showOutline: false,
      },
    });
    vi.stubGlobal('innerWidth', 960);
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 640, outlineWidth: 420 }),
    );

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));

    await waitFor(() => expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument());
    expect(screen.getByLabelText('文件列表').parentElement).toHaveStyle({
      '--file-drawer-width': '540px',
      '--outline-panel-width': '420px',
    });
  });

  it('does not shrink the saved outline width while the outline is hidden', async () => {
    const user = userEvent.setup();

    stubStoredSettings({
      ...DEFAULT_SETTINGS,
      reading: {
        ...DEFAULT_SETTINGS.reading,
        showOutline: false,
      },
    });
    vi.stubGlobal('innerWidth', 960);
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 640, outlineWidth: 420 }),
    );

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        fileDrawerOpen: true,
        fileDrawerWidth: 540,
        outlineWidth: 420,
      }),
    );
  });

  it('preserves the saved outline width when the outline is hidden and the drawer starts open', async () => {
    stubStoredSettings({
      ...DEFAULT_SETTINGS,
      reading: {
        ...DEFAULT_SETTINGS.reading,
        showOutline: false,
      },
    });
    vi.stubGlobal('innerWidth', 960);
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: true, fileDrawerWidth: 640, outlineWidth: 420 }),
    );

    render(<App />);

    await waitFor(() => expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        fileDrawerOpen: true,
        outlineWidth: 420,
      }),
    );
  });

  it('marks the reading layout as having an outline column when the outline is visible', async () => {
    render(<App />);

    expect(screen.getByRole('main')).toHaveClass('has-outline-panel');
    expect(screen.getByLabelText('文档大纲')).toBeInTheDocument();
  });

  it('normalizes side panel widths when reopening a hidden file drawer on narrow desktop screens', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('innerWidth', 960);
    window.localStorage.setItem(
      'localMarkdownReader.layoutPreferences',
      JSON.stringify({ fileDrawerOpen: false, fileDrawerWidth: 640, outlineWidth: 260 }),
    );

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByLabelText('文件列表').parentElement).toHaveStyle({
      '--file-drawer-width': '528px',
      '--outline-panel-width': '100px',
    });
  });

  it('opens a folder by scanning only root children', async () => {
    const user = userEvent.setup();
    const directoryHandle = { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle;
    const scanChildren = vi.fn().mockResolvedValue([
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ]);
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue({ scanChildren });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: /打开文件夹/ }));

    expect(fileSystemAccess.createDirectoryScanSession).toHaveBeenCalledWith(directoryHandle);
    expect(scanChildren).toHaveBeenCalledWith('');
    expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
  });

  it('loads a folder branch when the user expands it', async () => {
    const user = userEvent.setup();
    const directoryHandle = { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle;
    const scanChildren = vi.fn()
      .mockResolvedValueOnce([
        { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
      ])
      .mockResolvedValueOnce([
        { id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' },
      ]);
    vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue({ scanChildren });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: /打开文件夹/ }));
    await user.click(await screen.findByRole('treeitem', { name: 'docs' }));

    expect(scanChildren).toHaveBeenLastCalledWith('docs');
    expect(await screen.findByRole('treeitem', { name: 'guide.md' })).toBeInTheDocument();
  });

  it('restores the remembered folder document without recursively scanning the full directory', async () => {
    const record = {
      directoryHandle: { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle,
      directoryName: 'Docs',
      path: 'docs/guides/install.md',
      updatedAt: Date.now(),
      source: 'folder' as const,
    };
    const scanSession = { scanChildren: vi.fn() };
    const file = new File(['# Install'], 'install.md', { type: 'text/markdown' });
    vi.mocked(recentDocument.loadLastDocument).mockResolvedValue(record);
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue(scanSession);
    vi.mocked(fileSystemAccess.hydrateDirectoryPath).mockResolvedValue([
      {
        path: '',
        children: [{ id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs',
        children: [{ id: 'docs/guides', type: 'directory', name: 'guides', path: 'docs/guides', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs/guides',
        children: [{ id: 'docs/guides/install.md', type: 'file', name: 'install.md', path: 'docs/guides/install.md' }],
      },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'docs/guides/install.md',
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      file,
    });

    render(<App />);

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Install' })).not.toHaveLength(0));

    expect(fileSystemAccess.createDirectoryScanSession).toHaveBeenCalledWith(record.directoryHandle);
    expect(fileSystemAccess.hydrateDirectoryPath).toHaveBeenCalledWith(scanSession, 'docs/guides/install.md');
    expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
  });

  it('falls back to the default drawer layout when local layout preferences are malformed', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('localMarkdownReader.layoutPreferences', '{malformed-json');

    render(<App />);

    expect(screen.queryByLabelText('文件列表')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '文件' }));

    expect(screen.getByLabelText('文件列表').parentElement).toHaveStyle({
      '--file-drawer-width': '360px',
      '--outline-panel-width': '260px',
    });
  });

  it('saves drawer open state and resized width as local layout preferences', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));

    const separator = screen.getByRole('separator', { name: '调整文件面板宽度' });
    fireEvent.pointerDown(separator, { clientX: 360 });
    fireEvent.pointerMove(window, { clientX: 80 });
    fireEvent.pointerUp(window);

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        fileDrawerOpen: true,
        fileDrawerWidth: 100,
      }),
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '关闭文件面板' }));

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        fileDrawerOpen: false,
        fileDrawerWidth: 100,
      }),
    );
  });

  it('saves resized outline width as local layout preferences', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    const shell = screen.getByRole('main').parentElement;
    const separator = screen.getByRole('separator', { name: '调整文档大纲宽度' });

    fireEvent.pointerDown(separator, { clientX: 900 });

    await waitFor(() => expect(shell).toHaveClass('is-resizing-outline-panel'));

    fireEvent.pointerMove(window, { clientX: 1080 });

    expect(shell).toHaveStyle({ '--outline-panel-width': '100px' });

    fireEvent.pointerUp(window);

    await waitFor(() => expect(shell).not.toHaveClass('is-resizing-outline-panel'));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        outlineWidth: 100,
      }),
    );
  });

  it('keeps both side panels within the viewport during live file drawer resize on narrow desktop screens', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('innerWidth', 960);
    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));
    await user.click(screen.getByRole('button', { name: '文件' }));

    const shell = screen.getByRole('main').parentElement;
    const separator = screen.getByRole('separator', { name: '调整文件面板宽度' });

    fireEvent.pointerDown(separator, { clientX: 360 });
    fireEvent.pointerMove(window, { clientX: 640 });

    expect(shell).toHaveStyle({
      '--file-drawer-width': '528px',
      '--outline-panel-width': '100px',
    });

    fireEvent.pointerUp(window);
  });

  it('keeps both side panels within the viewport during live outline resize on narrow desktop screens', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('innerWidth', 960);
    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));
    await user.click(screen.getByRole('button', { name: '文件' }));

    const shell = screen.getByRole('main').parentElement;
    const separator = screen.getByRole('separator', { name: '调整文档大纲宽度' });

    fireEvent.pointerDown(separator, { clientX: 900 });
    fireEvent.pointerMove(window, { clientX: 740 });

    expect(shell).toHaveStyle({
      '--file-drawer-width': '208px',
      '--outline-panel-width': '420px',
    });

    fireEvent.pointerUp(window);
  });

  it('resizes the outline width with keyboard shortcuts', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));

    const shell = screen.getByRole('main').parentElement;
    const separator = screen.getByRole('separator', { name: '调整文档大纲宽度' });

    separator.focus();
    await user.keyboard('{ArrowLeft}');

    expect(shell).toHaveStyle({ '--outline-panel-width': '284px' });

    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowRight}');

    expect(shell).toHaveStyle({ '--outline-panel-width': '236px' });
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('localMarkdownReader.layoutPreferences') ?? '{}')).toMatchObject({
        outlineWidth: 236,
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

  it('reuses one preview tab, pins files on double-click, and restores the previous reading position', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' })).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' }).parentElement).toHaveAttribute('data-pinned', 'false');

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.dblClick(getDrawerFileItem('01-intro.md'));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' }).parentElement).toHaveAttribute('data-pinned', 'true'),
    );

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 480 });
    await user.click(getDrawerFileItem('02-design.md'));

    await waitFor(() => expect(screen.getByRole('tab', { name: '切换到 docs/02-design.md' })).toBeInTheDocument());
    expect(within(screen.getByRole('tablist', { name: '打开的文档' })).getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: '切换到 docs/02-design.md' }).parentElement).toHaveAttribute('data-pinned', 'false');

    await user.click(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 480, left: 0, behavior: 'instant' }),
    );
    expect(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' })).toHaveAttribute('aria-selected', 'true');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('replaces the preview tab on single-click and preserves fixed tabs', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(getDrawerFileItem('02-design.md'));

    await waitFor(() => expect(screen.getByRole('tab', { name: '切换到 docs/02-design.md' })).toBeInTheDocument());
    expect(screen.queryByRole('tab', { name: '切换到 docs/01-intro.md' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('tablist', { name: '打开的文档' })).getAllByRole('tab')).toHaveLength(1);

    await user.dblClick(getDrawerFileItem('02-design.md'));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '切换到 docs/02-design.md' }).parentElement).toHaveAttribute('data-pinned', 'true'),
    );

    await user.click(getDrawerFileItem('03-api.md'));

    await waitFor(() => expect(screen.getByRole('tab', { name: '切换到 docs/03-api.md' })).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '切换到 docs/02-design.md' }).parentElement).toHaveAttribute('data-pinned', 'true');
    expect(screen.getByRole('tab', { name: '切换到 docs/03-api.md' }).parentElement).toHaveAttribute('data-pinned', 'false');
    expect(within(screen.getByRole('tablist', { name: '打开的文档' })).getAllByRole('tab')).toHaveLength(2);
  });

  it('closes the active document tab and switches to its neighbor', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.dblClick(getDrawerFileItem('01-intro.md'));
    await user.click(getDrawerFileItem('02-design.md'));
    await waitFor(() => expect(screen.getByRole('tab', { name: '切换到 docs/02-design.md' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '关闭 docs/02-design.md' }));

    await waitFor(() => expect(screen.queryByRole('tab', { name: '切换到 docs/02-design.md' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0));
    expect(screen.getByRole('tab', { name: '切换到 docs/01-intro.md' })).toHaveAttribute('aria-selected', 'true');
  });

  it('prints the current reader content from the toolbar', async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal('print', print);

    render(<App />);

    await user.click(screen.getByRole('button', { name: '打印' }));

    expect(print).toHaveBeenCalledOnce();
  });

  it('opens a single dropped Markdown file as a standalone document', async () => {
    const droppedFile = new File(['# Dropped document'], 'dropped.md', { type: 'text/markdown' });

    render(<App />);

    fireEvent.drop(screen.getByText('打开本地文件夹').closest('.reader-app')!, {
      dataTransfer: {
        files: [droppedFile],
        items: [
          {
            kind: 'file',
            getAsFile: () => droppedFile,
          },
        ],
      },
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dropped document' })).toBeInTheDocument());
    expect(recentDocument.saveLastDocument).not.toHaveBeenCalled();
  });

  it('shows an error when a dropped file is not a readable document', async () => {
    const droppedFile = new File(['not a document'], 'image.png', { type: 'image/png' });

    render(<App />);

    fireEvent.drop(screen.getByText('打开本地文件夹').closest('.reader-app')!, {
      dataTransfer: {
        files: [droppedFile],
        items: [
          {
            kind: 'file',
            getAsFile: () => droppedFile,
          },
        ],
      },
    });

    await waitFor(() => expect(screen.getByText('请拖入一个 Markdown、HTML、JSON、JSONL 或 YAML 文件。')).toBeInTheDocument());
  });

  it('shows an error when multiple files are dropped together', async () => {
    const firstFile = new File(['# One'], 'one.md', { type: 'text/markdown' });
    const secondFile = new File(['# Two'], 'two.md', { type: 'text/markdown' });

    render(<App />);

    fireEvent.drop(screen.getByText('打开本地文件夹').closest('.reader-app')!, {
      dataTransfer: {
        files: [firstFile, secondFile],
        items: [
          {
            kind: 'file',
            getAsFile: () => firstFile,
          },
          {
            kind: 'file',
            getAsFile: () => secondFile,
          },
        ],
      },
    });

    await waitFor(() => expect(screen.getByText('一次只能拖入一个文件。')).toBeInTheDocument());
  });

  it('opens relative document links inside rendered Markdown using the authorized folder', async () => {
    const user = userEvent.setup();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
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
    expect(pushStateSpy).toHaveBeenCalled();
    const linkedDocumentState = pushStateSpy.mock.calls
      .map(([state]) => state)
      .find((state) => isTestReaderHistoryState(state) && state.path === 'references/guide.md');

    expect(linkedDocumentState).toMatchObject({ path: 'references/guide.md', hash: 'target' });

    const previousDocumentState = replaceStateSpy.mock.calls
      .map(([state]) => state)
      .find((state) => isTestReaderHistoryState(state) && state.path === 'docs/01-intro.md');

    expect(previousDocumentState).toMatchObject({ path: 'docs/01-intro.md' });

    fireEvent(window, new PopStateEvent('popstate', { state: previousDocumentState }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Intro' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(directoryHandle, 'docs/01-intro.md');

    fireEvent(window, new PopStateEvent('popstate', { state: linkedDocumentState }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Guide' })).not.toHaveLength(0));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
  });

  it('opens relative document links into unloaded lazy branches by hydrating the target path', async () => {
    const user = userEvent.setup();
    const scanSession = {
      scanChildren: vi.fn(async (path: string) => {
        if (path === '') {
          return [
            { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
            {
              id: 'references',
              type: 'directory',
              name: 'references',
              path: 'references',
              children: [],
              loadState: 'unloaded',
            },
          ] satisfies LazyFileTreeNode[];
        }

        if (path === 'docs') {
          return [
            { id: 'docs/01-intro.md', type: 'file', name: '01-intro.md', path: 'docs/01-intro.md' },
          ] satisfies LazyFileTreeNode[];
        }

        if (path === 'references') {
          return [
            { id: 'references/guide.md', type: 'file', name: 'guide.md', path: 'references/guide.md' },
          ] satisfies LazyFileTreeNode[];
        }

        return [];
      }),
    };
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue(scanSession);
    vi.mocked(fileSystemAccess.hydrateDirectoryPath).mockImplementation(async (_scanSession, path) => [
      {
        path: '',
        children: [
          { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
          {
            id: 'references',
            type: 'directory',
            name: 'references',
            path: 'references',
            children: [],
            loadState: 'unloaded',
          },
        ],
      },
      {
        path: path.split('/').slice(0, -1).join('/'),
        children: [{ id: path, type: 'file', name: path.split('/').at(-1) ?? path, path }],
      },
    ] satisfies Array<{ path: string; children: LazyFileTreeNode[] }>);
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
    await user.click(await screen.findByRole('treeitem', { name: 'docs' }));
    await user.click(await screen.findByRole('treeitem', { name: '01-intro.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Intro' })).not.toHaveLength(0));

    await user.click(screen.getByRole('link', { name: 'Guide' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Guide' })).not.toHaveLength(0));
    expect(fileSystemAccess.hydrateDirectoryPath).toHaveBeenCalledWith(scanSession, 'references/guide.md');
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(directoryHandle, 'references/guide.md');
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
  });

  it('preserves the current Markdown anchor when pushing a linked document into history', async () => {
    const user = userEvent.setup();
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const linkTree: FileTreeNode[] = [
      { type: 'file', name: 'intro.md', path: 'intro.md' },
      { type: 'file', name: 'next.md', path: 'next.md' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(linkTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'intro.md'
        ? '# Intro\n\n[Details](#details)\n\n## Details\n\n[Next](next.md)'
        : '# Next';
      const file = new File([source], path, { type: 'text/markdown' });
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

    await user.click(screen.getAllByRole('link', { name: 'Details' })[0]);
    await user.click(screen.getByRole('link', { name: 'Next' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Next' })).not.toHaveLength(0));
    const previousDocumentState = replaceStateSpy.mock.calls
      .map(([state]) => state)
      .filter((state) => isTestReaderHistoryState(state) && state.path === 'intro.md')
      .at(-1);

    expect(previousDocumentState).toMatchObject({ path: 'intro.md', hash: 'details' });
  });

  it('pushes same-document Markdown anchor clicks into reader history', async () => {
    const user = userEvent.setup();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const linkTree: FileTreeNode[] = [
      { type: 'file', name: 'intro.md', path: 'intro.md' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(linkTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = '# Intro\n\n[Details](#details)\n\n## Details';
      const file = new File([source], path, { type: 'text/markdown' });

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

    await user.click(screen.getAllByRole('link', { name: 'Details' })[0]);

    const previousState = replaceStateSpy.mock.calls
      .map(([state]) => state)
      .find((state) => isTestReaderHistoryState(state) && state.path === 'intro.md' && !state.hash);
    const anchorState = pushStateSpy.mock.calls
      .map(([state]) => state)
      .find((state) => isTestReaderHistoryState(state) && state.path === 'intro.md' && state.hash === 'details');

    expect(previousState).toMatchObject({ path: 'intro.md' });
    expect(anchorState).toMatchObject({ path: 'intro.md', hash: 'details' });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
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

  it('does not open Markdown links that escape above the authorized folder root', async () => {
    const user = userEvent.setup();
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === 'docs/01-intro.md'
        ? '# Intro\n\n[Escaped](../../../references/guide.md)'
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

    const escapedLink = screen.getByRole('link', { name: 'Escaped' });
    escapedLink.addEventListener('click', (event) => event.preventDefault());
    await user.click(escapedLink);

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

    expect(getDrawerFileItem('02-design.md')).toBeInTheDocument();

    await user.click(getDrawerFileItem('02-design.md'));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));
    expect(getDrawerFileItem('02-design.md')).toBeInTheDocument();
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
      expect(getDrawerFileItem('04-new.md')).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('heading', { name: 'docs/01-intro.md' })).not.toHaveLength(0);
    expect(fileSystemAccess.scanMarkdownDirectory).toHaveBeenCalledTimes(2);
  });

  it('opens an AI project by loading only the project root directory', async () => {
    const user = userEvent.setup();
    const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
    const project = {
      id: 'project-1',
      provider: 'codex' as const,
      name: 'AI Docs',
      expectedPath: '/AI Docs',
      directoryHandle: projectHandle,
      directoryName: 'AI Docs',
      discoveredAt: 1,
    };
    const scanChildren = vi.fn().mockResolvedValue([
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ]);
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      projects: [project],
      sources: {},
    });
    vi.mocked(aiProjects.requestAiProjectDirectoryPermission).mockResolvedValue(true);
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue({ scanChildren });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(screen.getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/AI Docs'));

    expect(fileSystemAccess.createDirectoryScanSession).toHaveBeenCalledWith(projectHandle);
    expect(scanChildren).toHaveBeenCalledWith('');
    expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
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
      expect(getDrawerFileItem('README.md', drawer)).toHaveAttribute('aria-current', 'page'),
    );
    expect(drawer).toBeInTheDocument();

    await user.click(within(drawer).getByText('docs'));
    await user.click(getDrawerFileItem('guide.md', drawer));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/guide.md' })).not.toHaveLength(0));
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(projectHandle, 'docs/guide.md');
  });

  it('reloads an AI project while preserving loaded branches and the active nested file', async () => {
    const user = userEvent.setup();
    const projectHandle = { kind: 'directory', name: 'md-viewer' } as FileSystemDirectoryHandle;
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
      directoryHandle: projectHandle,
      directoryName: 'md-viewer',
    };
    const initialScanChildren = vi.fn(async (path: string) => {
      if (path === '') {
        return [
          { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
          { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
        ] satisfies LazyFileTreeNode[];
      }

      if (path === 'docs') {
        return [
          { id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' },
        ] satisfies LazyFileTreeNode[];
      }

      return [];
    });
    const reloadScanChildren = vi.fn(async (path: string) => {
      if (path === '') {
        return [
          { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
          { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
        ] satisfies LazyFileTreeNode[];
      }

      if (path === 'docs') {
        return [
          { id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' },
          { id: 'docs/new.md', type: 'file', name: 'new.md', path: 'docs/new.md' },
        ] satisfies LazyFileTreeNode[];
      }

      return [];
    });

    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });
    let scanSessionCreationCount = 0;
    vi.mocked(fileSystemAccess.createDirectoryScanSession).mockImplementation(() => {
      scanSessionCreationCount += 1;
      return { scanChildren: scanSessionCreationCount === 1 ? initialScanChildren : reloadScanChildren };
    });
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
    await user.click(await screen.findByRole('treeitem', { name: 'docs' }));
    await user.click(await screen.findByRole('treeitem', { name: 'guide.md' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/guide.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '重载当前' }));

    await waitFor(() => expect(getDrawerFileItem('new.md')).toBeInTheDocument());
    expect(getDrawerFileItem('guide.md')).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('heading', { name: 'docs/guide.md' })).not.toHaveLength(0);
    expect(reloadScanChildren).toHaveBeenCalledWith('');
    expect(reloadScanChildren).toHaveBeenCalledWith('docs');
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
    await waitFor(() => expect(getDrawerFileItem('alpha.md')).toBeInTheDocument());

    await user.click(screen.getByTitle('/Users/qiyu/Github/beta'));

    const drawer = screen.getByLabelText('文件列表');
    await waitFor(() => expect(getDrawerFileItem('beta.md', drawer)).toBeInTheDocument());
    expect(getDrawerFileItem('alpha.md', drawer)).toBeInTheDocument();
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
    await user.click(getDrawerFileItem('folder-b.md'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(getDrawerFileItem('project-b.md'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));

    const folderDrawer = screen.getByLabelText('文件列表');
    expect(getDrawerFileItem('folder-a.md', folderDrawer)).toBeInTheDocument();
    expect(getDrawerFileItem('folder-b.md', folderDrawer)).toHaveAttribute('aria-current', 'page');
    expect(queryDrawerFileItem('project-a.md', folderDrawer)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(folderDrawer).getByRole('tab', { name: 'AI 项目' }));

    const aiDrawer = screen.getByLabelText('文件列表');
    expect(getDrawerFileItem('project-a.md', aiDrawer)).toBeInTheDocument();
    expect(getDrawerFileItem('project-b.md', aiDrawer)).toHaveAttribute('aria-current', 'page');
    expect(queryDrawerFileItem('folder-a.md', aiDrawer)).not.toBeInTheDocument();
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
    await user.click(getDrawerFileItem('project-b.md'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-c.md' })).not.toHaveLength(0));

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(getDrawerFileItem('project-b.md')).toHaveAttribute(
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
    await user.click(getDrawerFileItem('project-b.md'));
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
    await user.click(getDrawerFileItem('z-big.md'));
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

    await waitFor(() => expect(screen.getByText('这个项目根目录没有可显示的文件或子目录。')).toBeInTheDocument());
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
    await user.click(getDrawerFileItem('folder-notes'));
    expect(getDrawerFileItem('folder-notes')).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-docs/project-a.md' })).not.toHaveLength(0));
    await user.click(getDrawerFileItem('project-notes'));
    expect(getDrawerFileItem('project-notes')).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: '文件夹' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-docs/folder-a.md' })).not.toHaveLength(0));
    expect(getDrawerFileItem('folder-notes')).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-docs/project-a.md' })).not.toHaveLength(0));
    expect(getDrawerFileItem('project-notes')).toHaveAttribute('aria-expanded', 'true');
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
    await user.click(getDrawerFileItem('report.html'));

    const preview = await screen.findByTitle('HTML 预览：report.html');
    expect(preview).toBeInstanceOf(HTMLIFrameElement);
    expect(preview.getAttribute('src')).toBe('/html-preview-sandbox.html');
    expect(preview).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals');
    expect(fileSystemAccess.readAssetFile).toHaveBeenCalledWith(directoryHandle, 'app.js');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(within(screen.getByRole('article')).queryByRole('heading', { name: 'Report' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一个' })).toHaveAttribute('title', '上一个文件：README.md');
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('has-outline-panel');
    expect(fileSystemAccess.readMarkdownFileSlice).toHaveBeenCalledTimes(1);
  });

  it('sends inline-script HTML previews to the sandbox renderer', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'critical_page_preview.html', path: 'critical_page_preview.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = '<!doctype html><html><body><h1>关键页面体验预览</h1><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script></body></html>';
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：critical_page_preview.html') as HTMLIFrameElement;
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    fireEvent.load(preview);
    const readyMessage = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:html-preview-ready',
      },
    });
    Object.defineProperty(readyMessage, 'source', { value: frameWindow });
    fireEvent(window, readyMessage);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('document.getElementById("roleSelect").innerHTML'),
          title: 'critical_page_preview.html',
        }),
        '*',
      ),
    );
    expect(preview.getAttribute('src')).toBe('/html-preview-sandbox.html');
  });

  it('sends HTML previews after the sandbox iframe loads even if the ready message was missed', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'critical_page_preview.html', path: 'critical_page_preview.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = '<!doctype html><html><body><h1>关键页面体验预览</h1><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script></body></html>';
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：critical_page_preview.html') as HTMLIFrameElement;
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    fireEvent.load(preview);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('document.getElementById("roleSelect").innerHTML'),
          title: 'critical_page_preview.html',
        }),
        '*',
      ),
    );
  });

  it('waits for the sandbox iframe to load before sending HTML previews', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'gate_review_dashboard.html', path: 'gate_review_dashboard.html' },
    ];
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = '<!doctype html><html><body><h1>Gate Review Dashboard - v1.2 复查完成</h1></body></html>';
      const file = new File([source], path, { type: 'text/html' });

      return {
        path,
        name: path,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });

    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      configurable: true,
      get: () => frameWindow,
    });

    try {
      render(<App />);

      await user.click(screen.getByRole('button', { name: '文件' }));
      await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

      const preview = await screen.findByTitle('HTML 预览：gate_review_dashboard.html');

      await act(async () => {
        await Promise.resolve();
      });
      expect(postMessage).not.toHaveBeenCalled();

      fireEvent.load(preview);

      await waitFor(() =>
        expect(postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'local-markdown-reader:render-html-preview',
            html: expect.stringContaining('Gate Review Dashboard - v1.2 复查完成'),
            title: 'gate_review_dashboard.html',
          }),
          '*',
        ),
      );
    } finally {
      if (originalContentWindow) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', originalContentWindow);
      }
    }
  });

  it('resends updated HTML content when reloading the same HTML file', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'gate_review_dashboard.html', path: 'gate_review_dashboard.html' },
    ];
    let version = 1;

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = `<!doctype html><html><body><h1>Gate Review Dashboard v${version}</h1></body></html>`;
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：gate_review_dashboard.html') as HTMLIFrameElement;
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    fireEvent.load(preview);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('Gate Review Dashboard v1'),
        }),
        '*',
      ),
    );

    version = 2;
    postMessage.mockClear();
    await user.click(screen.getByRole('button', { name: '重载' }));

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('Gate Review Dashboard v2'),
        }),
        '*',
      ),
    );
  });

  it('scrolls to a same-path HTML hash after reloading the current preview', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'current.html', path: 'current.html' },
    ];
    const source = '<!doctype html><html><body><h1>Current</h1><a href="./current.html#details">Details</a><h2 id="details">Details</h2></body></html>';

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：current.html') as HTMLIFrameElement;
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    fireEvent.load(preview);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('data-reader-link-id="link-1"'),
        }),
        '*',
      ),
    );

    postMessage.mockClear();
    const message = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:navigate-html-link',
        linkId: 'link-1',
      },
    });
    Object.defineProperty(message, 'source', { value: frameWindow });
    fireEvent(window, message);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:scroll-html-preview',
          id: 'details',
        }),
        '*',
      ),
    );
  });

  it('pushes same-document HTML anchor clicks into reader history and scrolls through the sandbox bridge', async () => {
    const user = userEvent.setup();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'current.html', path: 'current.html' },
    ];
    const source = '<!doctype html><html><body><h1>Current</h1><a href="#details">Details</a><h2 id="details">Details</h2></body></html>';

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：current.html') as HTMLIFrameElement;
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    fireEvent.load(preview);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('data-reader-link-id="link-1"'),
        }),
        '*',
      ),
    );

    postMessage.mockClear();
    const message = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:navigate-html-link',
        linkId: 'link-1',
      },
    });
    Object.defineProperty(message, 'source', { value: frameWindow });
    fireEvent(window, message);

    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:scroll-html-preview',
          id: 'details',
        }),
        '*',
      ),
    );

    expect(replaceStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'current.html', hash: undefined }),
      '',
      expect.any(String),
    );
    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'current.html', hash: 'details' }),
      '',
      expect.any(String),
    );
  });

  it('does not render the same HTML preview twice when ready and load both fire', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'critical_page_preview.html', path: 'critical_page_preview.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = '<!doctype html><html><body><h1>关键页面体验预览</h1><script>window.renderCount=(window.renderCount||0)+1;</script></body></html>';
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：critical_page_preview.html') as HTMLIFrameElement;
    const postMessage = vi.fn();
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage,
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    fireEvent.load(preview);
    const readyMessage = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:html-preview-ready',
      },
    });
    Object.defineProperty(readyMessage, 'source', { value: frameWindow });
    fireEvent(window, readyMessage);

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'local-markdown-reader:render-html-preview',
        html: expect.stringContaining('window.renderCount'),
      }),
      '*',
    );
  });

  it('does not show the right outline panel for HTML previews', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: 'report.html', path: 'report.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = '<!doctype html><html><body><h1>Report</h1><h2>Details</h2></body></html>';
      const file = new File([source], path, { type: 'text/html' });

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

    const preview = await screen.findByTitle('HTML 预览：report.html') as HTMLIFrameElement;
    const frameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    Object.defineProperty(preview, 'contentWindow', {
      configurable: true,
      value: frameWindow,
    });

    expect(preview).toBeInstanceOf(HTMLIFrameElement);
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('has-outline-panel');
  });

  it('opens local links clicked inside an HTML iframe preview through the authorized folder', async () => {
    const user = userEvent.setup();
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: '项目总览.html', path: '项目总览.html' },
      { type: 'file', name: '当前有效资产清单.html', path: '当前有效资产清单.html' },
    ];
    const sources = new Map([
      [
        '项目总览.html',
        '<!doctype html><html><body><h1>项目总览</h1><a href="./当前有效资产清单.html#main">当前有效资产清单</a></body></html>',
      ],
      [
        '当前有效资产清单.html',
        '<!doctype html><html><body><h1 id="main">当前有效资产清单</h1></body></html>',
      ],
    ]);

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = sources.get(path) ?? `# ${path}`;
      const file = new File([source], path, { type: 'text/html' });

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
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(getDrawerFileItem('项目总览.html'));
    const sourcePreview = await screen.findByTitle('HTML 预览：项目总览.html') as HTMLIFrameElement;
    const sourcePostMessage = vi.fn();
    const sourceFrameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: sourcePostMessage,
    };
    Object.defineProperty(sourcePreview, 'contentWindow', {
      configurable: true,
      value: sourceFrameWindow,
    });
    fireEvent.load(sourcePreview);
    await waitFor(() =>
      expect(sourcePostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
        }),
        '*',
      ),
    );
    expectHtmlPreviewPayloadHasNavigationLink(sourcePostMessage, 'link-1');

    const message = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:navigate-html-link',
        linkId: 'link-1',
      },
    });
    Object.defineProperty(message, 'source', { value: sourceFrameWindow });
    fireEvent(window, message);

    const targetPreview = await screen.findByTitle('HTML 预览：当前有效资产清单.html') as HTMLIFrameElement;
    const targetPostMessage = vi.fn();
    const targetFrameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: targetPostMessage,
    };
    Object.defineProperty(targetPreview, 'contentWindow', {
      configurable: true,
      value: targetFrameWindow,
    });
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(directoryHandle, '当前有效资产清单.html');
    expect(getDrawerFileItem('当前有效资产清单.html')).toHaveAttribute('aria-current', 'page');
    expect(pushStateSpy).toHaveBeenCalled();
    const linkedDocumentState = pushStateSpy.mock.calls
      .map(([state]) => state)
      .find((state) => isTestReaderHistoryState(state) && state.path === '当前有效资产清单.html');

    expect(linkedDocumentState).toMatchObject({ path: '当前有效资产清单.html', hash: 'main' });
    fireEvent.load(targetPreview);

    await waitFor(() =>
      expect(targetPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
          html: expect.stringContaining('当前有效资产清单'),
          title: '当前有效资产清单.html',
        }),
        '*',
      ),
    );
    await waitFor(() =>
      expect(targetPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:scroll-html-preview',
          id: 'main',
        }),
        '*',
      ),
    );

    const previousDocumentState = replaceStateSpy.mock.calls
      .map(([state]) => state)
      .find((state) => isTestReaderHistoryState(state) && state.path === '项目总览.html');

    expect(previousDocumentState).toMatchObject({ path: '项目总览.html' });

    fireEvent(window, new PopStateEvent('popstate', { state: previousDocumentState }));

    await waitFor(() => expect(screen.getByTitle('HTML 预览：项目总览.html')).toBeInTheDocument());
    expect(fileSystemAccess.readDocumentFileSnapshot).toHaveBeenLastCalledWith(directoryHandle, '项目总览.html');

    fireEvent(window, new PopStateEvent('popstate', { state: linkedDocumentState }));

    await waitFor(() => expect(screen.getByTitle('HTML 预览：当前有效资产清单.html')).toBeInTheDocument());
    fireEvent.load(screen.getByTitle('HTML 预览：当前有效资产清单.html'));
    await waitFor(() =>
      expect(targetPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:scroll-html-preview',
          id: 'main',
        }),
        '*',
      ),
    );
  });

  it('ignores forged HTML preview navigation messages from outside the active iframe', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: '项目总览.html', path: '项目总览.html' },
      { type: 'file', name: '当前有效资产清单.html', path: '当前有效资产清单.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File(['<!doctype html><html><body><h1>项目总览</h1></body></html>'], path, { type: 'text/html' });

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
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(getDrawerFileItem('项目总览.html'));
    await waitFor(() => expect(screen.getByTitle('HTML 预览：项目总览.html')).toBeInTheDocument());

    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockClear();

    const message = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:navigate-html-link',
        linkId: 'link-1',
      },
    });
    Object.defineProperty(message, 'source', { value: window });
    fireEvent(window, message);

    await waitFor(() => expect(fileSystemAccess.readDocumentFileSnapshot).not.toHaveBeenCalled());
    expect(screen.getByTitle('HTML 预览：项目总览.html')).toBeInTheDocument();
  });

  it('ignores HTML preview navigation messages while the iframe preview is not rendered', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: '项目总览.html', path: '项目总览.html' },
      { type: 'file', name: '当前有效资产清单.html', path: '当前有效资产清单.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = new File(['<!doctype html><html><body><h1>项目总览</h1></body></html>'], path, { type: 'text/html' });

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
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(getDrawerFileItem('项目总览.html'));
    const sourcePreview = await screen.findByTitle('HTML 预览：项目总览.html') as HTMLIFrameElement;

    await user.click(screen.getByLabelText('原文'));
    await waitFor(() => expect(screen.queryByTitle('HTML 预览：项目总览.html')).not.toBeInTheDocument());
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockClear();

    const message = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:navigate-html-link',
        linkId: 'link-1',
      },
    });
    Object.defineProperty(message, 'source', { value: sourcePreview.contentWindow });
    fireEvent(window, message);

    await waitFor(() => expect(fileSystemAccess.readDocumentFileSnapshot).not.toHaveBeenCalled());
    expect(screen.getByText(/<!doctype html>/i)).toBeInTheDocument();
  });

  it('ignores HTML preview navigation messages for files outside the scanned document tree', async () => {
    const user = userEvent.setup();
    const htmlTree: FileTreeNode[] = [
      { type: 'file', name: '项目总览.html', path: '项目总览.html' },
      { type: 'file', name: '当前有效资产清单.html', path: '当前有效资产清单.html' },
    ];

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(htmlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const source = path === '项目总览.html'
        ? '<!doctype html><html><body><h1>项目总览</h1><a href="./未扫描到的页面.html">Missing</a></body></html>'
        : '<!doctype html><html><body><h1>当前有效资产清单</h1></body></html>';
      const file = new File([source], path, { type: 'text/html' });

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
    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(getDrawerFileItem('项目总览.html'));
    const sourcePreview = await screen.findByTitle('HTML 预览：项目总览.html') as HTMLIFrameElement;
    const sourcePostMessage = vi.fn();
    const sourceFrameWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: sourcePostMessage,
    };
    Object.defineProperty(sourcePreview, 'contentWindow', {
      configurable: true,
      value: sourceFrameWindow,
    });
    fireEvent.load(sourcePreview);
    await waitFor(() =>
      expect(sourcePostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'local-markdown-reader:render-html-preview',
        }),
        '*',
      ),
    );
    expectHtmlPreviewPayloadHasNavigationLink(sourcePostMessage, 'link-1');

    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockClear();

    const message = new MessageEvent('message', {
      data: {
        type: 'local-markdown-reader:navigate-html-link',
        linkId: 'link-1',
      },
    });
    Object.defineProperty(message, 'source', { value: sourceFrameWindow });
    fireEvent(window, message);

    await waitFor(() => expect(fileSystemAccess.readDocumentFileSnapshot).not.toHaveBeenCalled());
    expect(screen.getByTitle('HTML 预览：项目总览.html')).toBeInTheDocument();
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
    await user.click(getDrawerFileItem('report.html'));

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
    await user.click(getDrawerFileItem('folder-b.md'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(getDrawerFileItem('project-b.md'));
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
    expect(getDrawerFileItem('folder-b.md')).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(getDrawerFileItem('project-b.md')).toHaveAttribute(
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
    await user.click(getDrawerFileItem('folder-b.md'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'folder-b.md' })).not.toHaveLength(0));

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await user.click(await screen.findByTitle('/Users/qiyu/Github/ai-docs'));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-a.md' })).not.toHaveLength(0));
    await user.click(getDrawerFileItem('project-b.md'));
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
    expect(getDrawerFileItem('folder-b.md')).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(screen.getByLabelText('文件列表')).getByRole('tab', { name: 'AI 项目' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'project-b.md' })).not.toHaveLength(0));
    expect(getDrawerFileItem('project-b.md')).toHaveAttribute(
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
    expect(screen.getByTitle('HTML 预览：standalone.html').getAttribute('src')).toBe('/html-preview-sandbox.html');
    expect(fileSystemAccess.readMarkdownFileSlice).not.toHaveBeenCalled();
    expect(recentDocument.saveLastDocument).not.toHaveBeenCalled();
  });

  it('opens JSON files with a structured JSON reader without a right outline panel', async () => {
    const user = userEvent.setup();
    const jsonTree: FileTreeNode[] = [
      { type: 'file', name: 'data.json', path: 'data.json' },
    ];
    const jsonFile = new File(
      [JSON.stringify({ users: [{ id: 1, name: 'Ada' }], meta: { total: 1 } })],
      'data.json',
      { type: 'application/json' },
    );

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(jsonTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'data.json',
      name: 'data.json',
      size: jsonFile.size,
      type: jsonFile.type,
      lastModified: jsonFile.lastModified,
      file: jsonFile,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'data.json' })).not.toHaveLength(0));
    expect(await screen.findByLabelText('JSON 编辑器')).toBeInTheDocument();
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('has-outline-panel');
    expect(fileSystemAccess.readMarkdownFileSlice).not.toHaveBeenCalled();
  });

  it('opens JSONL files with a structured JSON reader without a right outline panel', async () => {
    const user = userEvent.setup();
    const jsonlTree: FileTreeNode[] = [
      { type: 'file', name: 'events.jsonl', path: 'events.jsonl' },
    ];
    const jsonlFile = new File(
      ['{"id":1,"event":"open"}\n{"id":2,"event":"close"}\n'],
      'events.jsonl',
      { type: 'application/x-ndjson' },
    );

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(jsonlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'events.jsonl',
      name: 'events.jsonl',
      size: jsonlFile.size,
      type: jsonlFile.type,
      lastModified: jsonlFile.lastModified,
      file: jsonlFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('{"id":1,"event":"open"}\n');

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'events.jsonl' })).not.toHaveLength(0));
    expect(await screen.findByLabelText('JSON 编辑器')).toBeInTheDocument();
    expect(screen.getByText('Array')).toBeInTheDocument();
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('has-outline-panel');
  });

  it('opens YAML files with a structured YAML reader without a right outline panel', async () => {
    const user = userEvent.setup();
    const yamlTree: FileTreeNode[] = [
      { type: 'file', name: 'config.yaml', path: 'config.yaml' },
    ];
    const yamlFile = new File(
      ['users:\n  - id: 1\n    name: Ada\nmeta:\n  total: 1\n'],
      'config.yaml',
      { type: 'text/yaml' },
    );

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue(yamlTree);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'config.yaml',
      name: 'config.yaml',
      size: yamlFile.size,
      type: yamlFile.type,
      lastModified: yamlFile.lastModified,
      file: yamlFile,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'config.yaml' })).not.toHaveLength(0));
    expect(await screen.findByLabelText('YAML 编辑器')).toBeInTheDocument();
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('has-outline-panel');
    expect(fileSystemAccess.readDocumentFile).not.toHaveBeenCalled();
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

  it('releases the active large-document worker before opening another document tab', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['# Big\n'.padEnd(2 * 1024 * 1024, 'x')], 'big.md', {
      type: 'text/markdown',
    });
    const smallFile = new File(['# Small'], 'small.md', { type: 'text/markdown' });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'big.md', path: 'big.md' },
      { type: 'file', name: 'small.md', path: 'small.md' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockImplementation(async (_handle, path) => {
      const file = path === 'big.md' ? largeFile : smallFile;

      return {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        file,
      };
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('# Big\n');

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));
    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(getDrawerFileItem('small.md'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Small' })).toBeInTheDocument());
    expect(largeDocumentClient.terminate).toHaveBeenCalled();
  });

  it('opens large YAML documents in raw large-file mode without markdown chunk preview', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['services:\n'.padEnd(2 * 1024 * 1024, 'x')], 'config.yaml', {
      type: 'text/yaml',
    });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'config.yaml', path: 'config.yaml' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'config.yaml',
      name: 'config.yaml',
      size: largeFile.size,
      type: 'text/yaml',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('services:\n');
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'config.yaml',
      size: largeFile.size,
      lineCount: 2,
      lineStarts: [0, 10],
      title: null,
      outline: [],
      warnings: [],
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '分块预览' })).not.toBeInTheDocument();
    expect(screen.getByTestId('large-document-virtual-source')).toBeInTheDocument();
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
  });

  it('opens large JSONL documents in raw large-file mode without full JSONL parsing', async () => {
    const user = userEvent.setup();
    const largeFile = new File(['{"id":1}\n'.padEnd(2 * 1024 * 1024, 'x')], 'events.jsonl', {
      type: 'application/x-ndjson',
    });

    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockResolvedValue([
      { type: 'file', name: 'events.jsonl', path: 'events.jsonl' },
    ]);
    vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
      path: 'events.jsonl',
      name: 'events.jsonl',
      size: largeFile.size,
      type: 'application/x-ndjson',
      lastModified: largeFile.lastModified,
      file: largeFile,
    });
    vi.mocked(fileSystemAccess.readMarkdownFileSlice).mockResolvedValue('{"id":1}\n');
    largeDocumentClient.buildIndex.mockResolvedValue({
      name: 'events.jsonl',
      size: largeFile.size,
      lineCount: 2,
      lineStarts: [0, 9],
      title: null,
      outline: [],
      warnings: [],
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '文件' }));
    await user.click(within(screen.getByLabelText('文件列表')).getByRole('button', { name: '打开文件夹' }));

    await waitFor(() => expect(screen.getByText('大文件安全模式')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '分块预览' })).not.toBeInTheDocument();
    expect(screen.getByTestId('large-document-virtual-source')).toBeInTheDocument();
    expect(screen.queryByLabelText('JSON 编辑器')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('文档大纲')).not.toBeInTheDocument();
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
    vi.mocked(fileSystemAccess.hydrateDirectoryPath).mockResolvedValue([
      {
        path: '',
        children: [{ id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs',
        children: [{ id: 'docs/02-design.md', type: 'file', name: '02-design.md', path: 'docs/02-design.md' }],
      },
    ]);
    vi.mocked(fileSystemAccess.scanMarkdownDirectory).mockClear();
    vi.mocked(temporaryDocument.consumeTemporaryMarkdownDocument).mockResolvedValue(null);
    window.history.replaceState(null, '', '/reader.html?temporaryDocument=temp-1');

    render(<App />);

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'docs/02-design.md' })).not.toHaveLength(0));
    expect(temporaryDocument.consumeTemporaryMarkdownDocument).toHaveBeenCalledWith('temp-1');
    expect(fileSystemAccess.hydrateDirectoryPath).toHaveBeenCalledWith(expect.any(Object), 'docs/02-design.md');
    expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
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
