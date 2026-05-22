import type { AiProjectEntry, AiProjectProvider, AiProjectSourceRecord } from '../aiProjects';
import type { FileTreeNode } from '../../shared/types';
import { FileTree } from './FileTree';
import type { KeyboardEvent, PointerEvent } from 'react';

type FileDrawerTab = 'folder' | 'ai-projects';

type FileDrawerProps = {
  open: boolean;
  tree: FileTreeNode[];
  activePath: string | null;
  activeTab: FileDrawerTab;
  aiProjects: AiProjectEntry[];
  aiProjectSources: Partial<Record<AiProjectProvider, AiProjectSourceRecord>>;
  aiProjectTrees: Record<string, FileTreeNode[]>;
  aiProjectStatus: string | null;
  activeAiProjectId: string | null;
  onOpenFolder: () => void;
  onReloadFolder: () => void;
  onTabChange: (tab: FileDrawerTab) => void;
  onOpenAiProjectSettings: () => void;
  onClearAiProjects: () => void;
  onOpenAiProject: (project: AiProjectEntry) => void;
  onReloadAiProject: (project: AiProjectEntry) => void;
  onSelectAiProjectFile: (project: AiProjectEntry, path: string) => void;
  onClose: () => void;
  onSelect: (path: string) => void;
  onResizeStart?: (event: PointerEvent<HTMLDivElement>) => void;
  onResizeKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function FileDrawer({
  open,
  tree,
  activePath,
  activeTab,
  aiProjects,
  aiProjectSources,
  aiProjectTrees,
  aiProjectStatus,
  activeAiProjectId,
  onOpenFolder,
  onReloadFolder,
  onTabChange,
  onOpenAiProjectSettings,
  onClearAiProjects,
  onOpenAiProject,
  onReloadAiProject,
  onSelectAiProjectFile,
  onClose,
  onSelect,
  onResizeStart,
  onResizeKeyDown,
}: FileDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <aside className="file-drawer is-open" aria-label="文件列表">
      <div className="file-drawer__header">
        <div className="file-drawer__tabs" role="tablist" aria-label="文件来源">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'folder'}
            className={activeTab === 'folder' ? 'is-active' : undefined}
            onClick={() => onTabChange('folder')}
          >
            文件夹
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ai-projects'}
            className={activeTab === 'ai-projects' ? 'is-active' : undefined}
            onClick={() => onTabChange('ai-projects')}
          >
            AI 项目
          </button>
        </div>
        <button
          type="button"
          className="file-drawer__close"
          aria-label="关闭文件面板"
          title="关闭文件面板"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {activeTab === 'folder' ? (
        <section className="file-drawer__panel" role="tabpanel" aria-label="文件夹">
          <div className="file-drawer__panel-actions">
            <button type="button" onClick={onOpenFolder}>
              打开文件夹
            </button>
            <button type="button" onClick={onReloadFolder} title="重新扫描当前文件夹">
              重载目录
            </button>
          </div>
          <FileTree tree={tree} activePath={activePath} onSelect={onSelect} />
        </section>
      ) : (
        <AiProjectsPanel
          projects={aiProjects}
          sources={aiProjectSources}
          projectTrees={aiProjectTrees}
          status={aiProjectStatus}
          activeProjectId={activeAiProjectId}
          activePath={activePath}
          onOpenSettings={onOpenAiProjectSettings}
          onClear={onClearAiProjects}
          onOpenProject={onOpenAiProject}
          onReloadProject={onReloadAiProject}
          onSelectProjectFile={onSelectAiProjectFile}
        />
      )}
      {(onResizeStart || onResizeKeyDown) && (
        <div
          role="separator"
          aria-label="调整文件面板宽度"
          aria-orientation="vertical"
          tabIndex={0}
          className="file-drawer__resize-handle"
          onPointerDown={onResizeStart}
          onKeyDown={onResizeKeyDown}
        />
      )}
    </aside>
  );
}

type AiProjectsPanelProps = {
  projects: AiProjectEntry[];
  sources: Partial<Record<AiProjectProvider, AiProjectSourceRecord>>;
  projectTrees: Record<string, FileTreeNode[]>;
  status: string | null;
  activeProjectId: string | null;
  activePath: string | null;
  onOpenSettings: () => void;
  onClear: () => void;
  onOpenProject: (project: AiProjectEntry) => void;
  onReloadProject: (project: AiProjectEntry) => void;
  onSelectProjectFile: (project: AiProjectEntry, path: string) => void;
};

function AiProjectsPanel({
  projects,
  sources,
  projectTrees,
  status,
  activeProjectId,
  activePath,
  onOpenSettings,
  onClear,
  onOpenProject,
  onReloadProject,
  onSelectProjectFile,
}: AiProjectsPanelProps) {
  const hasSources = Boolean(sources.codex || sources.claude);
  const summary = formatAiProjectSummary(sources, projects.length);

  return (
    <section className="file-drawer__panel ai-projects" role="tabpanel" aria-label="AI 项目">
      <div className="ai-projects__toolbar">
        <span>{summary}</span>
        <span className="ai-projects__toolbar-actions">
          <button type="button" onClick={onOpenSettings}>
            配置
          </button>
          <button type="button" onClick={onClear} disabled={!projects.length && !sources.codex && !sources.claude}>
            清空
          </button>
        </span>
      </div>
      {status && <p className="ai-projects__status">{status}</p>}
      {projects.length ? (
        <ul className="ai-projects__list">
          {projects.map((project) => {
            const tree = projectTrees[project.id];
            const showReload = Boolean(project.directoryHandle || tree);

            return (
              <li key={project.id}>
                <div className={`ai-project-row${project.id === activeProjectId ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className="ai-project-row__main"
                    title={project.expectedPath}
                    onClick={() => onOpenProject(project)}
                  >
                    <span className="ai-project-row__name">{project.name}</span>
                    <span className="ai-project-row__meta">
                      {getProviderLabel(project.provider)} · {project.directoryHandle ? '已授权' : '未授权'}
                    </span>
                  </button>
                  {showReload && (
                    <button
                      type="button"
                      className="ai-project-row__reload"
                      aria-label={`重载项目：${project.name}`}
                      title={`重载项目：${project.name}`}
                      onClick={() => onReloadProject(project)}
                    >
                      ↻
                    </button>
                  )}
                </div>
                {tree && (
                  <div className="ai-project-tree">
                    <FileTree
                      tree={tree}
                      activePath={activePath}
                      onSelect={(path) => onSelectProjectFile(project, path)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty-note">
          {hasSources
            ? '配置目录已授权。请在设置页重扫 AI 项目来源。'
            : '尚未配置 AI 项目来源。前往设置授权 Codex 或 Claude Code 配置目录。'}
        </p>
      )}
    </section>
  );
}

function getProviderLabel(provider: AiProjectProvider): string {
  return provider === 'codex' ? 'Codex' : 'Claude Code';
}

function formatAiProjectSummary(
  sources: Partial<Record<AiProjectProvider, AiProjectSourceRecord>>,
  projectCount: number,
): string {
  const labels = [
    sources.codex ? 'Codex' : null,
    sources.claude ? 'Claude' : null,
  ].filter(Boolean);

  const projectText = projectCount ? `${projectCount} 个项目` : '尚未扫描项目';

  return labels.length ? `${labels.join(' / ')} · ${projectText}` : projectText;
}
