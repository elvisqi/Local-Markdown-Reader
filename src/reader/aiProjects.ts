import {
  canReadDirectory,
  createIndexedDbReaderStateStore,
  requestDirectoryReadPermission,
  type ReaderStateStore,
} from './recentDocument';
import { openDirectory } from './fileSystemAccess';

export type AiProjectProvider = 'codex' | 'claude';

export type AiProjectEntry = {
  id: string;
  provider: AiProjectProvider;
  name: string;
  expectedPath: string;
  discoveredAt: number;
  directoryHandle?: FileSystemDirectoryHandle;
  directoryName?: string;
  openedAt?: number;
};

export type AiProjectSourceRecord = {
  provider: AiProjectProvider;
  rootHandle: FileSystemDirectoryHandle;
  rootName: string;
  scannedAt: number;
  projectCount: number;
};

export type AiProjectState = {
  sources: Partial<Record<AiProjectProvider, AiProjectSourceRecord>>;
  projects: AiProjectEntry[];
};

export type AiProjectScanResult = {
  provider: AiProjectProvider;
  projects: AiProjectEntry[];
  warnings: string[];
};

type DirectoryLike = Pick<FileSystemDirectoryHandle, 'kind' | 'name' | 'entries'>;
type FileLike = Pick<FileSystemFileHandle, 'kind' | 'name' | 'getFile'>;

const AI_PROJECT_STATE_KEY = 'aiProjectState';
const JSON_PREFIX_BYTES = 64 * 1024;
const MAX_CODEX_SESSION_FILES = 500;
const MAX_CLAUDE_PROJECTS = 500;
const MAX_CLAUDE_PROJECT_FILES = 12;

export const EMPTY_AI_PROJECT_STATE: AiProjectState = {
  sources: {},
  projects: [],
};

export function getAiProjectProviderLabel(provider: AiProjectProvider): string {
  return provider === 'codex' ? 'Codex' : 'Claude Code';
}

export async function scanAiProjects(
  provider: AiProjectProvider,
  rootHandle: FileSystemDirectoryHandle,
): Promise<AiProjectScanResult> {
  const warnings: string[] = [];
  const candidates = provider === 'codex'
    ? await scanCodexProjectPaths(rootHandle as DirectoryLike, warnings)
    : await scanClaudeProjectPaths(rootHandle as DirectoryLike, warnings);

  return {
    provider,
    warnings,
    projects: createProjectEntries(provider, candidates),
  };
}

export function mergeAiProjectScan(
  state: AiProjectState,
  provider: AiProjectProvider,
  rootHandle: FileSystemDirectoryHandle,
  scannedProjects: AiProjectEntry[],
): AiProjectState {
  const previousById = new Map(state.projects.map((project) => [project.id, project]));
  const nextScannedProjects = scannedProjects.map((project) => ({
    ...project,
    directoryHandle: previousById.get(project.id)?.directoryHandle,
    directoryName: previousById.get(project.id)?.directoryName,
    openedAt: previousById.get(project.id)?.openedAt,
  }));
  const otherProjects = state.projects.filter((project) => project.provider !== provider);

  return sortAiProjectState({
    sources: {
      ...state.sources,
      [provider]: {
        provider,
        rootHandle,
        rootName: rootHandle.name,
        scannedAt: Date.now(),
        projectCount: nextScannedProjects.length,
      },
    },
    projects: [...otherProjects, ...nextScannedProjects],
  });
}

export function mergeAiProjectDirectory(
  state: AiProjectState,
  project: AiProjectEntry,
  directoryHandle: FileSystemDirectoryHandle,
): AiProjectState {
  const updatedProject: AiProjectEntry = {
    ...project,
    directoryHandle,
    directoryName: directoryHandle.name,
    openedAt: Date.now(),
  };

  return sortAiProjectState({
    ...state,
    projects: state.projects.map((entry) => (entry.id === project.id ? updatedProject : entry)),
  });
}

export async function loadAiProjectState(
  store: ReaderStateStore | null = createIndexedDbReaderStateStore(),
): Promise<AiProjectState> {
  if (!store) {
    return EMPTY_AI_PROJECT_STATE;
  }

  const state = await store.get(AI_PROJECT_STATE_KEY);
  return isAiProjectState(state) ? state : EMPTY_AI_PROJECT_STATE;
}

export async function saveAiProjectState(
  state: AiProjectState,
  store: ReaderStateStore | null = createIndexedDbReaderStateStore(),
): Promise<void> {
  if (!store) {
    return;
  }

  await store.set(AI_PROJECT_STATE_KEY, state);
}

export async function clearAiProjectState(
  store: ReaderStateStore | null = createIndexedDbReaderStateStore(),
): Promise<void> {
  if (!store) {
    return;
  }

  await store.remove(AI_PROJECT_STATE_KEY);
}

export async function canReadAiProjectSource(source: AiProjectSourceRecord): Promise<boolean> {
  return canReadDirectory(source.rootHandle);
}

export async function requestAiProjectSourcePermission(source: AiProjectSourceRecord): Promise<boolean> {
  return requestDirectoryReadPermission(source.rootHandle);
}

export async function requestAiProjectDirectoryPermission(project: AiProjectEntry): Promise<boolean> {
  return project.directoryHandle ? requestDirectoryReadPermission(project.directoryHandle) : false;
}

export async function authorizeAiProjectSource(
  state: AiProjectState,
  provider: AiProjectProvider,
): Promise<{ state: AiProjectState; warnings: string[] }> {
  const handle = await openDirectory();
  return scanAndMergeAiProjectSource(state, provider, handle);
}

export async function rescanAiProjectSource(
  state: AiProjectState,
  provider: AiProjectProvider,
): Promise<{ state: AiProjectState; warnings: string[] }> {
  const source = state.sources[provider];

  if (!source) {
    throw new Error(`请先授权 ${getAiProjectProviderLabel(provider)} 配置目录。`);
  }

  const hasPermission = await requestAiProjectSourcePermission(source);

  if (!hasPermission) {
    throw new Error(`需要重新授权 ${getAiProjectProviderLabel(provider)} 配置目录。`);
  }

  return scanAndMergeAiProjectSource(state, provider, source.rootHandle);
}

async function scanAndMergeAiProjectSource(
  state: AiProjectState,
  provider: AiProjectProvider,
  rootHandle: FileSystemDirectoryHandle,
): Promise<{ state: AiProjectState; warnings: string[] }> {
  const scanResult = await scanAiProjects(provider, rootHandle);

  return {
    state: mergeAiProjectScan(state, provider, rootHandle, scanResult.projects),
    warnings: scanResult.warnings,
  };
}

async function scanCodexProjectPaths(handle: DirectoryLike, warnings: string[]): Promise<ProjectPathCandidate[]> {
  const candidates: ProjectPathCandidate[] = [];

  if (handle.name !== '.codex') {
    warnings.push('建议选择用户目录下的 .codex 文件夹。');
  }

  await collectCodexGlobalStatePaths(handle, candidates);
  await collectCodexSessionPaths(handle, candidates);

  return candidates;
}

async function collectCodexGlobalStatePaths(
  handle: DirectoryLike,
  candidates: ProjectPathCandidate[],
): Promise<void> {
  for (const name of ['.codex-global-state.json', '.codex-global-state.json.bak']) {
    const fileHandle = await getFileHandle(handle, name);

    if (!fileHandle) {
      continue;
    }

    const file = await fileHandle.getFile();
    const parsed = parseJsonObject(await file.text());

    if (!parsed) {
      continue;
    }

    for (const path of collectAbsolutePathStrings(parsed)) {
      candidates.push({
        expectedPath: path,
        discoveredAt: file.lastModified || Date.now(),
      });
    }
  }
}

async function collectCodexSessionPaths(handle: DirectoryLike, candidates: ProjectPathCandidate[]): Promise<void> {
  const sessions = await getDirectoryHandle(handle, 'sessions');

  if (!sessions) {
    return;
  }

  const files: FileLike[] = [];
  await collectJsonlFiles(sessions, files, MAX_CODEX_SESSION_FILES);

  for (const fileHandle of files) {
    const file = await fileHandle.getFile();
    const cwd = extractCwdFromJsonlPrefix(await readBlobPrefix(file, JSON_PREFIX_BYTES));

    if (cwd) {
      candidates.push({
        expectedPath: cwd,
        discoveredAt: file.lastModified || Date.now(),
      });
    }
  }
}

async function scanClaudeProjectPaths(handle: DirectoryLike, warnings: string[]): Promise<ProjectPathCandidate[]> {
  const candidates: ProjectPathCandidate[] = [];

  if (handle.name !== '.claude') {
    warnings.push('建议选择用户目录下的 .claude 文件夹。');
  }

  const projects = await getDirectoryHandle(handle, 'projects');

  if (!projects) {
    warnings.push('没有找到 projects 目录。');
    return candidates;
  }

  let visitedProjects = 0;

  for await (const [, entry] of projects.entries()) {
    if (entry.kind !== 'directory') {
      continue;
    }

    visitedProjects += 1;

    if (visitedProjects > MAX_CLAUDE_PROJECTS) {
      warnings.push(`项目数量超过 ${MAX_CLAUDE_PROJECTS}，已停止继续扫描。`);
      break;
    }

    const projectDirectory = entry as DirectoryLike;
    const directJsonlFiles: FileLike[] = [];

    for await (const [, projectEntry] of projectDirectory.entries()) {
      if (projectEntry.kind === 'file' && projectEntry.name.toLowerCase().endsWith('.jsonl')) {
        directJsonlFiles.push(projectEntry as FileLike);
      }

      if (directJsonlFiles.length >= MAX_CLAUDE_PROJECT_FILES) {
        break;
      }
    }

    const cwd = await findCwdInJsonlFiles(directJsonlFiles);
    const expectedPath = cwd ?? decodeClaudeProjectDirectoryName(projectDirectory.name);

    if (expectedPath) {
      candidates.push({
        expectedPath,
        discoveredAt: Date.now(),
      });
    }
  }

  return candidates;
}

async function findCwdInJsonlFiles(files: FileLike[]): Promise<string | null> {
  for (const fileHandle of files) {
    const file = await fileHandle.getFile();
    const cwd = extractCwdFromJsonlPrefix(await readBlobPrefix(file, JSON_PREFIX_BYTES));

    if (cwd) {
      return cwd;
    }
  }

  return null;
}

type ProjectPathCandidate = {
  expectedPath: string;
  discoveredAt: number;
};

function createProjectEntries(provider: AiProjectProvider, candidates: ProjectPathCandidate[]): AiProjectEntry[] {
  const byPath = new Map<string, ProjectPathCandidate>();

  for (const candidate of candidates) {
    if (!isLikelyProjectPath(candidate.expectedPath)) {
      continue;
    }

    const normalizedPath = normalizeAbsolutePath(candidate.expectedPath);
    const previous = byPath.get(normalizedPath);

    if (!previous || candidate.discoveredAt > previous.discoveredAt) {
      byPath.set(normalizedPath, {
        expectedPath: normalizedPath,
        discoveredAt: candidate.discoveredAt,
      });
    }
  }

  return [...byPath.values()]
    .map((candidate) => ({
      id: `${provider}:${candidate.expectedPath}`,
      provider,
      name: selectProjectName(candidate.expectedPath),
      expectedPath: candidate.expectedPath,
      discoveredAt: candidate.discoveredAt,
    }))
    .sort(compareAiProjects);
}

function sortAiProjectState(state: AiProjectState): AiProjectState {
  return {
    sources: state.sources,
    projects: [...state.projects].sort(compareAiProjects),
  };
}

function compareAiProjects(a: AiProjectEntry, b: AiProjectEntry): number {
  const openedDifference = (b.openedAt ?? 0) - (a.openedAt ?? 0);

  if (openedDifference !== 0) {
    return openedDifference;
  }

  if (a.provider !== b.provider) {
    return getAiProjectProviderLabel(a.provider).localeCompare(getAiProjectProviderLabel(b.provider));
  }

  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function collectAbsolutePathStrings(value: unknown): string[] {
  const paths: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      if (node.startsWith('/')) {
        paths.push(node);
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (typeof node === 'object' && node !== null) {
      for (const item of Object.values(node)) {
        visit(item);
      }
    }
  };

  visit(value);
  return paths;
}

function extractCwdFromJsonlPrefix(source: string): string | null {
  for (const line of source.split(/\r?\n/).slice(0, 12)) {
    if (!line.trim()) {
      continue;
    }

    const parsed = parseJsonObject(line);
    const cwd = selectCwd(parsed);

    if (cwd) {
      return cwd;
    }
  }

  return null;
}

function selectCwd(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if ('cwd' in value && typeof value.cwd === 'string') {
    return value.cwd;
  }

  if ('payload' in value) {
    return selectCwd(value.payload);
  }

  return null;
}

function parseJsonObject(source: string): unknown | null {
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

async function collectJsonlFiles(handle: DirectoryLike, files: FileLike[], maxFiles: number): Promise<void> {
  for await (const [, entry] of handle.entries()) {
    if (files.length >= maxFiles) {
      return;
    }

    if (entry.kind === 'directory') {
      await collectJsonlFiles(entry as DirectoryLike, files, maxFiles);
      continue;
    }

    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.jsonl')) {
      files.push(entry as FileLike);
    }
  }
}

async function getDirectoryHandle(handle: DirectoryLike, name: string): Promise<DirectoryLike | null> {
  for await (const [entryName, entry] of handle.entries()) {
    if (entryName === name && entry.kind === 'directory') {
      return entry as DirectoryLike;
    }
  }

  return null;
}

async function getFileHandle(handle: DirectoryLike, name: string): Promise<FileLike | null> {
  for await (const [entryName, entry] of handle.entries()) {
    if (entryName === name && entry.kind === 'file') {
      return entry as FileLike;
    }
  }

  return null;
}

function readBlobPrefix(blob: Blob, bytes: number): Promise<string> {
  return blob.slice(0, bytes).text();
}

function decodeClaudeProjectDirectoryName(name: string): string | null {
  if (!name.startsWith('-')) {
    return null;
  }

  const parts = name.slice(1).split('-').filter(Boolean);

  if (parts[0] === 'Users' && parts.length >= 3) {
    const [root, user, container, ...rest] = parts;

    if (!rest.length) {
      return `/${root}/${user}/${container}`;
    }

    if (isCommonUserProjectContainer(container)) {
      return `/${root}/${user}/${container}/${rest.join('-')}`;
    }

    return `/${root}/${user}/${[container, ...rest].join('-')}`;
  }

  const decoded = `/${parts.join('/')}`;
  return decoded.length > 1 ? decoded : null;
}

function isCommonUserProjectContainer(name: string): boolean {
  return ['Desktop', 'Documents', 'Downloads', 'Github', 'GitHub', 'Gitlab', 'GitLab', 'Projects', 'Workspace'].includes(name);
}

function isLikelyProjectPath(path: string): boolean {
  const normalizedPath = normalizeAbsolutePath(path);

  if (!normalizedPath.startsWith('/')) {
    return false;
  }

  if (normalizedPath.includes('/.codex/') || normalizedPath.includes('/.claude/')) {
    return false;
  }

  const name = selectProjectName(normalizedPath);

  return Boolean(name) && !name.includes('.');
}

function normalizeAbsolutePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function selectProjectName(path: string): string {
  return normalizeAbsolutePath(path).split('/').filter(Boolean).at(-1) ?? path;
}

function isAiProjectState(value: unknown): value is AiProjectState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sources' in value &&
    'projects' in value &&
    Array.isArray((value as { projects: unknown }).projects)
  );
}
