import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { FileDrawer } from './FileDrawer';
import type { AiProjectEntry } from '../aiProjects';
import type { LazyFileTreeNode } from '../../shared/types';
import { createEmptyLazyFileTree, replaceDirectoryChildren, setExpandedPaths, type LazyFileTreeState } from '../lazyFileTree';

const defaultProps = {
  open: true,
  tree: [] as LazyFileTreeNode[],
  activePath: null,
  expandedPaths: new Set<string>(),
  activeTab: 'folder' as const,
  aiProjects: [],
  aiProjectSources: {},
  aiProjectStatus: null,
  activeAiProjectId: null,
  aiProjectTrees: {} as Record<string, LazyFileTreeState>,
  aiProjectActivePaths: {},
  onOpenFolder: vi.fn(),
  onReloadFolder: vi.fn(),
  onFolderExpandedPathsChange: vi.fn(),
  onLoadFolderDirectory: vi.fn(),
  onTabChange: vi.fn(),
  onOpenAiProjectSettings: vi.fn(),
  onClearAiProjects: vi.fn(),
  onOpenAiProject: vi.fn(),
  onReloadAiProject: vi.fn(),
  onAiProjectExpandedPathsChange: vi.fn(),
  onLoadProjectDirectory: vi.fn(),
  onSelectAiProjectFile: vi.fn(),
  onClose: vi.fn(),
  onSelect: vi.fn(),
  onResizeStart: vi.fn(),
  onResizeKeyDown: vi.fn(),
};

type StatefulAiProjectDrawerProps = {
  activePath: string | null;
  onReloadAiProject: (project: AiProjectEntry) => void;
  onSelectAiProjectFile: (project: AiProjectEntry, path: string) => void;
  project: AiProjectEntry;
  tree: LazyFileTreeState;
};

function StatefulAiProjectDrawer({
  activePath,
  onReloadAiProject,
  onSelectAiProjectFile,
  project,
  tree,
}: StatefulAiProjectDrawerProps) {
  const [projectTrees, setProjectTrees] = useState<Record<string, LazyFileTreeState>>({ [project.id]: tree });

  return (
    <FileDrawer
      {...defaultProps}
      activeTab="ai-projects"
      activeAiProjectId={project.id}
      aiProjectActivePaths={{ [project.id]: activePath }}
      aiProjects={[project]}
      aiProjectTrees={projectTrees}
      onAiProjectExpandedPathsChange={(nextProject, paths) => {
        setProjectTrees((current) => ({
          ...current,
          [nextProject.id]: setExpandedPaths(current[nextProject.id] ?? createEmptyLazyFileTree(), paths),
        }));
      }}
      onReloadAiProject={onReloadAiProject}
      onSelectAiProjectFile={onSelectAiProjectFile}
    />
  );
}

function loadedLazyTree(nodes: LazyFileTreeNode[], expandedPaths: Iterable<string> = []): LazyFileTreeState {
  return setExpandedPaths(replaceDirectoryChildren(createEmptyLazyFileTree(), '', nodes), expandedPaths);
}

function getFileTreeItem(name: string): HTMLElement {
  return screen.queryByRole('treeitem', { name }) ?? screen.getByRole('button', { name });
}

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

  it('keeps unauthorized AI projects out of the AI project workspace tab', async () => {
    const user = userEvent.setup();
    const onOpenAiProject = vi.fn();
    const onOpenAiProjectSettings = vi.fn();
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
        onOpenAiProjectSettings={onOpenAiProjectSettings}
      />,
    );

    expect(screen.queryByText('md-viewer')).not.toBeInTheDocument();
    expect(screen.getByText('尚未授权可在此显示的 AI 项目。请在设置页授权项目目录。')).toBeInTheDocument();
    expect(onOpenAiProject).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '配置' }));

    expect(onOpenAiProjectSettings).toHaveBeenCalledOnce();
  });

  it('renders an authorized AI project as a workspace root and routes file selection', async () => {
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
      <StatefulAiProjectDrawer
        activePath="README.md"
        project={project}
        tree={loadedLazyTree([
          { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
          {
            id: 'docs',
            type: 'directory',
            name: 'docs',
            path: 'docs',
            loadState: 'loaded',
            children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
          },
        ], ['docs'])}
        onReloadAiProject={onReloadAiProject}
        onSelectAiProjectFile={onSelectAiProjectFile}
      />,
    );

    expect(screen.getAllByRole('tree')).toHaveLength(1);
    expect(getFileTreeItem('md-viewer-authorized-root')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('md-viewer-authorized-root')).toHaveAttribute('title', '/Users/qiyu/Github/md-viewer');
    expect(getFileTreeItem('README.md')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('README.md')).toHaveAttribute('title', 'README.md');

    await user.click(getFileTreeItem('guide.md'));

    expect(onSelectAiProjectFile).toHaveBeenCalledWith(project, 'docs/guide.md');
    expect(screen.queryByRole('button', { name: /md-viewer-authorized-root/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重载当前' }));

    expect(onReloadAiProject).toHaveBeenCalledWith(project);
  });

  it('opens an authorized AI project workspace root before its tree is loaded', async () => {
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

    await user.click(getFileTreeItem('md-viewer'));

    expect(onOpenAiProject).toHaveBeenCalledWith(project);
    expect(onReloadAiProject).not.toHaveBeenCalled();
  });

  it('keeps multiple authorized AI projects in a single workspace tree', () => {
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
        aiProjectActivePaths={{ [projectB.id]: 'guide.md' }}
        aiProjects={[projectA, projectB]}
        aiProjectTrees={{
          [projectA.id]: loadedLazyTree([{ id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' }]),
          [projectB.id]: loadedLazyTree([{ id: 'guide.md', type: 'file', name: 'guide.md', path: 'guide.md' }]),
        }}
      />,
    );

    expect(screen.getAllByRole('tree')).toHaveLength(1);
    expect(getFileTreeItem('md-viewer')).toHaveAttribute('aria-expanded', 'true');
    expect(getFileTreeItem('docs')).toHaveAttribute('aria-expanded', 'true');
    expect(getFileTreeItem('README.md')).toBeInTheDocument();
    expect(getFileTreeItem('guide.md')).toHaveAttribute('aria-current', 'page');
  });

  it('routes lazy directory loading through the matching AI workspace root', async () => {
    const user = userEvent.setup();
    const onLoadProjectDirectory = vi.fn();
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
        aiProjectTrees={{
          [project.id]: loadedLazyTree([
            {
              id: 'docs',
              type: 'directory',
              name: 'docs',
              path: 'docs',
              loadState: 'unloaded',
              children: [],
            },
          ]),
        }}
        onLoadProjectDirectory={onLoadProjectDirectory}
      />,
    );

    await user.click(getFileTreeItem('docs'));

    expect(onLoadProjectDirectory).toHaveBeenCalledWith(project, 'docs');
  });
});
