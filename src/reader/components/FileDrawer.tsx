import type { AiProjectEntry, AiProjectProvider, AiProjectSourceRecord } from '../aiProjects';
import type { LazyFileTreeNode } from '../../shared/types';
import type { LazyFileTreeState } from '../lazyFileTree';
import { ArboristFileTree } from './ArboristFileTree';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

type FileDrawerTab = 'folder' | 'ai-projects';

type FileDrawerProps = {
  open: boolean;
  tree: LazyFileTreeNode[];
  activePath: string | null;
  expandedPaths: Set<string>;
  activeTab: FileDrawerTab;
  aiProjects: AiProjectEntry[];
  aiProjectSources: Partial<Record<AiProjectProvider, AiProjectSourceRecord>>;
  aiProjectTrees: Record<string, LazyFileTreeState>;
  aiProjectActivePaths: Record<string, string | null>;
  aiProjectStatus: string | null;
  activeAiProjectId: string | null;
  onOpenFolder: () => void;
  onReloadFolder: () => void;
  onFolderExpandedPathsChange: (paths: Set<string>) => void;
  onLoadFolderDirectory: (path: string) => void;
  onTabChange: (tab: FileDrawerTab) => void;
  onOpenAiProjectSettings: () => void;
  onClearAiProjects: () => void;
  onOpenAiProject: (project: AiProjectEntry) => void;
  onReloadAiProject: (project: AiProjectEntry) => void;
  onAiProjectExpandedPathsChange: (project: AiProjectEntry, paths: Set<string>) => void;
  onLoadProjectDirectory: (project: AiProjectEntry, path: string) => void;
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
  expandedPaths,
  activeTab,
  aiProjects,
  aiProjectSources,
  aiProjectTrees,
  aiProjectActivePaths,
  aiProjectStatus,
  activeAiProjectId,
  onOpenFolder,
  onReloadFolder,
  onFolderExpandedPathsChange,
  onLoadFolderDirectory,
  onTabChange,
  onOpenAiProjectSettings,
  onClearAiProjects,
  onOpenAiProject,
  onReloadAiProject,
  onAiProjectExpandedPathsChange,
  onLoadProjectDirectory,
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
          <ArboristFileTree
            heightMode="remaining-viewport"
            nodes={tree}
            activePath={activePath}
            expandedPaths={expandedPaths}
            onExpandedPathsChange={onFolderExpandedPathsChange}
            onLoadDirectory={onLoadFolderDirectory}
            onSelectFile={onSelect}
          />
        </section>
      ) : (
        <AiProjectsPanel
          projects={aiProjects}
          sources={aiProjectSources}
          projectTrees={aiProjectTrees}
          projectActivePaths={aiProjectActivePaths}
          status={aiProjectStatus}
          activeProjectId={activeAiProjectId}
          onOpenSettings={onOpenAiProjectSettings}
          onClear={onClearAiProjects}
          onOpenProject={onOpenAiProject}
          onReloadProject={onReloadAiProject}
          onProjectExpandedPathsChange={onAiProjectExpandedPathsChange}
          onLoadProjectDirectory={onLoadProjectDirectory}
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
  projectTrees: Record<string, LazyFileTreeState>;
  projectActivePaths: Record<string, string | null>;
  status: string | null;
  activeProjectId: string | null;
  onOpenSettings: () => void;
  onClear: () => void;
  onOpenProject: (project: AiProjectEntry) => void;
  onReloadProject: (project: AiProjectEntry) => void;
  onProjectExpandedPathsChange: (project: AiProjectEntry, paths: Set<string>) => void;
  onLoadProjectDirectory: (project: AiProjectEntry, path: string) => void;
  onSelectProjectFile: (project: AiProjectEntry, path: string) => void;
};

function AiProjectsPanel({
  projects,
  sources,
  projectTrees,
  projectActivePaths,
  status,
  activeProjectId,
  onOpenSettings,
  onClear,
  onOpenProject,
  onReloadProject,
  onProjectExpandedPathsChange,
  onLoadProjectDirectory,
  onSelectProjectFile,
}: AiProjectsPanelProps) {
  const hasSources = Boolean(sources.codex || sources.claude);
  const summary = formatAiProjectSummary(sources, projects.length);
  const authorizedProjects = useMemo(
    () => projects.filter((project) => Boolean(project.directoryHandle)),
    [projects],
  );
  const workspaceRootPaths = useMemo(
    () => authorizedProjects.map((project) => createAiProjectWorkspacePath(project.id)),
    [authorizedProjects],
  );
  const loadedWorkspaceRootPaths = useMemo(
    () => authorizedProjects
      .filter((project) => Boolean(projectTrees[project.id]))
      .map((project) => createAiProjectWorkspacePath(project.id)),
    [authorizedProjects, projectTrees],
  );
  const [workspaceRootExpandedPaths, setWorkspaceRootExpandedPaths] = useState<Set<string>>(
    () => new Set(loadedWorkspaceRootPaths),
  );
  const autoExpandedWorkspaceRootPathsRef = useRef(new Set(loadedWorkspaceRootPaths));
  const workspaceRootPathKey = workspaceRootPaths.join('\n');
  const loadedWorkspaceRootPathKey = loadedWorkspaceRootPaths.join('\n');
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const workspaceNodes = useMemo(
    () => authorizedProjects.map((project) => createAiProjectWorkspaceRoot(project, projectTrees[project.id])),
    [authorizedProjects, projectTrees],
  );
  const activeWorkspacePath = activeProjectId && projectActivePaths[activeProjectId]
    ? createAiProjectWorkspacePath(activeProjectId, projectActivePaths[activeProjectId] ?? '')
    : null;
  const workspaceExpandedPaths = useMemo(
    () => createAiProjectWorkspaceExpandedPaths(authorizedProjects, projectTrees, workspaceRootExpandedPaths),
    [authorizedProjects, projectTrees, workspaceRootExpandedPaths],
  );
  const activeProject = activeProjectId ? projectById.get(activeProjectId) ?? null : null;

  useEffect(() => {
    const workspaceRootPathSet = new Set(workspaceRootPaths);
    const loadedWorkspaceRootPathSet = new Set(loadedWorkspaceRootPaths);

    for (const rootPath of [...autoExpandedWorkspaceRootPathsRef.current]) {
      if (!workspaceRootPathSet.has(rootPath)) {
        autoExpandedWorkspaceRootPathsRef.current.delete(rootPath);
      }
    }

    setWorkspaceRootExpandedPaths((current) => {
      let changed = false;
      const next = new Set<string>();

      for (const rootPath of current) {
        if (workspaceRootPathSet.has(rootPath)) {
          next.add(rootPath);
        } else {
          changed = true;
        }
      }

      for (const rootPath of loadedWorkspaceRootPathSet) {
        if (!autoExpandedWorkspaceRootPathsRef.current.has(rootPath)) {
          next.add(rootPath);
          autoExpandedWorkspaceRootPathsRef.current.add(rootPath);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [workspaceRootPathKey, loadedWorkspaceRootPathKey, workspaceRootPaths, loadedWorkspaceRootPaths]);

  function handleWorkspaceExpandedPathsChange(paths: Set<string>) {
    const nextRootExpandedPaths = new Set<string>();
    const nextProjectExpandedPaths = new Map<string, Set<string>>();

    for (const path of paths) {
      const location = parseAiProjectWorkspacePath(path);
      if (!location) {
        continue;
      }

      if (!location.relativePath) {
        nextRootExpandedPaths.add(path);
        continue;
      }

      const projectPaths = nextProjectExpandedPaths.get(location.projectId) ?? new Set<string>();
      projectPaths.add(location.relativePath);
      nextProjectExpandedPaths.set(location.projectId, projectPaths);
    }

    setWorkspaceRootExpandedPaths(nextRootExpandedPaths);

    for (const project of authorizedProjects) {
      const projectTree = projectTrees[project.id];
      if (!projectTree) {
        continue;
      }

      const nextProjectPaths = nextProjectExpandedPaths.get(project.id) ?? new Set<string>();
      if (!areStringSetsEqual(projectTree.expandedPaths, nextProjectPaths)) {
        onProjectExpandedPathsChange(project, nextProjectPaths);
      }
    }
  }

  function handleWorkspaceLoadDirectory(path: string) {
    const location = parseAiProjectWorkspacePath(path);
    if (!location) {
      return;
    }

    const project = projectById.get(location.projectId);
    if (!project) {
      return;
    }

    if (!location.relativePath) {
      onOpenProject(project);
      return;
    }

    onLoadProjectDirectory(project, location.relativePath);
  }

  function handleWorkspaceSelectFile(path: string) {
    const location = parseAiProjectWorkspacePath(path);
    if (!location?.relativePath) {
      return;
    }

    const project = projectById.get(location.projectId);
    if (!project) {
      return;
    }

    onSelectProjectFile(project, location.relativePath);
  }

  return (
    <section className="file-drawer__panel ai-projects" role="tabpanel" aria-label="AI 项目">
      <div className="ai-projects__toolbar">
        <span>{summary}</span>
        <span className="ai-projects__toolbar-actions">
          {activeProject?.directoryHandle && (
            <button type="button" onClick={() => onReloadProject(activeProject)}>
              重载当前
            </button>
          )}
          <button type="button" onClick={onOpenSettings}>
            配置
          </button>
          <button type="button" onClick={onClear} disabled={!projects.length && !sources.codex && !sources.claude}>
            清空
          </button>
        </span>
      </div>
      {status && <p className="ai-projects__status">{status}</p>}
      {workspaceNodes.length ? (
        <div className="ai-projects__workspace">
          <ArboristFileTree
            heightMode="scroll-container"
            nodes={workspaceNodes}
            activePath={activeWorkspacePath}
            expandedPaths={workspaceExpandedPaths}
            getNodeTitle={(node) => getAiProjectWorkspaceNodeTitle(node, projectById)}
            onExpandedPathsChange={handleWorkspaceExpandedPathsChange}
            onLoadDirectory={handleWorkspaceLoadDirectory}
            onSelectFile={handleWorkspaceSelectFile}
          />
        </div>
      ) : (
        <p className="empty-note">{formatAiProjectEmptyNote(hasSources, projects.length)}</p>
      )}
    </section>
  );
}

const AI_PROJECT_WORKSPACE_PREFIX = 'ai-project:';

function createAiProjectWorkspacePath(projectId: string, relativePath = ''): string {
  const rootPath = `${AI_PROJECT_WORKSPACE_PREFIX}${encodeURIComponent(projectId)}`;
  return relativePath ? `${rootPath}/${relativePath}` : rootPath;
}

function parseAiProjectWorkspacePath(
  path: string,
): { projectId: string; relativePath: string } | null {
  if (!path.startsWith(AI_PROJECT_WORKSPACE_PREFIX)) {
    return null;
  }

  const separatorIndex = path.indexOf('/', AI_PROJECT_WORKSPACE_PREFIX.length);
  const encodedProjectId = separatorIndex >= 0
    ? path.slice(AI_PROJECT_WORKSPACE_PREFIX.length, separatorIndex)
    : path.slice(AI_PROJECT_WORKSPACE_PREFIX.length);

  try {
    return {
      projectId: decodeURIComponent(encodedProjectId),
      relativePath: separatorIndex >= 0 ? path.slice(separatorIndex + 1) : '',
    };
  } catch {
    return null;
  }
}

function createAiProjectWorkspaceRoot(project: AiProjectEntry, tree: LazyFileTreeState | undefined): LazyFileTreeNode {
  const rootPath = createAiProjectWorkspacePath(project.id);

  return {
    id: rootPath,
    type: 'directory',
    name: project.directoryName ?? project.name,
    path: rootPath,
    children: tree ? createAiProjectWorkspaceNodes(project.id, tree.nodes) : [],
    loadState: tree ? 'loaded' : 'unloaded',
  };
}

function createAiProjectWorkspaceNodes(projectId: string, nodes: LazyFileTreeNode[]): LazyFileTreeNode[] {
  return nodes.map((node): LazyFileTreeNode => {
    const path = createAiProjectWorkspacePath(projectId, node.path);

    if (node.type === 'file') {
      return {
        ...node,
        id: path,
        path,
      };
    }

    return {
      ...node,
      id: path,
      path,
      children: createAiProjectWorkspaceNodes(projectId, node.children),
    };
  });
}

function createAiProjectWorkspaceExpandedPaths(
  projects: AiProjectEntry[],
  projectTrees: Record<string, LazyFileTreeState>,
  workspaceRootExpandedPaths: Set<string>,
): Set<string> {
  const paths = new Set(workspaceRootExpandedPaths);

  for (const project of projects) {
    const tree = projectTrees[project.id];
    if (!tree) {
      continue;
    }

    for (const path of tree.expandedPaths) {
      paths.add(createAiProjectWorkspacePath(project.id, path));
    }
  }

  return paths;
}

function getAiProjectWorkspaceNodeTitle(node: LazyFileTreeNode, projectById: Map<string, AiProjectEntry>): string {
  const location = parseAiProjectWorkspacePath(node.path);
  if (!location) {
    return node.path;
  }

  return location.relativePath || projectById.get(location.projectId)?.expectedPath || node.name;
}

function areStringSetsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function formatAiProjectEmptyNote(hasSources: boolean, projectCount: number): string {
  if (projectCount) {
    return '尚未授权可在此显示的 AI 项目。请在设置页授权项目目录。';
  }

  return hasSources
    ? '配置目录已授权。请在设置页重扫 AI 项目来源。'
    : '尚未配置 AI 项目来源。前往设置授权 Codex 或 Claude Code 配置目录。';
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
