import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import { flattenDocumentFiles, getDocumentFileKind, selectDefaultDocument } from '../shared/fileSystem';
import { renderHtmlDocument } from '../shared/render/html';
import { resolveMarkdownHref } from '../shared/render/links';
import { renderMarkdown } from '../shared/render/markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, subscribeSettings } from '../shared/settings';
import { consumeTemporaryMarkdownDocument, type TemporaryMarkdownDocument } from '../shared/temporaryDocument';
import type { FileTreeNode, OutlineItem, RenderResult } from '../shared/types';
import { selectActiveHeadingId } from './activeHeading';
import {
  clearAiProjectState,
  EMPTY_AI_PROJECT_STATE,
  loadAiProjectState,
  mergeAiProjectDirectory,
  requestAiProjectDirectoryPermission,
  saveAiProjectState,
  type AiProjectEntry,
  type AiProjectState,
} from './aiProjects';
import { FileDrawer } from './components/FileDrawer';
import { LargeDocumentReader } from './components/LargeDocumentReader';
import { OutlinePanel } from './components/OutlinePanel';
import { ReaderToolbar } from './components/ReaderToolbar';
import { reloadCurrentDocument } from './currentDocumentReload';
import { selectSiblingMarkdownNavigation } from './fileNavigation';
import {
  openDirectory,
  openDocumentFile,
  readAssetFile,
  readDocumentFile,
  readDocumentFileSnapshot,
  readMarkdownFileSlice,
  scanMarkdownDirectory,
  type DocumentFileSnapshot,
} from './fileSystemAccess';
import { createHtmlPreviewDocument, type HtmlPreviewDocument } from './htmlPreview';
import {
  classifyMarkdownDocument,
  LARGE_MARKDOWN_BYTES,
  LARGE_SAMPLE_BYTES,
  type LargeDocumentKind,
  type LargeOutlineItem,
} from './largeDocument';
import type { LargeDocumentIndex } from './largeDocumentIndex';
import { createLargeDocumentWorkerClient, type LargeDocumentWorkerClient } from './largeDocumentWorkerClient';
import {
  canReadDirectory,
  loadLastDocument,
  requestDirectoryReadPermission,
  saveLastDocument,
  selectRememberedDocumentPath,
  type LastDocumentRecord,
} from './recentDocument';
import { RenderedMarkdownContent } from './RenderedMarkdownContent';
import { installTableFullscreen } from './tableFullscreen';
import './App.css';

const EMPTY_RENDER: RenderResult = {
  html: '',
  outline: [],
  title: null,
  links: [],
  diagnostics: [],
};
const KEYBOARD_SCROLL_STEP = 160;
const DEFAULT_FILE_DRAWER_WIDTH = 360;
const MIN_FILE_DRAWER_WIDTH = 260;
const MAX_FILE_DRAWER_WIDTH = 640;
const LAYOUT_PREFERENCES_KEY = 'localMarkdownReader.layoutPreferences';

type ReaderLayoutPreferences = {
  fileDrawerOpen: boolean;
  fileDrawerWidth: number;
};

type LargeDocumentSession = {
  kind: Exclude<LargeDocumentKind, 'normal'>;
  reason: string;
  file: File;
  index: LargeDocumentIndex;
  client: LargeDocumentWorkerClient;
  rememberRecord?: LastDocumentRecord;
};

type ActiveDocumentKind = 'markdown' | 'html';
type FileDrawerTab = 'folder' | 'ai-projects';

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const initialLayoutPreferences = useMemo(loadReaderLayoutPreferences, []);
  const [drawerOpen, setDrawerOpen] = useState(initialLayoutPreferences.fileDrawerOpen);
  const [drawerWidth, setDrawerWidth] = useState(initialLayoutPreferences.fileDrawerWidth);
  const [isResizingFileDrawer, setIsResizingFileDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<FileDrawerTab>('folder');
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeAiProjectId, setActiveAiProjectId] = useState<string | null>(null);
  const [aiProjectState, setAiProjectState] = useState<AiProjectState>(EMPTY_AI_PROJECT_STATE);
  const [aiProjectTrees, setAiProjectTrees] = useState<Record<string, FileTreeNode[]>>({});
  const [aiProjectStatus, setAiProjectStatus] = useState<string | null>(null);
  const [activeDocumentKind, setActiveDocumentKind] = useState<ActiveDocumentKind>('markdown');
  const [markdown, setMarkdown] = useState('');
  const [rendered, setRendered] = useState<RenderResult>(EMPTY_RENDER);
  const [htmlPreviewDocument, setHtmlPreviewDocument] = useState<HtmlPreviewDocument | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [lastDocument, setLastDocument] = useState<LastDocumentRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawActionStatus, setRawActionStatus] = useState<string | null>(null);
  const [largeDocument, setLargeDocument] = useState<LargeDocumentSession | null>(null);
  const [largeAnchorLine, setLargeAnchorLine] = useState(1);
  const renderedContentRef = useRef<HTMLDivElement | null>(null);
  const htmlPreviewRef = useRef<HTMLIFrameElement | null>(null);
  const [htmlPreviewLoadCount, setHtmlPreviewLoadCount] = useState(0);
  const title = useMemo(() => rendered.title ?? activePath ?? 'Markdown Reader', [activePath, rendered.title]);
  const htmlPreviewActive = activeDocumentKind === 'html' && !largeDocument && !settings.reading.rawMode;
  const fileNavigation = useMemo(
    () => selectSiblingMarkdownNavigation(tree, activePath),
    [activePath, tree],
  );

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    saveReaderLayoutPreferences({
      fileDrawerOpen: drawerOpen,
      fileDrawerWidth: drawerWidth,
    });
  }, [drawerOpen, drawerWidth]);

  useEffect(() => {
    void loadAiProjectState().then(setAiProjectState);
  }, []);

  useEffect(() => {
    if (drawerOpen && drawerTab === 'ai-projects') {
      void loadAiProjectState().then(setAiProjectState);
    }
  }, [drawerOpen, drawerTab]);

  useEffect(() => {
    void openInitialDocument();
  }, []);

  useEffect(() => {
    return subscribeSettings(setSettings);
  }, []);

  useEffect(() => {
    return () => largeDocument?.client.terminate();
  }, [largeDocument?.client]);

  useEffect(() => {
    return () => {
      htmlPreviewDocument?.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [htmlPreviewDocument]);

  useEffect(() => {
    setActiveHeadingId(rendered.outline[0]?.id ?? null);
  }, [rendered.outline]);

  useEffect(() => {
    if (activeDocumentKind === 'html') {
      return undefined;
    }

    const updateActiveHeading = () => {
      const headings = Array.from(document.querySelectorAll<HTMLElement>('.document-reader h1[id], .document-reader h2[id], .document-reader h3[id], .document-reader h4[id], .document-reader h5[id], .document-reader h6[id]')).map(
        (heading) => ({
          id: heading.id,
          top: heading.getBoundingClientRect().top,
        }),
      );
      const nextActiveId = selectActiveHeadingId(headings, 76);
      setActiveHeadingId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    updateActiveHeading();
    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    window.addEventListener('resize', updateActiveHeading);

    return () => {
      window.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', updateActiveHeading);
    };
  }, [activeDocumentKind, rendered.html]);

  useEffect(() => {
    if (activeDocumentKind !== 'html') {
      return undefined;
    }

    const frameWindow = htmlPreviewRef.current?.contentWindow;
    const frameDocument = htmlPreviewRef.current?.contentDocument;

    if (!frameWindow || !frameDocument) {
      return undefined;
    }

    const updateActiveHeading = () => {
      const headings = getHtmlPreviewHeadingPositions(frameDocument, rendered.outline);
      const nextActiveId = selectActiveHeadingId(headings, 24);
      setActiveHeadingId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    updateActiveHeading();
    frameWindow.addEventListener('scroll', updateActiveHeading, { passive: true });
    frameWindow.addEventListener('resize', updateActiveHeading);

    return () => {
      frameWindow.removeEventListener('scroll', updateActiveHeading);
      frameWindow.removeEventListener('resize', updateActiveHeading);
    };
  }, [activeDocumentKind, htmlPreviewLoadCount, rendered.outline]);

  useEffect(() => {
    if (!renderedContentRef.current || settings.reading.rawMode || activeDocumentKind === 'html') {
      return undefined;
    }

    return installTableFullscreen(renderedContentRef.current);
  }, [activeDocumentKind, rendered.html, settings.reading.rawMode]);

  useEffect(() => {
    setRawActionStatus(null);
  }, [markdown, settings.reading.rawMode]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (shouldIgnoreNavigationShortcut(event)) {
        return;
      }

      if (event.key === 'ArrowLeft' && fileNavigation.previous) {
        event.preventDefault();
        openSiblingFile(fileNavigation.previous.path);
      }

      if (event.key === 'ArrowRight' && fileNavigation.next) {
        event.preventDefault();
        openSiblingFile(fileNavigation.next.path);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        window.scrollBy({ top: -KEYBOARD_SCROLL_STEP });
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        window.scrollBy({ top: KEYBOARD_SCROLL_STEP });
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => window.removeEventListener('keydown', handleKeydown);
  }, [fileNavigation.next, fileNavigation.previous, directoryHandle]);

  async function openFolder() {
    setError(null);
    setStatus('请选择一个文件夹，读取其中的 Markdown 或 HTML 文件。');

    try {
      const handle = await openDirectory();
      const nextTree = await scanMarkdownDirectory(handle);
      const defaultPath = selectDefaultDocument(nextTree);

      setDirectoryHandle(handle);
      setActiveAiProjectId(null);
      setTree(nextTree);
      setDrawerOpen(false);
      setStatus(nextTree.length ? null : '这个文件夹里没有找到 Markdown 或 HTML 文件。');

      if (defaultPath) {
        await openFile(handle, defaultPath, true, { aiProjectId: null });
      } else {
        setActivePath(null);
        setActiveDocumentKind('markdown');
        setMarkdown('');
        setRendered(EMPTY_RENDER);
        setHtmlPreviewDocument(null);
      }
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : '无法打开文件夹。');
    }
  }

  async function openStandaloneFile() {
    setError(null);
    setStatus('请选择一个 Markdown 或 HTML 文件。');

    try {
      const snapshot = await openDocumentFile();
      const documentKind = getSnapshotDocumentKind(snapshot);

      setDirectoryHandle(null);
      setActiveAiProjectId(null);
      setTree([]);
      setDrawerOpen(false);

      if (documentKind === 'html') {
        await openNormalDocumentSnapshot(snapshot, 'html');
        return;
      }

      const sample = await readMarkdownFileSlice(snapshot.file, 0, Math.min(snapshot.size, LARGE_SAMPLE_BYTES));
      const classification = classifyMarkdownDocument({ size: snapshot.size, sample });

      if (classification.kind !== 'normal') {
        await openLargeDocument(snapshot, classification.kind, classification.reason ?? '已进入大文件安全模式。', {
          anchorLine: 1,
        });
        return;
      }

      await openNormalDocumentSnapshot(snapshot, 'markdown');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus(null);
        return;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : '无法打开文件。');
    }
  }

  async function openFile(
    handle: FileSystemDirectoryHandle,
    path: string,
    remember = true,
    options: { anchorLine?: number; aiProjectId?: string | null } = {},
  ) {
    setError(null);
    setStatus(`正在打开 ${path}`);

    try {
      const snapshot = await readDocumentFileSnapshot(handle, path);
      const documentKind = getSnapshotDocumentKind(snapshot);

      if (documentKind === 'html') {
        await openNormalDocumentSnapshot(
          snapshot,
          'html',
          remember ? createLastDocumentRecord(handle, path, options.aiProjectId) : undefined,
          handle,
        );
        return;
      }

      const sample = await readMarkdownFileSlice(snapshot.file, 0, Math.min(snapshot.size, LARGE_SAMPLE_BYTES));
      const classification = classifyMarkdownDocument({ size: snapshot.size, sample });

      if (classification.kind !== 'normal') {
        const record = remember ? createLastDocumentRecord(handle, path, options.aiProjectId) : undefined;

        await openLargeDocument(snapshot, classification.kind, classification.reason ?? '已进入大文件安全模式。', {
          rememberRecord: record,
          anchorLine: options.anchorLine ?? 1,
        });
        return;
      }

      closeLargeDocument();

      await openNormalDocumentSnapshot(
        snapshot,
        'markdown',
        remember ? createLastDocumentRecord(handle, path, options.aiProjectId) : undefined,
      );
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : `无法打开 ${path}。`);
    }
  }

  async function openLargeDocument(
    snapshot: DocumentFileSnapshot,
    kind: Exclude<LargeDocumentKind, 'normal'>,
    reason: string,
    options: { rememberRecord?: LastDocumentRecord; anchorLine?: number } = {},
  ) {
    closeLargeDocument();
    const client = createLargeDocumentWorkerClient();
    setStatus(`正在建立大文件索引：${snapshot.path}`);
    let index: LargeDocumentIndex;

    try {
      index = await client.buildIndex(snapshot.file);
    } catch (error) {
      client.terminate();
      throw error;
    }

    setActivePath(snapshot.path);
    setActiveDocumentKind('markdown');
    setMarkdown('');
    setRendered({
      ...EMPTY_RENDER,
      title: index.title ?? snapshot.path,
      outline: index.outline,
      diagnostics: index.warnings.map((message) => ({ level: 'warning', message })),
    });
    setHtmlPreviewDocument(null);
    setLargeAnchorLine(options.anchorLine ?? 1);
    setLargeDocument({
      kind,
      reason,
      file: snapshot.file,
      index,
      client,
      rememberRecord: options.rememberRecord,
    });
    setStatus(null);

    if (options.rememberRecord) {
      setLastDocument(options.rememberRecord);
      await saveLastDocument(options.rememberRecord);
    }
  }

  function createLastDocumentRecord(
    handle: FileSystemDirectoryHandle,
    path: string,
    aiProjectIdOverride?: string | null,
  ): LastDocumentRecord {
    const rememberedAiProjectId = aiProjectIdOverride === undefined ? activeAiProjectId : aiProjectIdOverride;

    return {
      directoryHandle: handle,
      directoryName: handle.name,
      path,
      updatedAt: Date.now(),
      source: rememberedAiProjectId ? 'ai-project' : 'folder',
      aiProjectId: rememberedAiProjectId ?? undefined,
    };
  }

  async function openNormalDocumentSnapshot(
    snapshot: DocumentFileSnapshot,
    kind: ActiveDocumentKind,
    rememberRecord?: LastDocumentRecord,
    sourceDirectoryHandle?: FileSystemDirectoryHandle,
  ) {
    closeLargeDocument();
    const source = await snapshot.file.text();
    const result = kind === 'html' ? await renderHtmlDocument(source) : await renderMarkdown(source);
    const nextHtmlPreviewDocument = kind === 'html'
      ? await createHtmlPreviewDocument(
          source,
          snapshot.path,
          sourceDirectoryHandle ? (path) => readAssetFile(sourceDirectoryHandle, path) : undefined,
        )
      : null;

    setActivePath(snapshot.path);
    setActiveDocumentKind(kind);
    setMarkdown(source);
    setRendered(result);
    setHtmlPreviewDocument(nextHtmlPreviewDocument);
    setLargeAnchorLine(1);
    setStatus(null);

    if (rememberRecord) {
      setLastDocument(rememberRecord);
      await saveLastDocument(rememberRecord);
    }
  }

  function closeLargeDocument() {
    largeDocument?.client.terminate();
    setLargeDocument(null);
  }

  async function openInitialDocument() {
    const temporaryDocumentId = new URLSearchParams(window.location.search).get('temporaryDocument');

    if (temporaryDocumentId) {
      const temporaryDocument = await consumeTemporaryMarkdownDocument(temporaryDocumentId);

      if (temporaryDocument) {
        await openTemporaryDocument(temporaryDocument);
        return;
      }
    }

    await restoreLastDocument();
  }

  async function openTemporaryDocument(temporaryDocument: TemporaryMarkdownDocument) {
    const { name } = temporaryDocument;
    setError(null);
    setStatus(`正在打开 ${name}`);

    try {
      if (shouldRequestTemporaryDocumentAuthorization(temporaryDocument)) {
        showTemporaryDocumentAuthorizationPrompt();
        return;
      }

      const source = await readTemporaryDocumentSource(temporaryDocument);
      const result = await renderMarkdown(source);

      closeLargeDocument();
      setDirectoryHandle(null);
      setActiveAiProjectId(null);
      setTree([]);
      setActivePath(name);
      setActiveDocumentKind('markdown');
      setMarkdown(source);
      setRendered(result);
      setHtmlPreviewDocument(null);
      setStatus(null);
    } catch (err) {
      if (temporaryDocument.sourceAvailable === false) {
        showTemporaryDocumentAuthorizationPrompt();
        return;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : `无法打开 ${name}。`);
    }
  }

  function showTemporaryDocumentAuthorizationPrompt() {
    closeLargeDocument();
    setDirectoryHandle(null);
    setActiveAiProjectId(null);
    setTree([]);
    setActivePath(null);
    setActiveDocumentKind('markdown');
    setMarkdown('');
    setRendered(EMPTY_RENDER);
    setHtmlPreviewDocument(null);
    setStatus('这个临时 Markdown 文件太大，浏览器无法从当前页面安全传递完整内容。请通过“打开文件”或“打开文件夹”授权读取后继续阅读。');
    setError(null);
  }

  async function readTemporaryDocumentSource(temporaryDocument: TemporaryMarkdownDocument): Promise<string> {
    if (typeof temporaryDocument.source === 'string') {
      return temporaryDocument.source;
    }

    return fetch(temporaryDocument.url).then((response) => response.text());
  }

  function shouldRequestTemporaryDocumentAuthorization(temporaryDocument: TemporaryMarkdownDocument): boolean {
    if (temporaryDocument.sourceAvailable === false) {
      return true;
    }

    return typeof temporaryDocument.source !== 'string' && (temporaryDocument.sourceSize ?? 0) >= LARGE_MARKDOWN_BYTES;
  }

  async function restoreLastDocument(requestPermission = false) {
    setError(null);
    const record = await loadLastDocument();

    if (!record) {
      return;
    }

    setLastDocument(record);

    const hasPermission = requestPermission
      ? await requestDirectoryReadPermission(record.directoryHandle)
      : await canReadDirectory(record.directoryHandle);

    if (!hasPermission) {
      setStatus(`可以恢复上次文档：${record.directoryName}/${record.path}`);
      return;
    }

    setStatus(`正在恢复上次文档：${record.path}`);

    try {
      const nextTree = await scanMarkdownDirectory(record.directoryHandle);
      const rememberedPath = selectRememberedDocumentPath(nextTree, record.path);

      setDirectoryHandle(record.directoryHandle);
      setActiveAiProjectId(record.aiProjectId ?? null);
      setTree(nextTree);

      if (rememberedPath) {
        await openFile(record.directoryHandle, rememberedPath, rememberedPath !== record.path);
      } else {
        setActivePath(null);
        setActiveDocumentKind('markdown');
        setMarkdown('');
        setRendered(EMPTY_RENDER);
        setHtmlPreviewDocument(null);
        setStatus('上次打开的文件夹里没有找到 Markdown 或 HTML 文件。');
      }
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : '无法恢复上次文档。');
    }
  }

  async function reloadActiveFile() {
    if (largeDocument && directoryHandle && activePath) {
      const currentLine = largeAnchorLine;
      await openFile(directoryHandle, activePath, false, { anchorLine: currentLine });
      return;
    }

    if (activeDocumentKind === 'html' && directoryHandle && activePath) {
      const scrollY = window.scrollY;
      await openFile(directoryHandle, activePath, false);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
      });
      return;
    }

    await reloadCurrentDocument({
      directoryHandle,
      activePath,
      scrollY: window.scrollY,
      readDocumentFile,
      renderDocument: (source) => activeDocumentKind === 'html' ? renderHtmlDocument(source) : renderMarkdown(source),
      setMarkdown,
      setRendered,
      setStatus,
      setError,
      scrollTo: (options) => window.scrollTo(options),
      requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
    });
  }

  async function reloadFolderTree() {
    if (!directoryHandle) {
      setStatus('请先打开一个文件夹。');
      return;
    }

    setError(null);
    setStatus('正在重载目录');

    try {
      const nextTree = await scanMarkdownDirectory(directoryHandle);
      const activeFileExists = activePath
        ? flattenDocumentFiles(nextTree).some((file) => file.path === activePath)
        : false;
      const fallbackPath = activeFileExists ? null : selectDefaultDocument(nextTree);

      setTree(nextTree);

      if (activeFileExists) {
        setStatus(null);
        return;
      }

      if (fallbackPath) {
        await openFile(directoryHandle, fallbackPath);
        return;
      }

      setActivePath(null);
      setActiveDocumentKind('markdown');
      setMarkdown('');
      setRendered(EMPTY_RENDER);
      setHtmlPreviewDocument(null);
      setStatus('这个文件夹里没有找到 Markdown 或 HTML 文件。');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : '无法重载目录。');
    }
  }

  async function clearAiProjects() {
    setAiProjectState(EMPTY_AI_PROJECT_STATE);
    setAiProjectTrees({});
    setActiveAiProjectId(null);
    setAiProjectStatus('已清空 AI 项目记录。');
    await clearAiProjectState();
  }

  async function openAiProjectSettings() {
    await chrome.runtime.openOptionsPage();
  }

  async function openAiProject(project: AiProjectEntry) {
    setError(null);
    setAiProjectStatus(`正在打开 ${project.name}`);

    try {
      let handle = project.directoryHandle;

      if (handle) {
        const hasPermission = await requestAiProjectDirectoryPermission(project);

        if (!hasPermission) {
          handle = undefined;
        }
      }

      if (!handle) {
        setAiProjectStatus(`请选择项目目录：${project.expectedPath}`);
        handle = await openDirectory();
      }

      await activateAiProject(project, handle, true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setAiProjectStatus(null);
        return;
      }

      setAiProjectStatus(null);
      setError(err instanceof Error ? err.message : `无法打开项目 ${project.name}。`);
    }
  }

  async function reloadAiProject(project: AiProjectEntry) {
    if (!project.directoryHandle) {
      await openAiProject(project);
      return;
    }

    setError(null);
    setAiProjectStatus(`正在重载 ${project.name}`);

    try {
      const hasPermission = await requestAiProjectDirectoryPermission(project);

      if (!hasPermission) {
        setAiProjectStatus(`需要重新授权项目目录：${project.expectedPath}`);
        await openAiProject(project);
        return;
      }

      await activateAiProject(project, project.directoryHandle, false);
    } catch (err) {
      setAiProjectStatus(null);
      setError(err instanceof Error ? err.message : `无法重载项目 ${project.name}。`);
    }
  }

  async function activateAiProject(project: AiProjectEntry, handle: FileSystemDirectoryHandle, openDefaultFile: boolean) {
    const nextTree = await scanMarkdownDirectory(handle);
    const nextState = mergeAiProjectDirectory(aiProjectState, project, handle);

    setAiProjectState(nextState);
    await saveAiProjectState(nextState);
    setDirectoryHandle(handle);
    setActiveAiProjectId(project.id);
    setTree(nextTree);
    setAiProjectTrees((current) => ({ ...current, [project.id]: nextTree }));
    setDrawerTab('ai-projects');
    setDrawerOpen(true);
    setAiProjectStatus(nextTree.length ? null : '这个项目目录里没有找到 Markdown 或 HTML 文件。');

    const activeFileExists = activePath
      ? flattenDocumentFiles(nextTree).some((file) => file.path === activePath)
      : false;
    const defaultPath = selectDefaultDocument(nextTree);

    if (openDefaultFile && defaultPath) {
      await openFile(handle, defaultPath, true, { aiProjectId: project.id });
      return;
    }

    if (!activeFileExists && defaultPath) {
      await openFile(handle, defaultPath, true, { aiProjectId: project.id });
      return;
    }

    if (!defaultPath) {
      setActivePath(null);
      setActiveDocumentKind('markdown');
      setMarkdown('');
      setRendered(EMPTY_RENDER);
      setHtmlPreviewDocument(null);
    }
  }

  function selectAiProjectFile(project: AiProjectEntry, path: string) {
    const handle = project.directoryHandle;

    if (!handle) {
      void openAiProject(project);
      return;
    }

    setDirectoryHandle(handle);
    setActiveAiProjectId(project.id);
    setTree(aiProjectTrees[project.id] ?? tree);
    void openFile(handle, path, true, { aiProjectId: project.id });
  }

  async function copyMarkdownSource() {
    setRawActionStatus(null);

    try {
      await navigator.clipboard.writeText(markdown);
      setRawActionStatus('已复制');
    } catch (err) {
      setRawActionStatus(err instanceof Error ? err.message : '复制失败');
    }
  }

  async function saveMarkdownSourceAs() {
    setRawActionStatus(null);

    try {
      const suggestedName = selectSourceSaveName(activePath, activeDocumentKind);

      if (window.showSaveFilePicker) {
        const pickerType: { description: string; accept: Record<string, string[]> } = activeDocumentKind === 'html'
          ? {
              description: 'HTML 文件',
              accept: { 'text/html': ['.html', '.htm'] },
            }
          : {
              description: 'Markdown 文件',
              accept: { 'text/markdown': ['.md', '.markdown'] },
            };
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [pickerType],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(markdown);
        await writable.close();
        setRawActionStatus('已保存');
        return;
      }

      downloadSource(markdown, suggestedName, activeDocumentKind);
      setRawActionStatus('已下载');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setRawActionStatus(err instanceof Error ? err.message : '保存失败');
    }
  }

  function openSiblingFile(path: string | null | undefined) {
    if (!directoryHandle || !path) {
      return;
    }

    void openFile(directoryHandle, path);
  }

  function navigateHtmlPreview(id: string) {
    const frame = htmlPreviewRef.current;
    const frameDocument = frame?.contentDocument;

    if (!frame) {
      return;
    }

    if (!frameDocument) {
      if (htmlPreviewDocument?.url) {
        frame.src = `${htmlPreviewDocument.url}#${encodeURIComponent(id)}`;
      }
      return;
    }

    const outlineIds = flattenOutlineIds(rendered.outline);
    const outlineIndex = outlineIds.indexOf(id);
    const headings = Array.from(frameDocument.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
    const target = frameDocument.getElementById(id) ?? (outlineIndex >= 0 ? headings[outlineIndex] : null);
    target?.scrollIntoView({ block: 'start' });
  }

  function handleReaderClickCapture(event: React.MouseEvent<HTMLElement>) {
    handleRenderedMarkdownLinkClick(event);
  }

  function handleRenderedMarkdownLinkClick(event: React.MouseEvent<HTMLElement>) {
    if (activeDocumentKind !== 'markdown' || !activePath || largeDocument || settings.reading.rawMode) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href) {
      return;
    }

    const resolved = resolveMarkdownHref(href, activePath);

    if (resolved.kind === 'hash') {
      event.preventDefault();
      document.getElementById(resolved.hash)?.scrollIntoView({ block: 'start' });
      setActiveHeadingId(resolved.hash);
      return;
    }

    if (resolved.kind !== 'document' || !directoryHandle) {
      return;
    }

    event.preventDefault();
    void openLinkedDocument(resolved.path, resolved.hash);
  }

  async function openLinkedDocument(path: string, hash: string | null) {
    if (!directoryHandle) {
      return;
    }

    await openFile(directoryHandle, path);

    if (hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
        setActiveHeadingId(hash);
      });
    }
  }

  function shouldIgnoreNavigationShortcut(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return true;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return false;
    }

    if (target.closest('[contenteditable="true"]')) {
      return true;
    }

    return target.closest('input, textarea, select') !== null;
  }

  function startFileDrawerResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = drawerWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    setIsResizingFileDrawer(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setDrawerWidth(clampFileDrawerWidth(startWidth + delta));
    };

    const finishResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      setIsResizingFileDrawer(false);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
  }

  function handleFileDrawerResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 24 : -24;
    setDrawerWidth((current) => clampFileDrawerWidth(current + delta));
  }

  const readerShellStyle = drawerOpen
    ? ({ '--file-drawer-width': `${drawerWidth}px` } as CSSProperties)
    : undefined;

  return (
    <div
      className={`reader-app theme-${settings.reading.theme} width-${settings.reading.width} style-${settings.reading.style}`}
    >
      <ReaderToolbar
        title={title}
        rawMode={settings.reading.rawMode}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        onReload={() => void reloadActiveFile()}
        previousFile={fileNavigation.previous}
        nextFile={fileNavigation.next}
        onOpenPrevious={() => openSiblingFile(fileNavigation.previous?.path)}
        onOpenNext={() => openSiblingFile(fileNavigation.next?.path)}
        onRawModeChange={(rawMode) =>
          setSettings((current) => {
            const next = { ...current, reading: { ...current.reading, rawMode } };
            void saveSettings(next);
            return next;
          })
        }
      />
      <div
        className={`reader-shell${drawerOpen ? ' has-file-drawer' : ''}${isResizingFileDrawer ? ' is-resizing-file-drawer' : ''}`}
        style={readerShellStyle}
      >
        <FileDrawer
          open={drawerOpen}
          tree={tree}
          activePath={activePath}
          activeTab={drawerTab}
          aiProjects={aiProjectState.projects}
          aiProjectSources={aiProjectState.sources}
          aiProjectTrees={aiProjectTrees}
          aiProjectStatus={aiProjectStatus}
          activeAiProjectId={activeAiProjectId}
          onOpenFolder={openFolder}
          onReloadFolder={() => void reloadFolderTree()}
          onTabChange={setDrawerTab}
          onOpenAiProjectSettings={() => void openAiProjectSettings()}
          onClearAiProjects={() => void clearAiProjects()}
          onOpenAiProject={(project) => void openAiProject(project)}
          onReloadAiProject={(project) => void reloadAiProject(project)}
          onSelectAiProjectFile={selectAiProjectFile}
          onClose={() => setDrawerOpen(false)}
          onSelect={(path) => {
            if (directoryHandle) {
              void openFile(directoryHandle, path);
            }
          }}
          onResizeStart={startFileDrawerResize}
          onResizeKeyDown={handleFileDrawerResizeKeyDown}
        />
        <main className="reader-layout" onClickCapture={handleReaderClickCapture}>
          <article className={htmlPreviewActive ? 'document-reader document-reader--html' : 'document-reader'}>
          {status && <p className="status-note">{status}</p>}
          {error && <p className="error-note">{error}</p>}
          {activePath ? (
            largeDocument ? (
              <LargeDocumentReader
                file={largeDocument.file}
                index={largeDocument.index}
                reason={largeDocument.reason}
                client={largeDocument.client}
                anchorLine={largeAnchorLine}
                mermaidEnabled={settings.rendering.mermaid}
                onNavigateLine={(line) => {
                  setLargeAnchorLine(line);
                  const heading = findNearestLargeHeading(largeDocument.index.outline, line);
                  setActiveHeadingId(heading?.id ?? activeHeadingId);
                }}
              />
            ) : settings.reading.rawMode ? (
              <section className="raw-source">
                <div className="raw-source__toolbar">
                  <button type="button" onClick={() => void copyMarkdownSource()}>
                    复制源码
                  </button>
                  <button type="button" onClick={() => void saveMarkdownSourceAs()}>
                    另存为
                  </button>
                  {rawActionStatus && <span role="status">{rawActionStatus}</span>}
                </div>
                <pre>{markdown}</pre>
              </section>
            ) : activeDocumentKind === 'html' ? (
              <HtmlDocumentPreview
                ref={htmlPreviewRef}
                sourceUrl={htmlPreviewDocument?.url ?? null}
                title={activePath}
                onLoad={() => setHtmlPreviewLoadCount((count) => count + 1)}
              />
            ) : (
              <div ref={renderedContentRef}>
                <RenderedMarkdownContent
                  html={rendered.html}
                  mermaidEnabled={settings.rendering.mermaid}
                />
              </div>
            )
          ) : (
            <section className="empty-state">
              <h2>打开本地文件夹</h2>
              <p>选择包含 Markdown 或 HTML 文件的文件夹，把它作为本地文档集阅读。</p>
              {lastDocument && (
                <p>
                  上次打开：{lastDocument.directoryName}/{lastDocument.path}
                </p>
              )}
              <div className="empty-state__actions">
                {lastDocument && (
                  <button type="button" onClick={() => void restoreLastDocument(true)}>
                    恢复上次文档
                  </button>
                )}
                <button type="button" onClick={() => void openStandaloneFile()}>
                  打开文件
                </button>
                <button type="button" onClick={openFolder}>
                  打开文件夹
                </button>
              </div>
            </section>
          )}
          </article>
          {settings.reading.showOutline && (
            <OutlinePanel
              outline={rendered.outline}
              activeId={activeHeadingId}
              onNavigate={(id) => {
                if (largeDocument) {
                  const line = findLargeOutlineLine(largeDocument.index.outline, id);
                  if (line) {
                    setLargeAnchorLine(line);
                    setActiveHeadingId(id);
                  }
                  return;
                }

                if (activeDocumentKind === 'html') {
                  navigateHtmlPreview(id);
                  setActiveHeadingId(id);
                  return;
                }

                document.getElementById(id)?.scrollIntoView({ block: 'start' });
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

type HtmlDocumentPreviewProps = {
  sourceUrl: string | null;
  title: string | null;
  onLoad: () => void;
};

function HtmlDocumentPreview({
  sourceUrl,
  title,
  onLoad,
  ref,
}: HtmlDocumentPreviewProps & { ref: React.Ref<HTMLIFrameElement> }) {
  return (
    <iframe
      ref={ref}
      className="html-preview"
      title={`HTML 预览：${title ?? '未命名文档'}`}
      sandbox="allow-scripts allow-forms allow-popups allow-modals"
      referrerPolicy="no-referrer"
      src={sourceUrl ?? 'about:blank'}
      onLoad={onLoad}
    />
  );
}

function getHtmlPreviewHeadingPositions(frameDocument: Document, outline: OutlineItem[]) {
  const outlineIds = flattenOutlineIds(outline);

  return Array.from(frameDocument.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
    .map((heading, index) => ({
      id: heading.id || outlineIds[index],
      top: heading.getBoundingClientRect().top,
    }))
    .filter((heading): heading is { id: string; top: number } => Boolean(heading.id));
}

function flattenOutlineIds(outline: OutlineItem[]): string[] {
  return outline.flatMap((item) => [item.id, ...flattenOutlineIds(item.children)]);
}

function selectSourceSaveName(path: string | null, kind: ActiveDocumentKind): string {
  const fallbackName = kind === 'html' ? 'document.html' : 'document.md';
  const name = path?.split('/').filter(Boolean).at(-1) ?? fallbackName;
  const extensionPattern = kind === 'html' ? /\.(html|htm)$/i : /\.(md|markdown)$/i;
  const extension = kind === 'html' ? '.html' : '.md';

  return extensionPattern.test(name) ? name : `${name}${extension}`;
}

function downloadSource(source: string, filename: string, kind: ActiveDocumentKind) {
  const type = kind === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8';
  const objectUrl = URL.createObjectURL(new Blob([source], { type }));
  const anchor = document.createElement('a');

  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

function loadReaderLayoutPreferences(): ReaderLayoutPreferences {
  const defaults = {
    fileDrawerOpen: false,
    fileDrawerWidth: DEFAULT_FILE_DRAWER_WIDTH,
  };

  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const stored = window.localStorage.getItem(LAYOUT_PREFERENCES_KEY);
    if (!stored) {
      return defaults;
    }

    const parsed = JSON.parse(stored) as Partial<ReaderLayoutPreferences> | null;

    return {
      fileDrawerOpen: typeof parsed?.fileDrawerOpen === 'boolean' ? parsed.fileDrawerOpen : defaults.fileDrawerOpen,
      fileDrawerWidth: clampFileDrawerWidth(
        typeof parsed?.fileDrawerWidth === 'number' ? parsed.fileDrawerWidth : defaults.fileDrawerWidth,
      ),
    };
  } catch {
    return defaults;
  }
}

function saveReaderLayoutPreferences(preferences: ReaderLayoutPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      LAYOUT_PREFERENCES_KEY,
      JSON.stringify({
        fileDrawerOpen: preferences.fileDrawerOpen,
        fileDrawerWidth: clampFileDrawerWidth(preferences.fileDrawerWidth),
      }),
    );
  } catch {
    // Layout preferences are best-effort and should never block reading.
  }
}

function clampFileDrawerWidth(width: number): number {
  return Math.min(selectMaxFileDrawerWidth(), Math.max(MIN_FILE_DRAWER_WIDTH, width));
}

function selectMaxFileDrawerWidth(): number {
  if (typeof window === 'undefined') {
    return MAX_FILE_DRAWER_WIDTH;
  }

  return Math.max(MIN_FILE_DRAWER_WIDTH, Math.min(MAX_FILE_DRAWER_WIDTH, window.innerWidth - 420));
}

function getSnapshotDocumentKind(snapshot: DocumentFileSnapshot): ActiveDocumentKind {
  return getDocumentFileKind(snapshot.path) ?? getDocumentFileKind(snapshot.name) ?? 'markdown';
}

function findLargeOutlineLine(items: LargeOutlineItem[], id: string): number | null {
  for (const item of items) {
    if (item.id === id) {
      return item.line;
    }

    const childLine = findLargeOutlineLine(item.children, id);
    if (childLine) {
      return childLine;
    }
  }

  return null;
}

function findNearestLargeHeading(items: LargeOutlineItem[], line: number): LargeOutlineItem | null {
  let nearest: LargeOutlineItem | null = null;

  for (const item of flattenLargeOutline(items)) {
    if (item.line <= line && (!nearest || item.line >= nearest.line)) {
      nearest = item;
    }
  }

  return nearest;
}

function flattenLargeOutline(items: LargeOutlineItem[]): LargeOutlineItem[] {
  return items.flatMap((item) => [item, ...flattenLargeOutline(item.children)]);
}
