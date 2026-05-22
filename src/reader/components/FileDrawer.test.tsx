import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileDrawer } from './FileDrawer';

const defaultProps = {
  open: true,
  tree: [],
  activePath: null,
  activeTab: 'folder' as const,
  aiProjects: [],
  aiProjectSources: {},
  aiProjectStatus: null,
  activeAiProjectId: null,
  aiProjectTrees: {},
  onOpenFolder: vi.fn(),
  onReloadFolder: vi.fn(),
  onTabChange: vi.fn(),
  onOpenAiProjectSettings: vi.fn(),
  onClearAiProjects: vi.fn(),
  onOpenAiProject: vi.fn(),
  onReloadAiProject: vi.fn(),
  onSelectAiProjectFile: vi.fn(),
  onClose: vi.fn(),
  onSelect: vi.fn(),
  onResizeStart: vi.fn(),
  onResizeKeyDown: vi.fn(),
};

describe('FileDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('offers folder opening from the file drawer', async () => {
    const user = userEvent.setup();
    const onOpenFolder = vi.fn();

    render(
      <FileDrawer
        {...defaultProps}
        onOpenFolder={onOpenFolder}
      />,
    );

    await user.click(screen.getByRole('button', { name: '打开文件夹' }));

    expect(onOpenFolder).toHaveBeenCalledOnce();
  });

  it('offers folder reloading from the file drawer', async () => {
    const user = userEvent.setup();
    const onReloadFolder = vi.fn();

    render(
      <FileDrawer
        {...defaultProps}
        onReloadFolder={onReloadFolder}
      />,
    );

    await user.click(screen.getByRole('button', { name: '重载目录' }));

    expect(onReloadFolder).toHaveBeenCalledOnce();
  });

  it('switches to the AI project tab', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    render(<FileDrawer {...defaultProps} onTabChange={onTabChange} />);

    await user.click(screen.getByRole('tab', { name: 'AI 项目' }));

    expect(onTabChange).toHaveBeenCalledWith('ai-projects');
  });

  it('exposes a resize separator for the docked file drawer', async () => {
    const user = userEvent.setup();
    const onResizeKeyDown = vi.fn();

    render(<FileDrawer {...defaultProps} onResizeKeyDown={onResizeKeyDown} />);

    const separator = screen.getByRole('separator', { name: '调整文件面板宽度' });

    separator.focus();
    await user.keyboard('{ArrowRight}');

    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(onResizeKeyDown).toHaveBeenCalled();
  });

  it('starts resizing when the separator is dragged', () => {
    const onResizeStart = vi.fn();

    render(<FileDrawer {...defaultProps} onResizeStart={onResizeStart} />);

    screen.getByRole('separator', { name: '调整文件面板宽度' }).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 360 }),
    );

    expect(onResizeStart).toHaveBeenCalled();
  });

  it('guides users to configure AI project sources from settings', async () => {
    const user = userEvent.setup();
    const onOpenAiProjectSettings = vi.fn();

    render(
      <FileDrawer
        {...defaultProps}
        activeTab="ai-projects"
        onOpenAiProjectSettings={onOpenAiProjectSettings}
      />,
    );

    expect(screen.getByText(/尚未配置 AI 项目来源/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '配置' }));

    expect(onOpenAiProjectSettings).toHaveBeenCalledOnce();
  });

  it('uses a compact header with tabs and a close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<FileDrawer {...defaultProps} onClose={onClose} />);

    expect(screen.queryByRole('heading', { name: '文件' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '文件夹' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI 项目' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭文件面板' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('summarizes AI project sources and project count without repeating counts', () => {
    render(
      <FileDrawer
        {...defaultProps}
        activeTab="ai-projects"
        aiProjectSources={{
          codex: {
            provider: 'codex',
            rootHandle: { kind: 'directory', name: '.codex' } as FileSystemDirectoryHandle,
            rootName: '.codex',
            scannedAt: 123,
            projectCount: 14,
          },
        }}
        aiProjects={Array.from({ length: 14 }, (_, index) => ({
          id: `codex:/Users/qiyu/Github/project-${index}`,
          provider: 'codex' as const,
          name: `project-${index}`,
          expectedPath: `/Users/qiyu/Github/project-${index}`,
          discoveredAt: 123,
        }))}
      />,
    );

    expect(screen.getByText('Codex · 14 个项目')).toBeInTheDocument();
    expect(screen.queryByText(/已配置/)).not.toBeInTheDocument();
    expect(screen.queryByText('14 个项目')).not.toBeInTheDocument();
  });

  it('shows compact AI project rows and opens a project entry', async () => {
    const user = userEvent.setup();
    const onOpenAiProject = vi.fn();
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
    };

    render(
      <FileDrawer
        {...defaultProps}
        activeTab="ai-projects"
        aiProjects={[project]}
        onOpenAiProject={onOpenAiProject}
      />,
    );

    const projectButton = screen.getByRole('button', { name: /md-viewer/ });

    await user.click(projectButton);

    expect(projectButton).toHaveClass('ai-project-row__main');
    expect(projectButton.closest('.ai-project-row')).toBeInTheDocument();
    expect(projectButton).toHaveAttribute(
      'title',
      '/Users/qiyu/Github/md-viewer',
    );
    expect(onOpenAiProject).toHaveBeenCalledWith(project);
  });

  it('expands an authorized AI project file tree below the project row', async () => {
    const user = userEvent.setup();
    const onSelectAiProjectFile = vi.fn();
    const onReloadAiProject = vi.fn();
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
      directoryHandle: { kind: 'directory', name: 'md-viewer' } as FileSystemDirectoryHandle,
      directoryName: 'md-viewer-authorized-root',
    };

    render(
      <FileDrawer
        {...defaultProps}
        activeTab="ai-projects"
        activeAiProjectId={project.id}
        activePath="README.md"
        aiProjects={[project]}
        aiProjectTrees={{
          [project.id]: [
            { type: 'file', name: 'README.md', path: 'README.md' },
            {
              type: 'directory',
              name: 'docs',
              path: 'docs',
              children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
            },
          ],
        }}
        onReloadAiProject={onReloadAiProject}
        onSelectAiProjectFile={onSelectAiProjectFile}
      />,
    );

    expect(screen.getByRole('button', { name: 'README.md' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'guide.md' }));

    expect(onSelectAiProjectFile).toHaveBeenCalledWith(project, 'docs/guide.md');

    expect(screen.queryByText(project.directoryName)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重载项目：md-viewer' }));

    expect(onReloadAiProject).toHaveBeenCalledWith(project);
  });

  it('shows a reload action for authorized AI projects before their tree is expanded', async () => {
    const user = userEvent.setup();
    const onReloadAiProject = vi.fn();
    const onOpenAiProject = vi.fn();
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
      directoryHandle: { kind: 'directory', name: 'md-viewer' } as FileSystemDirectoryHandle,
      directoryName: 'md-viewer',
    };

    render(
      <FileDrawer
        {...defaultProps}
        activeTab="ai-projects"
        aiProjects={[project]}
        onOpenAiProject={onOpenAiProject}
        onReloadAiProject={onReloadAiProject}
      />,
    );

    await user.click(screen.getByRole('button', { name: '重载项目：md-viewer' }));

    expect(onReloadAiProject).toHaveBeenCalledWith(project);
    expect(onOpenAiProject).not.toHaveBeenCalled();
  });

  it('keeps multiple authorized AI project trees expanded at the same time', () => {
    const projectA = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
      directoryHandle: { kind: 'directory', name: 'md-viewer' } as FileSystemDirectoryHandle,
      directoryName: 'md-viewer',
    };
    const projectB = {
      id: 'claude:/Users/qiyu/Github/docs',
      provider: 'claude' as const,
      name: 'docs',
      expectedPath: '/Users/qiyu/Github/docs',
      discoveredAt: 456,
      directoryHandle: { kind: 'directory', name: 'docs' } as FileSystemDirectoryHandle,
      directoryName: 'docs',
    };

    render(
      <FileDrawer
        {...defaultProps}
        activeTab="ai-projects"
        activeAiProjectId={projectB.id}
        activePath="guide.md"
        aiProjects={[projectA, projectB]}
        aiProjectTrees={{
          [projectA.id]: [{ type: 'file', name: 'README.md', path: 'README.md' }],
          [projectB.id]: [{ type: 'file', name: 'guide.md', path: 'guide.md' }],
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'README.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'guide.md' })).toHaveAttribute('aria-current', 'page');
  });
});
