import { render, screen, waitFor } from '@testing-library/react';
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
        },
      },
    });
  });

  afterEach(() => {
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
});
