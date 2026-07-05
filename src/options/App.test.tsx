import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';
import * as aiProjects from '../reader/aiProjects';

vi.mock('../reader/aiProjects', async () => {
  const actual = await vi.importActual<typeof import('../reader/aiProjects')>('../reader/aiProjects');

  return {
    ...actual,
    loadAiProjectState: vi.fn(async () => ({ sources: {}, projects: [] })),
    saveAiProjectState: vi.fn(async () => undefined),
    clearAiProjectState: vi.fn(async () => undefined),
    scanAiProjects: vi.fn(async () => ({ provider: 'codex', projects: [], warnings: [] })),
  };
});

describe('options App', () => {
  let originalCreateObjectUrl: typeof URL.createObjectURL;
  let originalRevokeObjectUrl: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    originalCreateObjectUrl = URL.createObjectURL;
    originalRevokeObjectUrl = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:theme-export');
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
        },
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    vi.unstubAllGlobals();
  });

  it('lets users authorize and rescan AI project sources from settings', async () => {
    const user = userEvent.setup();
    const globalStateFile = {
      kind: 'file',
      name: '.codex-global-state.json.bak',
      getFile: async () =>
        new File(
          [
            JSON.stringify({
              'electron-saved-workspace-roots': ['/Users/qiyu/Github/md-viewer'],
            }),
          ],
          '.codex-global-state.json.bak',
        ),
    };
    const codexHandle = {
      kind: 'directory',
      name: '.codex',
      async *entries() {
        yield [globalStateFile.name, globalStateFile];
      },
    } as unknown as FileSystemDirectoryHandle;
    const showDirectoryPicker = vi.fn(async () => codexHandle);
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: showDirectoryPicker,
    });
    vi.mocked(aiProjects.scanAiProjects).mockResolvedValue({
      provider: 'codex',
      projects: [
        {
          id: 'codex:/Users/qiyu/Github/md-viewer',
          provider: 'codex',
          name: 'md-viewer',
          expectedPath: '/Users/qiyu/Github/md-viewer',
          discoveredAt: 123,
        },
      ],
      warnings: [],
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'AI 项目' })).toBeInTheDocument();
    expect(screen.getByText('选择 ~/.codex')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '授权 Codex' }));

    await waitFor(() => expect(aiProjects.saveAiProjectState).toHaveBeenCalled());
    expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' });
    expect(screen.getByText('已扫描 Codex：1 个项目。')).toBeInTheDocument();
    expect(screen.getByText('md-viewer')).toBeInTheDocument();
    expect(screen.getByText('/Users/qiyu/Github/md-viewer')).toBeInTheDocument();
  });

  it('authorizes pending AI projects from settings', async () => {
    const user = userEvent.setup();
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
    };
    const projectHandle = {
      kind: 'directory',
      name: 'md-viewer',
    } as FileSystemDirectoryHandle;
    const showDirectoryPicker = vi.fn(async () => projectHandle);
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: showDirectoryPicker,
    });
    vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
      sources: {},
      projects: [project],
    });

    render(<App />);

    expect(await screen.findByText('md-viewer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '授权项目：md-viewer' }));

    await waitFor(() => expect(aiProjects.saveAiProjectState).toHaveBeenCalled());
    expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' });
    expect(screen.getByText('已授权项目：md-viewer。')).toBeInTheDocument();
    expect(screen.getByText('md-viewer · 已授权')).toBeInTheDocument();
  });

  it('installs a local theme package and applies it', async () => {
    const user = userEvent.setup();
    const themeFile = new File(
      [
        JSON.stringify({
          id: 'paper-pro',
          name: 'Paper Pro',
          version: '1.0.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#fffefa',
          },
        }),
      ],
      'paper-pro.mdv-theme.json',
      { type: 'application/json' },
    );

    render(<App />);

    expect(await screen.findByLabelText('阅读主题预览')).toBeInTheDocument();
    expect(screen.getByLabelText('阅读主题预览').closest('.theme-preview')).toHaveClass('reader-theme-paper');
    expect(screen.getByLabelText('阅读主题预览').closest('.theme-preview')?.querySelector('style')?.textContent).toContain(
      '[data-reader-theme-id="builtin:paper"][data-reader-theme-id]',
    );

    const input = await screen.findByLabelText('选择主题包文件');
    await user.upload(input, themeFile);

    expect(await screen.findByText('主题已准备好：Paper Pro。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认安装' })).toBeInTheDocument();
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText('阅读主题预览').at(-1)?.closest('.theme-preview')).toHaveAttribute(
      'data-reader-theme-id',
      'installed:paper-pro',
    );

    await user.click(screen.getByRole('button', { name: '确认安装' }));

    await waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalled());
    await waitFor(() =>
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        readerSettings: expect.objectContaining({
          reading: expect.objectContaining({
            themeId: 'installed:paper-pro',
          }),
        }),
      }),
    );
    expect(screen.getByText('已安装主题：Paper Pro。')).toBeInTheDocument();
    expect(screen.getByText('当前：Paper Pro · 1.0.0 · 浅色')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('阅读主题预览').closest('.theme-preview')).toHaveAttribute(
        'data-reader-theme-id',
        'installed:paper-pro',
      ),
    );
    expect(screen.getByLabelText('阅读主题预览').closest('.theme-preview')?.querySelector('style')?.textContent).toContain(
      '[data-reader-theme-id="installed:paper-pro"][data-reader-theme-id]',
    );
  });

  it('rejects incompatible local theme packages', async () => {
    const user = userEvent.setup();
    const themeFile = new File(
      [
        JSON.stringify({
          id: 'future-theme',
          name: 'Future Theme',
          version: '1.0.0',
          minAppVersion: '99.0.0',
          tokens: {
            '--reader-surface': '#fffefa',
          },
        }),
      ],
      'future-theme.mdv-theme.json',
      { type: 'application/json' },
    );

    render(<App />);

    await user.upload(await screen.findByLabelText('选择主题包文件'), themeFile);

    expect(await screen.findByText(/需要应用版本 99\.0\.0 或更高版本/)).toBeInTheDocument();
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('asks users to confirm before replacing an installed theme package', async () => {
    const user = userEvent.setup();
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    localGet.mockResolvedValue({
      readerThemePackages: [
        {
          id: 'paper-pro',
          name: 'Paper Pro',
          version: '1.0.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#fffefa',
          },
          css: '',
          installedAt: 123,
        },
      ],
    });
    const themeFile = new File(
      [
        JSON.stringify({
          id: 'paper-pro',
          name: 'Paper Pro',
          version: '1.1.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#fffdf7',
          },
        }),
      ],
      'paper-pro.mdv-theme.json',
      { type: 'application/json' },
    );

    render(<App />);

    expect(await screen.findByText('Paper Pro')).toBeInTheDocument();

    await user.upload(await screen.findByLabelText('选择主题包文件'), themeFile);

    expect(await screen.findByText('检测到已安装主题：Paper Pro 1.0.0，将更新为 1.1.0。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认更新' })).toBeInTheDocument();
    expect(chrome.storage.local.set).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '确认更新' }));

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        readerThemePackages: [
          expect.objectContaining({
            id: 'paper-pro',
            version: '1.1.0',
            tokens: expect.objectContaining({
              '--reader-surface': '#fffdf7',
            }),
          }),
        ],
      }),
    );
    expect(screen.getByText('已更新主题：Paper Pro。')).toBeInTheDocument();
  });

  it('installs a recommended theme package from the catalog', async () => {
    const user = userEvent.setup();

    render(<App />);

    const catalog = await screen.findByRole('list', { name: '推荐主题' });
    const inkFocusRow = within(catalog).getByText('Ink Focus').closest('li')!;

    await user.click(within(inkFocusRow).getByRole('button', { name: '安装' }));

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        readerThemePackages: [
          expect.objectContaining({
            id: 'ink-focus',
            version: '1.0.0',
          }),
        ],
      }),
    );
    await waitFor(() =>
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        readerSettings: expect.objectContaining({
          reading: expect.objectContaining({
            themeId: 'installed:ink-focus',
          }),
        }),
      }),
    );
    expect(screen.getByText('已安装主题：Ink Focus。')).toBeInTheDocument();
  });

  it('marks recommended themes as installed when the same version exists', async () => {
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    localGet.mockResolvedValue({
      readerThemePackages: [
        {
          id: 'ink-focus',
          name: 'Ink Focus',
          version: '1.0.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#ffffff',
          },
          css: '',
          installedAt: 123,
        },
      ],
    });

    render(<App />);

    const catalog = await screen.findByRole('list', { name: '推荐主题' });
    const inkFocusRow = within(catalog).getByText('Ink Focus').closest('li')!;

    expect(within(inkFocusRow).getByRole('button', { name: '已安装' })).toBeDisabled();
  });

  it('asks for confirmation before updating a recommended theme package', async () => {
    const user = userEvent.setup();
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    localGet.mockResolvedValue({
      readerThemePackages: [
        {
          id: 'ink-focus',
          name: 'Ink Focus',
          version: '0.9.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#ffffff',
          },
          css: '',
          installedAt: 123,
        },
      ],
    });

    render(<App />);

    const catalog = await screen.findByRole('list', { name: '推荐主题' });
    const inkFocusRow = within(catalog).getByText('Ink Focus').closest('li')!;

    await user.click(within(inkFocusRow).getByRole('button', { name: '更新' }));

    expect(await screen.findByText('检测到已安装主题：Ink Focus 0.9.0，将更新为 1.0.0。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认更新' })).toBeInTheDocument();
    expect(chrome.storage.local.set).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '确认更新' }));

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        readerThemePackages: [
          expect.objectContaining({
            id: 'ink-focus',
            version: '1.0.0',
          }),
        ],
      }),
    );
    expect(screen.getByText('已更新主题：Ink Focus。')).toBeInTheDocument();
  });

  it('exports the selected installed theme package', async () => {
    const user = userEvent.setup();
    const syncGet = chrome.storage.sync.get as unknown as ReturnType<typeof vi.fn>;
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    syncGet.mockResolvedValue({
      readerSettings: {
        reading: {
          themeId: 'installed:paper-pro',
        },
      },
    });
    localGet.mockResolvedValue({
      readerThemePackages: [
        {
          id: 'paper-pro',
          name: 'Paper Pro',
          version: '1.0.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#fffefa',
          },
          css: '',
          installedAt: 123,
        },
      ],
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<App />);

    expect(await screen.findByText('当前：Paper Pro · 1.0.0 · 浅色')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导出' }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:theme-export');
    expect(screen.getByText('已导出主题：Paper Pro。')).toBeInTheDocument();

    click.mockRestore();
  });

  it('manages installed theme packages without requiring them to be selected first', async () => {
    const user = userEvent.setup();
    const syncGet = chrome.storage.sync.get as unknown as ReturnType<typeof vi.fn>;
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    syncGet.mockResolvedValue({
      readerSettings: {
        reading: {
          themeId: 'installed:paper-pro',
        },
      },
    });
    localGet.mockResolvedValue({
      readerThemePackages: [
        {
          id: 'paper-pro',
          name: 'Paper Pro',
          version: '1.0.0',
          colorScheme: 'light',
          tokens: {
            '--reader-surface': '#fffefa',
          },
          css: '',
          installedAt: 123,
        },
        {
          id: 'night-owl',
          name: 'Night Owl',
          version: '1.0.0',
          colorScheme: 'dark',
          tokens: {
            '--reader-surface': '#111827',
          },
          css: '',
          installedAt: 124,
        },
      ],
    });

    render(<App />);

    expect(await screen.findByText('Paper Pro · 使用中')).toBeInTheDocument();
    expect(screen.getByText('Night Owl')).toBeInTheDocument();

    const nightOwlRow = screen.getByText('Night Owl').closest('li')!;
    await user.click(within(nightOwlRow).getByRole('button', { name: '应用' }));

    await waitFor(() =>
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        readerSettings: expect.objectContaining({
          reading: expect.objectContaining({
            themeId: 'installed:night-owl',
          }),
        }),
      }),
    );
    expect(screen.getByText('已应用主题：Night Owl。')).toBeInTheDocument();

    const paperRow = screen.getByText('Paper Pro').closest('li')!;
    await user.click(within(paperRow).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalled());
    expect(screen.getByText('已删除主题：Paper Pro。')).toBeInTheDocument();
  });
});
