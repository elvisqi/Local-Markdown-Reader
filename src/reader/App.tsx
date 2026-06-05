import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import {
  analyzeDocumentTree,
  getDocumentFileKind,
  selectDefaultLoadedDocument,
  selectDefaultDocument,
} from '../shared/fileSystem';
import { renderHtmlDocument } from '../shared/render/html';
import { resolveMarkdownHref } from '../shared/render/links';
import { renderMarkdown } from '../shared/render/markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, subscribeSettings } from '../shared/settings';
import { consumeTemporaryMarkdownDocument, type TemporaryMarkdownDocument } from '../shared/temporaryDocument';
import type { FileTreeNode, LazyFileTreeNode, OutlineItem, RenderResult } from '../shared/types';
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
import { selectSiblingMarkdownNavigation } from './fileNavigation';
import {
  createDirectoryScanSession,
  isStaleLoadedDirectoryError,
  openDirectory,
  openDocumentFile,
  readAssetFile,
  readDocumentFileSnapshot,
  readMarkdownFileSlice,
  scanMarkdownDirectory,
  type DirectoryScanSession,
  type DocumentFileSnapshot,
} from './fileSystemAccess';
import {
  createHtmlPreviewDocument,
  HTML_PREVIEW_ACTIVE_HEADING_MESSAGE_TYPE,
  HTML_PREVIEW_NAVIGATION_MESSAGE_TYPE,
  HTML_PREVIEW_READY_MESSAGE_TYPE,
  HTML_PREVIEW_RENDER_MESSAGE_TYPE,
  HTML_PREVIEW_SCROLL_MESSAGE_TYPE,
  type HtmlPreviewDocument,
  type HtmlPreviewActiveHeadingMessage,
  type HtmlPreviewNavigationMessage,
  type HtmlPreviewReadyMessage,
} from './htmlPreview';
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
import { JsonDocumentReader } from './JsonDocumentReader';
import {
  createEmptyLazyFileTree,
  markDirectoryError,
  markDirectoryLoading,
  pruneExpandedPaths,
  replaceDirectoryChildren,
  selectLoadedDocumentExists,
  setExpandedPaths as setLazyExpandedPaths,
} from './lazyFileTree';
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
const MIN_FILE_DRAWER_WIDTH = 100;
const MAX_FILE_DRAWER_WIDTH = 640;
const DEFAULT_OUTLINE_PANEL_WIDTH = 260;
const MIN_OUTLINE_PANEL_WIDTH = 100;
const MAX_OUTLINE_PANEL_WIDTH = 420;
const MIN_READER_LAYOUT_WIDTH = 332;
const FILE_DRAWER_KEYBOARD_RESIZE_STEP = 24;
const OUTLINE_PANEL_KEYBOARD_RESIZE_STEP = 24;
const LAYOUT_PREFERENCES_KEY = 'localMarkdownReader.layoutPreferences';

type ReaderLayoutPreferences = {
  fileDrawerOpen: boolean;
  fileDrawerWidth: number;
  outlineWidth: number;
};

type SidePanelWidthPriority = 'file-drawer' | 'outline';

type LargeDocumentSession = {
  kind: Exclude<LargeDocumentKind, 'normal'>;
  reason: string;
  file: File;
  index: LargeDocumentIndex;
  client: LargeDocumentWorkerClient;
  rememberRecord?: LastDocumentRecord;
};

type ActiveDocumentKind = 'markdown' | 'html' | 'json';
type FileDrawerTab = 'folder' | 'ai-projects';
type DocumentSource =
  | { type: 'folder'; handle: FileSystemDirectoryHandle }
  | { type: 'ai-project'; projectId: string; handle: FileSystemDirectoryHandle }
  | { type: 'standalone' }
  | null;
type ReaderHistoryState = {
  marker: 'local-markdown-reader';
  path: string;
  hash?: string;
  sourceType: 'folder' | 'ai-project';
  aiProjectId?: string;
  scrollY: number;
};

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const initialLayoutPreferences = useMemo(loadReaderLayoutPreferences, []);
  const initialPersistedOutlineWidth = useMemo(loadPersistedOutlinePanelWidth, []);
  const [drawerOpen, setDrawerOpen] = useState(initialLayoutPreferences.fileDrawerOpen);
  const [drawerWidth, setDrawerWidth] = useState(initialLayoutPreferences.fileDrawerWidth);
  const [isResizingFileDrawer, setIsResizingFileDrawer] = useState(false);
  const [outlineWidth, setOutlineWidth] = useState(initialLayoutPreferences.outlineWidth);
  const [isResizingOutlinePanel, setIsResizingOutlinePanel] = useState(false);
  const [drawerTab, setDrawerTab] = useState<FileDrawerTab>('folder');
  const [folderDirectoryHandle, setFolderDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderTree, setFolderTree] = useState(createEmptyLazyFileTree);
  const [folderActivePath, setFolderActivePath] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeAiProjectId, setActiveAiProjectId] = useState<string | null>(null);
  const [aiProjectState, setAiProjectState] = useState<AiProjectState>(EMPTY_AI_PROJECT_STATE);
  const [aiProjectTrees, setAiProjectTrees] = useState<Record<string, FileTreeNode[]>>({});
  const [aiProjectActivePaths, setAiProjectActivePaths] = useState<Record<string, string | null>>({});
  const [aiProjectExpandedPaths, setAiProjectExpandedPaths] = useState<Record<string, string[]>>({});
  const [aiProjectStatus, setAiProjectStatus] = useState<string | null>(null);
  const [activeDocumentSource, setActiveDocumentSource] = useState<DocumentSource>(null);
  const [activeDocumentKind, setActiveDocumentKind] = useState<ActiveDocumentKind>('markdown');
  const [documentSourceText, setDocumentSourceText] = useState('');
  const [rendered, setRendered] = useState<RenderResult>(EMPTY_RENDER);
  const [htmlPreviewDocument, setHtmlPreviewDocument] = useState<HtmlPreviewDocument | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [pendingHtmlPreviewHash, setPendingHtmlPreviewHash] = useState<string | null>(null);
  const [lastDocument, setLastDocument] = useState<LastDocumentRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawActionStatus, setRawActionStatus] = useState<string | null>(null);
  const [largeDocument, setLargeDocument] = useState<LargeDocumentSession | null>(null);
  const [largeAnchorLine, setLargeAnchorLine] = useState(1);
  const openRequestIdRef = useRef(0);
  const folderScanSessionRef = useRef<DirectoryScanSession | null>(null);
  const renderedContentRef = useRef<HTMLDivElement | null>(null);
  const htmlPreviewRef = useRef<HTMLIFrameElement | null>(null);
  const htmlPreviewLastRenderRef = useRef<{ key: string; target: Window | null } | null>(null);
  const htmlPreviewReadyWindowRef = useRef<Window | null>(null);
  const persistedOutlineWidthRef = useRef(initialPersistedOutlineWidth);
  const [htmlPreviewLoadCount, setHtmlPreviewLoadCount] = useState(0);
  const title = useMemo(() => rendered.title ?? activePath ?? 'Markdown Reader', [activePath, rendered.title]);
  const htmlPreviewActive = activeDocumentKind === 'html' && !largeDocument && !settings.reading.rawMode;
  const outlineVisible = settings.reading.showOutline && activeDocumentKind === 'markdown';
  const activeNavigationTree = useMemo(() => {
    if (activeDocumentSource?.type === 'ai-project') {
      return aiProjectTrees[activeDocumentSource.projectId] ?? [];
    }

    return activeDocumentSource?.type === 'folder' ? convertLoadedLazyTreeToFileTreeNodes(folderTree.nodes) : [];
  }, [activeDocumentSource, aiProjectTrees, folderTree.nodes]);
  const fileNavigation = useMemo(
    () => selectSiblingMarkdownNavigation(activeNavigationTree, activePath),
    [activeNavigationTree, activePath],
  );
  useEffect(() => {
    void loadSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      setSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    if (outlineVisible) {
      persistedOutlineWidthRef.current = outlineWidth;
    }

    saveReaderLayoutPreferences({
      fileDrawerOpen: drawerOpen,
      fileDrawerWidth: drawerWidth,
      outlineWidth: outlineVisible ? outlineWidth : persistedOutlineWidthRef.current,
    }, outlineVisible);
  }, [drawerOpen, drawerWidth, outlineVisible, outlineWidth, settingsLoaded]);

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
    if (activeDocumentKind !== 'html' || !pendingHtmlPreviewHash) {
      return;
    }

    const targetWindow = htmlPreviewRef.current?.contentWindow ?? null;
    if (!targetWindow || (htmlPreviewLoadCount === 0 && htmlPreviewReadyWindowRef.current !== targetWindow)) {
      return;
    }

    navigateHtmlPreview(pendingHtmlPreviewHash);
    setActiveHeadingId(pendingHtmlPreviewHash);
    setPendingHtmlPreviewHash(null);
  }, [activeDocumentKind, htmlPreviewDocument, htmlPreviewLoadCount, pendingHtmlPreviewHash]);

  useEffect(() => {
    if (!renderedContentRef.current || settings.reading.rawMode || activeDocumentKind === 'html') {
      return undefined;
    }

    return installTableFullscreen(renderedContentRef.current);
  }, [activeDocumentKind, rendered.html, settings.reading.rawMode]);

  useEffect(() => {
    if (activeDocumentKind !== 'html') {
      return undefined;
    }

    const sendHtmlPreview = () => {
      const targetWindow = htmlPreviewRef.current?.contentWindow ?? null;
      if (!targetWindow || !htmlPreviewDocument || htmlPreviewReadyWindowRef.current !== targetWindow) {
        return;
      }

      const renderKey = createHtmlPreviewRenderKey(htmlPreviewDocument, activePath, rendered.outline);
      if (
        htmlPreviewLastRenderRef.current?.key === renderKey &&
        htmlPreviewLastRenderRef.current.target === targetWindow
      ) {
        return;
      }

      htmlPreviewLastRenderRef.current = { key: renderKey, target: targetWindow };
      // The sandboxed preview has an opaque origin, so source checks and the bridge token are the trust boundary.
      targetWindow.postMessage(
        {
          type: HTML_PREVIEW_RENDER_MESSAGE_TYPE,
          html: htmlPreviewDocument.html,
          headingIds: flattenOutlineIds(rendered.outline),
          title: activePath,
        },
        '*',
      );
    };

    const handleMessage = (event: MessageEvent) => {
      if (!htmlPreviewRef.current?.contentWindow || event.source !== htmlPreviewRef.current.contentWindow) {
        return;
      }

      const readyMessage = parseHtmlPreviewReadyMessage(event.data);
      if (readyMessage) {
        htmlPreviewReadyWindowRef.current = htmlPreviewRef.current.contentWindow;
        sendHtmlPreview();
        return;
      }

      const activeHeadingMessage = parseHtmlPreviewActiveHeadingMessage(event.data);
      if (activeHeadingMessage) {
        setActiveHeadingId((current) => (current === activeHeadingMessage.id ? current : activeHeadingMessage.id));
        return;
      }

      const message = parseHtmlPreviewNavigationMessage(event.data);
      if (!message || !activeDocumentSource || activeDocumentSource.type === 'standalone' || !htmlPreviewDocument) {
        return;
      }

      const link = htmlPreviewDocument.navigationLinks[message.linkId];
      if (!link) {
        return;
      }

      if (link.path === activePath && link.hash) {
        navigateActiveHtmlHash(link.hash);
        return;
      }

      void openLinkedDocument(link.path, link.hash);
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [activeDocumentKind, activeDocumentSource, activeNavigationTree, activePath, htmlPreviewDocument, rendered.outline]);

  useEffect(() => {
    if (activeDocumentKind !== 'html' || !htmlPreviewDocument || !htmlPreviewRef.current?.contentWindow) {
      return;
    }

    const targetWindow = htmlPreviewRef.current.contentWindow;
    if (htmlPreviewLoadCount === 0 && htmlPreviewReadyWindowRef.current !== targetWindow) {
      return;
    }

    htmlPreviewReadyWindowRef.current = targetWindow;
    const renderKey = createHtmlPreviewRenderKey(htmlPreviewDocument, activePath, rendered.outline);
    if (
      htmlPreviewLastRenderRef.current?.key === renderKey &&
      htmlPreviewLastRenderRef.current.target === targetWindow
    ) {
      return;
    }

    htmlPreviewLastRenderRef.current = { key: renderKey, target: targetWindow };
    targetWindow.postMessage(
      {
        type: HTML_PREVIEW_RENDER_MESSAGE_TYPE,
        html: htmlPreviewDocument.html,
        headingIds: flattenOutlineIds(rendered.outline),
        title: activePath,
      },
      '*',
    );
  }, [activeDocumentKind, activePath, htmlPreviewDocument, htmlPreviewLoadCount, rendered.outline]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = parseReaderHistoryState(event.state);
      if (!state || !activeDocumentSource || activeDocumentSource.type === 'standalone') {
        return;
      }

      if (state.sourceType !== activeDocumentSource.type) {
        return;
      }

      if (activeDocumentSource.type === 'ai-project' && state.aiProjectId !== activeDocumentSource.projectId) {
        return;
      }

      void openHistoryDocument(state);
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeDocumentSource, activeNavigationTree]);

  useEffect(() => {
    setRawActionStatus(null);
  }, [documentSourceText, settings.reading.rawMode]);

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
  }, [activeDocumentSource, fileNavigation.next, fileNavigation.previous]);

  async function openFolder() {
    const requestId = beginOpenRequest();
    setError(null);
    setStatus('请选择一个文件夹，读取其中的 Markdown、HTML 或 JSON 文件。');

    try {
      const handle = await openDirectory();
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      const scanSession = createDirectoryScanSession(handle);
      const rootChildren = await scanSession.scanChildren('');
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      const nextTree = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
      const defaultPath = selectDefaultLoadedDocument(nextTree.nodes);

      folderScanSessionRef.current = scanSession;
      setFolderDirectoryHandle(handle);
      setFolderTree(nextTree);
      setFolderActivePath(defaultPath);
      setDrawerOpen(!defaultPath);
      setStatus(nextTree.nodes.length ? null : '这个文件夹根目录没有可显示的文件或子目录。');

      if (defaultPath) {
        await openFile(handle, defaultPath, true, { source: { type: 'folder', handle }, requestId });
      } else {
        clearReaderForSource({ type: 'folder', handle });
      }
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : '无法打开文件夹。');
    }
  }

  async function loadFolderDirectory(path: string) {
    const scanSession = folderScanSessionRef.current;
    if (!scanSession) {
      return;
    }

    setFolderTree((current) => markDirectoryLoading(current, path));

    try {
      const children = await scanSession.scanChildren(path);
      if (folderScanSessionRef.current !== scanSession) {
        return;
      }

      setFolderTree((current) => replaceDirectoryChildren(current, path, children));
    } catch (err) {
      if (folderScanSessionRef.current !== scanSession) {
        return;
      }

      setFolderTree((current) =>
        markDirectoryError(current, path, err instanceof Error ? err.message : '无法读取目录。'),
      );
    }
  }

  async function openStandaloneFile() {
    const requestId = beginOpenRequest();
    setError(null);
    setStatus('请选择一个 Markdown、HTML 或 JSON 文件。');

    try {
      const snapshot = await openDocumentFile();
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      const documentKind = getSnapshotDocumentKind(snapshot);
      const source: DocumentSource = { type: 'standalone' };
      setDrawerOpen(false);

      if (documentKind === 'html' || documentKind === 'json') {
        await openNormalDocumentSnapshot(snapshot, documentKind, undefined, undefined, source, requestId);
        return;
      }

      const sample = await readMarkdownFileSlice(snapshot.file, 0, Math.min(snapshot.size, LARGE_SAMPLE_BYTES));
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      const classification = classifyMarkdownDocument({ size: snapshot.size, sample });

      if (classification.kind !== 'normal') {
        await openLargeDocument(snapshot, classification.kind, classification.reason ?? '已进入大文件安全模式。', {
          anchorLine: 1,
          source,
          requestId,
        });
        return;
      }

      await openNormalDocumentSnapshot(snapshot, 'markdown', undefined, undefined, source, requestId);
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

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
    options: { anchorLine?: number; source?: DocumentSource; requestId?: number } = {},
  ): Promise<boolean> {
    const requestId = options.requestId ?? beginOpenRequest();
    setError(null);
    setStatus(`正在打开 ${path}`);

    try {
      const snapshot = await readDocumentFileSnapshot(handle, path);
      if (!isCurrentOpenRequest(requestId)) {
        return false;
      }

      const documentKind = getSnapshotDocumentKind(snapshot);
      const source = options.source ?? activeDocumentSource ?? { type: 'folder', handle };
      const rememberRecord = remember ? createLastDocumentRecord(source, path) : undefined;

      if (documentKind === 'html' || documentKind === 'json') {
        return openNormalDocumentSnapshot(
          snapshot,
          documentKind,
          rememberRecord,
          documentKind === 'html' ? handle : undefined,
          source,
          requestId,
        );
      }

      const sample = await readMarkdownFileSlice(snapshot.file, 0, Math.min(snapshot.size, LARGE_SAMPLE_BYTES));
      if (!isCurrentOpenRequest(requestId)) {
        return false;
      }

      const classification = classifyMarkdownDocument({ size: snapshot.size, sample });

      if (classification.kind !== 'normal') {
        return openLargeDocument(snapshot, classification.kind, classification.reason ?? '已进入大文件安全模式。', {
          rememberRecord,
          anchorLine: options.anchorLine ?? 1,
          source,
          requestId,
        });
      }

      return openNormalDocumentSnapshot(
        snapshot,
        'markdown',
        rememberRecord,
        undefined,
        source,
        requestId,
      );
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return false;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : `无法打开 ${path}。`);
      return false;
    }
  }

  async function openLargeDocument(
    snapshot: DocumentFileSnapshot,
    kind: Exclude<LargeDocumentKind, 'normal'>,
    reason: string,
    options: { rememberRecord?: LastDocumentRecord; anchorLine?: number; source?: DocumentSource; requestId?: number } = {},
  ): Promise<boolean> {
    if (!isCurrentOpenRequest(options.requestId)) {
      return false;
    }

    const client = createLargeDocumentWorkerClient();
    setStatus(`正在建立大文件索引：${snapshot.path}`);
    let index: LargeDocumentIndex;

    try {
      index = await client.buildIndex(snapshot.file);
    } catch (error) {
      client.terminate();
      throw error;
    }

    if (!isCurrentOpenRequest(options.requestId)) {
      client.terminate();
      return false;
    }

    closeLargeDocument();
    setActivePath(snapshot.path);
    updateSourceActivePath(options.source, snapshot.path);
    setActiveDocumentSource(options.source ?? null);
    setActiveDocumentKind('markdown');
    setDocumentSourceText('');
    setRendered({
      ...EMPTY_RENDER,
      title: index.title ?? snapshot.path,
      outline: index.outline,
      diagnostics: index.warnings.map((message) => ({ level: 'warning', message })),
    });
    setHtmlPreviewDocument(null);
    setPendingHtmlPreviewHash(null);
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

    return true;
  }

  function createLastDocumentRecord(
    source: DocumentSource,
    path: string,
  ): LastDocumentRecord | undefined {
    if (!source || source.type === 'standalone') {
      return undefined;
    }

    return {
      directoryHandle: source.handle,
      directoryName: source.handle.name,
      path,
      updatedAt: Date.now(),
      source: source.type,
      aiProjectId: source.type === 'ai-project' ? source.projectId : undefined,
    };
  }

  async function openNormalDocumentSnapshot(
    snapshot: DocumentFileSnapshot,
    kind: ActiveDocumentKind,
    rememberRecord?: LastDocumentRecord,
    sourceDirectoryHandle?: FileSystemDirectoryHandle,
    documentSource?: DocumentSource,
    requestId?: number,
  ): Promise<boolean> {
    if (!isCurrentOpenRequest(requestId)) {
      return false;
    }

    const sourceText = await snapshot.file.text();
    if (!isCurrentOpenRequest(requestId)) {
      return false;
    }

    const result = kind === 'html'
      ? await renderHtmlDocument(sourceText)
      : kind === 'markdown'
        ? await renderMarkdown(sourceText)
        : EMPTY_RENDER;
    const nextHtmlPreviewDocument = kind === 'html'
      ? await createHtmlPreviewDocument(
          sourceText,
          snapshot.path,
          sourceDirectoryHandle ? (path) => readAssetFile(sourceDirectoryHandle, path) : undefined,
          { sandboxPageUrl: getHtmlPreviewSandboxPageUrl() },
        )
      : null;

    if (!isCurrentOpenRequest(requestId)) {
      nextHtmlPreviewDocument?.objectUrls.forEach((url) => URL.revokeObjectURL(url));
      return false;
    }

    closeLargeDocument();
    setActivePath(snapshot.path);
    updateSourceActivePath(documentSource, snapshot.path);
    setActiveDocumentSource(documentSource ?? null);
    setActiveDocumentKind(kind);
    setDocumentSourceText(sourceText);
    setRendered(result);
    setHtmlPreviewDocument(nextHtmlPreviewDocument);
    const currentHtmlPreviewWindow = htmlPreviewRef.current?.contentWindow ?? null;
    if (kind !== 'html' || htmlPreviewReadyWindowRef.current !== currentHtmlPreviewWindow) {
      htmlPreviewReadyWindowRef.current = null;
    }
    htmlPreviewLastRenderRef.current = null;
    setHtmlPreviewLoadCount(0);
    setPendingHtmlPreviewHash(null);
    setLargeAnchorLine(1);
    setStatus(null);

    if (rememberRecord) {
      setLastDocument(rememberRecord);
      await saveLastDocument(rememberRecord);
    }

    return true;
  }

  async function openHistoryDocument(state: ReaderHistoryState) {
    if (!activeDocumentSource || activeDocumentSource.type === 'standalone') {
      return;
    }

    if (!isDocumentPathInTree(activeNavigationTree, state.path)) {
      return;
    }

    const requestId = beginOpenRequest();
    const opened = await openFile(activeDocumentSource.handle, state.path, true, {
      source: activeDocumentSource,
      requestId,
    });

    if (!opened) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      if (state.hash) {
        if (getDocumentFileKind(state.path) === 'html') {
          setPendingHtmlPreviewHash(state.hash);
          return;
        }

        document.getElementById(state.hash)?.scrollIntoView({ block: 'start' });
        setActiveHeadingId(state.hash);
        return;
      }

      window.scrollTo({ top: state.scrollY, left: 0, behavior: 'instant' });
    });
  }

  function closeLargeDocument() {
    largeDocument?.client.terminate();
    setLargeDocument(null);
  }

  function isCurrentOpenRequest(requestId: number | undefined): boolean {
    return requestId === undefined || requestId === openRequestIdRef.current;
  }

  function beginOpenRequest(): number {
    openRequestIdRef.current += 1;
    return openRequestIdRef.current;
  }

  function updateSourceActivePath(source: DocumentSource | undefined, path: string | null) {
    if (!source) {
      return;
    }

    if (source.type === 'folder') {
      setFolderActivePath(path);
      return;
    }

    if (source.type === 'ai-project') {
      setAiProjectActivePaths((current) => ({ ...current, [source.projectId]: path }));
      setActiveAiProjectId(source.projectId);
    }
  }

  function clearReaderForSource(source: DocumentSource) {
    closeLargeDocument();
    setActivePath(null);
    updateSourceActivePath(source ?? undefined, null);
    setActiveDocumentSource(source ?? null);
    setActiveDocumentKind('markdown');
    setDocumentSourceText('');
    setRendered(EMPTY_RENDER);
    setHtmlPreviewDocument(null);
    setPendingHtmlPreviewHash(null);
    setLargeAnchorLine(1);
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
    const requestId = beginOpenRequest();
    const { name } = temporaryDocument;
    setError(null);
    setStatus(`正在打开 ${name}`);

    try {
      if (shouldRequestTemporaryDocumentAuthorization(temporaryDocument)) {
        showTemporaryDocumentAuthorizationPrompt();
        return;
      }

      const source = await readTemporaryDocumentSource(temporaryDocument);
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      const result = await renderMarkdown(source);
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      closeLargeDocument();
      setActivePath(name);
      setActiveDocumentSource({ type: 'standalone' });
      setActiveDocumentKind('markdown');
      setDocumentSourceText(source);
      setRendered(result);
      setHtmlPreviewDocument(null);
      setStatus(null);
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      if (temporaryDocument.sourceAvailable === false) {
        showTemporaryDocumentAuthorizationPrompt();
        return;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : `无法打开 ${name}。`);
    }
  }

  function showTemporaryDocumentAuthorizationPrompt() {
    beginOpenRequest();
    closeLargeDocument();
    setActivePath(null);
    setActiveDocumentSource({ type: 'standalone' });
    setActiveDocumentKind('markdown');
    setDocumentSourceText('');
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
    const requestId = beginOpenRequest();
    setError(null);
    const record = await loadLastDocument();
    if (!isCurrentOpenRequest(requestId)) {
      return;
    }

    if (!record) {
      return;
    }

    setLastDocument(record);

    const hasPermission = requestPermission
      ? await requestDirectoryReadPermission(record.directoryHandle)
      : await canReadDirectory(record.directoryHandle);
    if (!isCurrentOpenRequest(requestId)) {
      return;
    }

    if (!hasPermission) {
      setStatus(`可以恢复上次文档：${record.directoryName}/${record.path}`);
      return;
    }

    setStatus(`正在恢复上次文档：${record.path}`);

    try {
      const nextTree = await scanMarkdownDirectory(record.directoryHandle);
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      const rememberedPath = selectRememberedDocumentPath(nextTree, record.path);
      const source: DocumentSource = record.source === 'ai-project' && record.aiProjectId
        ? { type: 'ai-project', projectId: record.aiProjectId, handle: record.directoryHandle }
        : { type: 'folder', handle: record.directoryHandle };

      if (source.type === 'ai-project') {
        setActiveAiProjectId(source.projectId);
        setAiProjectTrees((current) => ({ ...current, [source.projectId]: nextTree }));
        setAiProjectActivePaths((current) => ({ ...current, [source.projectId]: rememberedPath }));
        setDrawerTab('ai-projects');
      } else {
        setFolderDirectoryHandle(record.directoryHandle);
        folderScanSessionRef.current = null;
        setFolderTree(convertFileTreeNodesToLoadedLazyState(nextTree));
        setFolderActivePath(rememberedPath);
        setActiveAiProjectId(null);
      }

      if (rememberedPath) {
        await openFile(record.directoryHandle, rememberedPath, rememberedPath !== record.path, { source, requestId });
      } else {
        clearReaderForSource(source);
        setStatus('上次打开的文件夹里没有找到 Markdown、HTML 或 JSON 文件。');
      }
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : '无法恢复上次文档。');
    }
  }

  async function reloadActiveFile() {
    if (!activeDocumentSource || activeDocumentSource.type === 'standalone') {
      setStatus('当前文档没有可重载的授权目录。');
      return;
    }

    if (largeDocument && activePath) {
      const currentLine = largeAnchorLine;
      await openFile(activeDocumentSource.handle, activePath, false, {
        anchorLine: currentLine,
        source: activeDocumentSource,
      });
      return;
    }

    if (activePath) {
      const scrollY = window.scrollY;
      const requestId = beginOpenRequest();
      const opened = await openFile(activeDocumentSource.handle, activePath, false, {
        source: activeDocumentSource,
        requestId,
      });
      if (!opened) {
        return;
      }

      window.requestAnimationFrame(() => {
        if (!isCurrentOpenRequest(requestId)) {
          return;
        }

        window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
      });
      return;
    }
  }

  async function reloadFolderTree() {
    if (!folderDirectoryHandle) {
      setStatus('请先打开一个文件夹。');
      return;
    }

    const requestId = beginOpenRequest();
    setError(null);
    setStatus('正在重载目录');

    try {
      const directoriesToReload = [...new Set(['', ...folderTree.loadedDirectoryPaths])]
        .sort((a, b) => selectPathDepth(a) - selectPathDepth(b));
      const scanSession = createDirectoryScanSession(folderDirectoryHandle);
      let nextTree = createEmptyLazyFileTree();

      for (const directoryPath of directoriesToReload) {
        let children: LazyFileTreeNode[];
        try {
          children = await scanSession.scanChildren(directoryPath);
        } catch (err) {
          if (directoryPath && isStaleLoadedDirectoryError(err)) {
            continue;
          }

          throw err;
        }

        if (!isCurrentOpenRequest(requestId)) {
          return;
        }

        nextTree = replaceDirectoryChildren(nextTree, directoryPath, children);
      }

      nextTree = pruneExpandedPaths(setLazyExpandedPaths(nextTree, folderTree.expandedPaths));
      const activeFileExists = folderActivePath
        ? selectLoadedDocumentExists(nextTree.nodes, folderActivePath)
        : false;
      const fallbackPath = activeFileExists ? null : selectDefaultLoadedDocument(nextTree.nodes);

      folderScanSessionRef.current = scanSession;
      setFolderTree(nextTree);

      if (activeFileExists) {
        setStatus(null);
        return;
      }

      if (fallbackPath) {
        await openFile(folderDirectoryHandle, fallbackPath, true, {
          source: { type: 'folder', handle: folderDirectoryHandle },
          requestId,
        });
        return;
      }

      setFolderActivePath(null);
      if (activeDocumentSource?.type === 'folder') {
        clearReaderForSource({ type: 'folder', handle: folderDirectoryHandle });
      }
      setStatus('这个文件夹根目录没有可显示的文件或子目录。');
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      setStatus(null);
      setError(err instanceof Error ? err.message : '无法重载目录。');
    }
  }

  async function clearAiProjects() {
    setAiProjectState(EMPTY_AI_PROJECT_STATE);
    setAiProjectTrees({});
    setAiProjectActivePaths({});
    setAiProjectExpandedPaths({});
    setActiveAiProjectId(null);
    setAiProjectStatus('已清空 AI 项目记录。');
    await clearAiProjectState();
  }

  async function openAiProjectSettings() {
    await chrome.runtime.openOptionsPage();
  }

  function changeDrawerTab(tab: FileDrawerTab) {
    beginOpenRequest();
    setDrawerTab(tab);

    if (tab === 'folder') {
      restoreFolderSession();
      return;
    }

    restoreActiveAiProjectSession();
  }

  function restoreFolderSession() {
    if (!folderDirectoryHandle || !folderActivePath) {
      return;
    }

    if (activeDocumentSource?.type === 'folder' && activePath === folderActivePath) {
      return;
    }

    void openFile(folderDirectoryHandle, folderActivePath, false, {
      source: { type: 'folder', handle: folderDirectoryHandle },
    });
  }

  function restoreActiveAiProjectSession() {
    if (!activeAiProjectId) {
      return;
    }

    const project = aiProjectState.projects.find((entry) => entry.id === activeAiProjectId);
    const handle = project?.directoryHandle;
    const path = aiProjectActivePaths[activeAiProjectId];

    if (!project || !handle || !path) {
      return;
    }

    if (activeDocumentSource?.type === 'ai-project' && activeDocumentSource.projectId === activeAiProjectId && activePath === path) {
      return;
    }

    void openFile(handle, path, false, {
      source: { type: 'ai-project', projectId: activeAiProjectId, handle },
    });
  }

  async function openAiProject(project: AiProjectEntry) {
    const requestId = beginOpenRequest();
    setError(null);
    setAiProjectStatus(`正在打开 ${project.name}`);

    try {
      let handle = project.directoryHandle;

      if (handle) {
        const hasPermission = await requestAiProjectDirectoryPermission(project);
        if (!isCurrentOpenRequest(requestId)) {
          return;
        }

        if (!hasPermission) {
          handle = undefined;
        }
      }

      if (!handle) {
        setAiProjectStatus(`请选择项目目录：${project.expectedPath}`);
        handle = await openDirectory();
        if (!isCurrentOpenRequest(requestId)) {
          return;
        }
      }

      await activateAiProject(project, handle, true, requestId);
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

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

    const requestId = beginOpenRequest();
    setError(null);
    setAiProjectStatus(`正在重载 ${project.name}`);

    try {
      const hasPermission = await requestAiProjectDirectoryPermission(project);
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      if (!hasPermission) {
        setAiProjectStatus(`需要重新授权项目目录：${project.expectedPath}`);
        await openAiProject(project);
        return;
      }

      await activateAiProject(project, project.directoryHandle, false, requestId);
    } catch (err) {
      if (!isCurrentOpenRequest(requestId)) {
        return;
      }

      setAiProjectStatus(null);
      setError(err instanceof Error ? err.message : `无法重载项目 ${project.name}。`);
    }
  }

  async function activateAiProject(
    project: AiProjectEntry,
    handle: FileSystemDirectoryHandle,
    openDefaultFile: boolean,
    requestId: number,
  ) {
    const nextTree = await scanMarkdownDirectory(handle);
    if (!isCurrentOpenRequest(requestId)) {
      return;
    }

    const nextState = mergeAiProjectDirectory(aiProjectState, project, handle);

    setAiProjectState(nextState);
    await saveAiProjectState(nextState);
    if (!isCurrentOpenRequest(requestId)) {
      return;
    }

    setActiveAiProjectId(project.id);
    setAiProjectTrees((current) => ({ ...current, [project.id]: nextTree }));
    setDrawerTab('ai-projects');
    openFileDrawer();
    setAiProjectStatus(nextTree.length ? null : '这个项目目录里没有找到 Markdown、HTML 或 JSON 文件。');

    const projectActivePath = aiProjectActivePaths[project.id] ?? null;
    const treeAnalysis = analyzeDocumentTree(nextTree, projectActivePath);
    const activeFileExists = treeAnalysis.containsPath;
    const defaultPath = treeAnalysis.defaultPath;
    const source: DocumentSource = { type: 'ai-project', projectId: project.id, handle };
    const pathToOpen = activeFileExists ? projectActivePath : defaultPath;

    if (openDefaultFile && pathToOpen) {
      await openFile(handle, pathToOpen, true, { source, requestId });
      return;
    }

    if (!activeFileExists && defaultPath) {
      await openFile(handle, defaultPath, true, { source, requestId });
      return;
    }

    if (!defaultPath) {
      setAiProjectActivePaths((current) => ({ ...current, [project.id]: null }));
      clearReaderForSource(source);
    }
  }

  function selectAiProjectFile(project: AiProjectEntry, path: string) {
    const handle = project.directoryHandle;

    if (!handle) {
      void openAiProject(project);
      return;
    }

    setActiveAiProjectId(project.id);
    void openFile(handle, path, true, { source: { type: 'ai-project', projectId: project.id, handle } });
  }

  async function copyMarkdownSource() {
    setRawActionStatus(null);

    try {
      await navigator.clipboard.writeText(documentSourceText);
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
        const pickerType = getSourceSavePickerType(activeDocumentKind);
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [pickerType],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(documentSourceText);
        await writable.close();
        setRawActionStatus('已保存');
        return;
      }

      downloadSource(documentSourceText, suggestedName, activeDocumentKind);
      setRawActionStatus('已下载');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setRawActionStatus(err instanceof Error ? err.message : '保存失败');
    }
  }

  function openSiblingFile(path: string | null | undefined) {
    if (!activeDocumentSource || activeDocumentSource.type === 'standalone' || !path) {
      return;
    }

    void openFile(activeDocumentSource.handle, path, true, { source: activeDocumentSource });
  }

  function navigateHtmlPreview(id: string) {
    const frame = htmlPreviewRef.current;
    const frameDocument = frame?.contentDocument;

    if (!frame) {
      return;
    }

    if (htmlPreviewDocument) {
      frame.contentWindow?.postMessage(
        {
          type: HTML_PREVIEW_SCROLL_MESSAGE_TYPE,
          id,
        },
        '*',
      );
      return;
    }

    if (!frameDocument) {
      return;
    }

    const outlineIds = flattenOutlineIds(rendered.outline);
    const outlineIndex = outlineIds.indexOf(id);
    const headings = Array.from(frameDocument.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
    const target = frameDocument.getElementById(id) ?? (outlineIndex >= 0 ? headings[outlineIndex] : null);
    target?.scrollIntoView({ block: 'start' });
  }

  function resolveActiveDocumentHistoryHash(): string | null {
    const currentState = parseReaderHistoryState(window.history.state);
    if (currentState?.path === activePath) {
      return currentState.hash ?? null;
    }

    return null;
  }

  function replaceActiveDocumentHistoryHash(hash: string) {
    const currentState = parseReaderHistoryState(window.history.state);
    const nextState = currentState?.path === activePath
      ? {
          ...currentState,
          hash,
        }
      : createReaderHistoryState(activeDocumentSource, activePath, hash, window.scrollY);

    if (!nextState) {
      return;
    }

    window.history.replaceState(nextState, '', window.location.href);
  }

  function pushActiveDocumentHistoryHash(hash: string) {
    const previousState = createReaderHistoryState(
      activeDocumentSource,
      activePath,
      resolveActiveDocumentHistoryHash(),
      window.scrollY,
    );
    if (previousState) {
      window.history.replaceState(previousState, '', window.location.href);
    }

    const nextState = createReaderHistoryState(activeDocumentSource, activePath, hash, window.scrollY);
    if (nextState) {
      window.history.pushState(nextState, '', window.location.href);
    }
  }

  function navigateActiveHtmlHash(hash: string) {
    navigateHtmlPreview(hash);
    setActiveHeadingId(hash);
    pushActiveDocumentHistoryHash(hash);
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
      pushActiveDocumentHistoryHash(resolved.hash);
      return;
    }

    if (resolved.kind !== 'document' || !activeDocumentSource || activeDocumentSource.type === 'standalone') {
      return;
    }

    event.preventDefault();
    void openLinkedDocument(resolved.path, resolved.hash);
  }

  async function openLinkedDocument(path: string, hash: string | null) {
    if (!activeDocumentSource || activeDocumentSource.type === 'standalone') {
      return;
    }

    if (!isDocumentPathInTree(activeNavigationTree, path)) {
      return;
    }

    const requestId = beginOpenRequest();
    const linkedDocumentKind = getDocumentFileKind(path);
    const previousHistoryState = createReaderHistoryState(
      activeDocumentSource,
      activePath,
      resolveActiveDocumentHistoryHash(),
      window.scrollY,
    );
    const opened = await openFile(activeDocumentSource.handle, path, true, {
      source: activeDocumentSource,
      requestId,
    });

    if (opened) {
      if (previousHistoryState) {
        window.history.replaceState(previousHistoryState, '', window.location.href);
      }

      const nextHistoryState = createReaderHistoryState(activeDocumentSource, path, hash, 0);
      if (nextHistoryState) {
        window.history.pushState(nextHistoryState, '', window.location.href);
      }
    }

    if (hash && opened) {
      window.requestAnimationFrame(() => {
        if (!isCurrentOpenRequest(requestId)) {
          return;
        }

        if (linkedDocumentKind === 'html') {
          setPendingHtmlPreviewHash(hash);
          return;
        }

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
    const startDrawerWidth = drawerWidth;
    const startOutlineWidth = outlineWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    setIsResizingFileDrawer(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidths = normalizeSidePanelWidths(startDrawerWidth + delta, startOutlineWidth, drawerOpen, outlineVisible, 'file-drawer');
      setDrawerWidth(nextWidths.fileDrawerWidth);
      setOutlineWidth(nextWidths.outlineWidth);
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
    const delta = event.key === 'ArrowRight' ? FILE_DRAWER_KEYBOARD_RESIZE_STEP : -FILE_DRAWER_KEYBOARD_RESIZE_STEP;
    const nextWidths = normalizeSidePanelWidths(drawerWidth + delta, outlineWidth, drawerOpen, outlineVisible, 'file-drawer');
    setDrawerWidth(nextWidths.fileDrawerWidth);
    setOutlineWidth(nextWidths.outlineWidth);
  }

  function toggleFileDrawer() {
    if (!drawerOpen) {
      openFileDrawer();
      return;
    }

    setDrawerOpen(false);
  }

  function openFileDrawer() {
    const nextWidths = normalizeSidePanelWidths(drawerWidth, outlineWidth, true, outlineVisible, 'file-drawer');
    setDrawerWidth(nextWidths.fileDrawerWidth);
    setOutlineWidth(nextWidths.outlineWidth);

    if (!drawerOpen) {
      setDrawerOpen(true);
    }
  }

  function startOutlinePanelResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();

    const startX = event.clientX;
    const startDrawerWidth = drawerWidth;
    const startOutlineWidth = outlineWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    setIsResizingOutlinePanel(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidths = normalizeSidePanelWidths(startDrawerWidth, startOutlineWidth + delta, drawerOpen, outlineVisible, 'outline');
      setDrawerWidth(nextWidths.fileDrawerWidth);
      setOutlineWidth(nextWidths.outlineWidth);
    };

    const finishResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      setIsResizingOutlinePanel(false);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
  }

  function handleOutlinePanelResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? OUTLINE_PANEL_KEYBOARD_RESIZE_STEP : -OUTLINE_PANEL_KEYBOARD_RESIZE_STEP;
    const nextWidths = normalizeSidePanelWidths(drawerWidth, outlineWidth + delta, drawerOpen, outlineVisible, 'outline');
    setDrawerWidth(nextWidths.fileDrawerWidth);
    setOutlineWidth(nextWidths.outlineWidth);
  }

  const readerShellStyle = {
    '--file-drawer-width': `${drawerWidth}px`,
    '--outline-panel-width': `${outlineWidth}px`,
  } as CSSProperties;

  return (
    <div
      className={`reader-app theme-${settings.reading.theme} width-${settings.reading.width} style-${settings.reading.style}`}
    >
      <ReaderToolbar
        title={title}
        rawMode={settings.reading.rawMode}
        onToggleDrawer={toggleFileDrawer}
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
        className={`reader-shell${drawerOpen ? ' has-file-drawer' : ''}${isResizingFileDrawer ? ' is-resizing-file-drawer' : ''}${isResizingOutlinePanel ? ' is-resizing-outline-panel' : ''}`}
        style={readerShellStyle}
      >
        <FileDrawer
          open={drawerOpen}
          tree={folderTree.nodes}
          activePath={folderActivePath}
          expandedPaths={folderTree.expandedPaths}
          activeTab={drawerTab}
          aiProjects={aiProjectState.projects}
          aiProjectSources={aiProjectState.sources}
          aiProjectTrees={aiProjectTrees}
          aiProjectActivePaths={aiProjectActivePaths}
          aiProjectExpandedPaths={aiProjectExpandedPaths}
          aiProjectStatus={aiProjectStatus}
          activeAiProjectId={activeAiProjectId}
          onOpenFolder={openFolder}
          onReloadFolder={() => void reloadFolderTree()}
          onFolderExpandedPathsChange={(paths) => setFolderTree((current) => setLazyExpandedPaths(current, paths))}
          onLoadFolderDirectory={(path) => void loadFolderDirectory(path)}
          onTabChange={changeDrawerTab}
          onOpenAiProjectSettings={() => void openAiProjectSettings()}
          onClearAiProjects={() => void clearAiProjects()}
          onOpenAiProject={(project) => void openAiProject(project)}
          onReloadAiProject={(project) => void reloadAiProject(project)}
          onAiProjectExpandedPathsChange={(project, paths) =>
            setAiProjectExpandedPaths((current) => ({ ...current, [project.id]: paths }))
          }
          onSelectAiProjectFile={selectAiProjectFile}
          onClose={() => setDrawerOpen(false)}
          onSelect={(path) => {
            if (folderDirectoryHandle) {
              void openFile(folderDirectoryHandle, path, true, {
                source: { type: 'folder', handle: folderDirectoryHandle },
              });
            }
          }}
          onResizeStart={startFileDrawerResize}
          onResizeKeyDown={handleFileDrawerResizeKeyDown}
        />
        <main
          className={`reader-layout${outlineVisible ? ' has-outline-panel' : ''}`}
          onClickCapture={handleReaderClickCapture}
        >
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
                <pre>{documentSourceText}</pre>
              </section>
            ) : activeDocumentKind === 'html' ? (
              <HtmlDocumentPreview
                key={activePath ?? 'html-preview'}
                ref={htmlPreviewRef}
                sourceUrl={htmlPreviewDocument?.url ?? null}
                title={activePath}
                onLoad={() => setHtmlPreviewLoadCount((count) => count + 1)}
              />
            ) : activeDocumentKind === 'json' ? (
              <JsonDocumentReader
                source={documentSourceText}
                fileName={activePath}
                theme={settings.reading.theme}
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
              <p>选择包含 Markdown、HTML 或 JSON 文件的文件夹，把它作为本地文档集阅读。</p>
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
          {outlineVisible && (
            <OutlinePanel
              outline={rendered.outline}
              activeId={activeHeadingId}
              resizeValue={outlineWidth}
              resizeMin={MIN_OUTLINE_PANEL_WIDTH}
              resizeMax={MAX_OUTLINE_PANEL_WIDTH}
              onResizeStart={startOutlinePanelResize}
              onResizeKeyDown={handleOutlinePanelResizeKeyDown}
              onNavigate={(id) => {
                if (largeDocument) {
                  const line = findLargeOutlineLine(largeDocument.index.outline, id);
                  if (line) {
                    setLargeAnchorLine(line);
                    setActiveHeadingId(id);
                  }
                  return;
                }

                document.getElementById(id)?.scrollIntoView({ block: 'start' });
                setActiveHeadingId(id);
                replaceActiveDocumentHistoryHash(id);
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

function flattenOutlineIds(outline: OutlineItem[]): string[] {
  return outline.flatMap((item) => [item.id, ...flattenOutlineIds(item.children)]);
}

function isDocumentPathInTree(tree: FileTreeNode[], path: string): boolean {
  return analyzeDocumentTree(tree, path).containsPath;
}

function convertLoadedLazyTreeToFileTreeNodes(nodes: LazyFileTreeNode[]): FileTreeNode[] {
  return nodes.flatMap((node): FileTreeNode[] => {
    if (node.type === 'file') {
      return [{ type: 'file', name: node.name, path: node.path }];
    }

    if (node.loadState !== 'loaded') {
      return [];
    }

    return [{
      type: 'directory',
      name: node.name,
      path: node.path,
      children: convertLoadedLazyTreeToFileTreeNodes(node.children),
    }];
  });
}

function convertFileTreeNodesToLoadedLazyState(nodes: FileTreeNode[]) {
  return replaceDirectoryChildren(createEmptyLazyFileTree(), '', convertFileTreeNodesToLazyNodes(nodes));
}

function convertFileTreeNodesToLazyNodes(nodes: FileTreeNode[]): LazyFileTreeNode[] {
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
      children: convertFileTreeNodesToLazyNodes(node.children),
    };
  });
}

function selectPathDepth(path: string): number {
  return path.split('/').filter(Boolean).length;
}

function selectSourceSaveName(path: string | null, kind: ActiveDocumentKind): string {
  const fallbackName = kind === 'html' ? 'document.html' : kind === 'json' ? 'document.json' : 'document.md';
  const name = path?.split('/').filter(Boolean).at(-1) ?? fallbackName;
  const extensionPattern = kind === 'html'
    ? /\.(html|htm)$/i
    : kind === 'json'
      ? /\.json$/i
      : /\.(md|markdown)$/i;
  const extension = kind === 'html' ? '.html' : kind === 'json' ? '.json' : '.md';

  return extensionPattern.test(name) ? name : `${name}${extension}`;
}

function getSourceSavePickerType(kind: ActiveDocumentKind): { description: string; accept: Record<string, string[]> } {
  if (kind === 'html') {
    return {
      description: 'HTML 文件',
      accept: { 'text/html': ['.html', '.htm'] },
    };
  }

  if (kind === 'json') {
    return {
      description: 'JSON 文件',
      accept: { 'application/json': ['.json'] },
    };
  }

  return {
    description: 'Markdown 文件',
    accept: { 'text/markdown': ['.md', '.markdown'] },
  };
}

function downloadSource(source: string, filename: string, kind: ActiveDocumentKind) {
  const type = kind === 'html'
    ? 'text/html;charset=utf-8'
    : kind === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/markdown;charset=utf-8';
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

function parseHtmlPreviewNavigationMessage(data: unknown): HtmlPreviewNavigationMessage | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const message = data as Partial<HtmlPreviewNavigationMessage>;
  if (
    message.type !== HTML_PREVIEW_NAVIGATION_MESSAGE_TYPE ||
    typeof message.linkId !== 'string' ||
    !message.linkId
  ) {
    return null;
  }

  return {
    type: HTML_PREVIEW_NAVIGATION_MESSAGE_TYPE,
    linkId: message.linkId,
  };
}

function parseHtmlPreviewReadyMessage(data: unknown): HtmlPreviewReadyMessage | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const message = data as Partial<HtmlPreviewReadyMessage>;
  if (
    message.type !== HTML_PREVIEW_READY_MESSAGE_TYPE
  ) {
    return null;
  }

  return {
    type: HTML_PREVIEW_READY_MESSAGE_TYPE,
  };
}

function parseHtmlPreviewActiveHeadingMessage(data: unknown): HtmlPreviewActiveHeadingMessage | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const message = data as Partial<HtmlPreviewActiveHeadingMessage>;
  if (
    message.type !== HTML_PREVIEW_ACTIVE_HEADING_MESSAGE_TYPE ||
    (message.id !== null && typeof message.id !== 'string')
  ) {
    return null;
  }

  return {
    type: HTML_PREVIEW_ACTIVE_HEADING_MESSAGE_TYPE,
    id: message.id ?? null,
  };
}

function createHtmlPreviewRenderKey(
  preview: HtmlPreviewDocument,
  activePath: string | null,
  outline: OutlineItem[],
): string {
  return JSON.stringify([activePath, preview.url, preview.html, flattenOutlineIds(outline)]);
}

function createReaderHistoryState(
  source: DocumentSource,
  path: string | null,
  hash: string | null,
  scrollY: number,
): ReaderHistoryState | null {
  if (!source || source.type === 'standalone' || !path) {
    return null;
  }

  return {
    marker: 'local-markdown-reader',
    path,
    hash: hash ?? undefined,
    sourceType: source.type,
    aiProjectId: source.type === 'ai-project' ? source.projectId : undefined,
    scrollY,
  };
}

function parseReaderHistoryState(value: unknown): ReaderHistoryState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const state = value as Partial<ReaderHistoryState>;
  if (
    state.marker !== 'local-markdown-reader' ||
    typeof state.path !== 'string' ||
    !state.path ||
    (state.sourceType !== 'folder' && state.sourceType !== 'ai-project')
  ) {
    return null;
  }

  return {
    marker: 'local-markdown-reader',
    path: state.path,
    hash: typeof state.hash === 'string' && state.hash ? state.hash : undefined,
    sourceType: state.sourceType,
    aiProjectId: typeof state.aiProjectId === 'string' ? state.aiProjectId : undefined,
    scrollY: typeof state.scrollY === 'number' ? state.scrollY : 0,
  };
}

function getHtmlPreviewSandboxPageUrl(): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('html-preview-sandbox.html')
    : '/html-preview-sandbox.html';
}

function loadReaderLayoutPreferences(): ReaderLayoutPreferences {
  const defaults = {
    fileDrawerOpen: false,
    fileDrawerWidth: DEFAULT_FILE_DRAWER_WIDTH,
    outlineWidth: DEFAULT_OUTLINE_PANEL_WIDTH,
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

    const fileDrawerWidth = clampFileDrawerWidth(
      typeof parsed?.fileDrawerWidth === 'number' ? parsed.fileDrawerWidth : defaults.fileDrawerWidth,
    );
    const outlineWidth = clampOutlinePanelWidth(
      typeof parsed?.outlineWidth === 'number' ? parsed.outlineWidth : defaults.outlineWidth,
    );
    const fileDrawerOpen = typeof parsed?.fileDrawerOpen === 'boolean' ? parsed.fileDrawerOpen : defaults.fileDrawerOpen;
    const normalizedWidths = normalizeSidePanelWidths(fileDrawerWidth, outlineWidth, fileDrawerOpen, true, 'file-drawer');

    return {
      fileDrawerOpen,
      fileDrawerWidth: normalizedWidths.fileDrawerWidth,
      outlineWidth: normalizedWidths.outlineWidth,
    };
  } catch {
    return defaults;
  }
}

function loadPersistedOutlinePanelWidth(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_OUTLINE_PANEL_WIDTH;
  }

  try {
    const stored = window.localStorage.getItem(LAYOUT_PREFERENCES_KEY);
    if (!stored) {
      return DEFAULT_OUTLINE_PANEL_WIDTH;
    }

    const parsed = JSON.parse(stored) as Partial<ReaderLayoutPreferences> | null;
    return clampOutlinePanelWidth(
      typeof parsed?.outlineWidth === 'number' ? parsed.outlineWidth : DEFAULT_OUTLINE_PANEL_WIDTH,
    );
  } catch {
    return DEFAULT_OUTLINE_PANEL_WIDTH;
  }
}

function saveReaderLayoutPreferences(preferences: ReaderLayoutPreferences, outlineVisible = true): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const normalizedWidths = normalizeSidePanelWidths(
      preferences.fileDrawerWidth,
      preferences.outlineWidth,
      preferences.fileDrawerOpen,
      outlineVisible,
      'file-drawer',
    );
    const normalizedOutlineWidth = outlineVisible ? normalizedWidths.outlineWidth : clampOutlinePanelWidth(preferences.outlineWidth);

    window.localStorage.setItem(
      LAYOUT_PREFERENCES_KEY,
      JSON.stringify({
        fileDrawerOpen: preferences.fileDrawerOpen,
        fileDrawerWidth: normalizedWidths.fileDrawerWidth,
        outlineWidth: normalizedOutlineWidth,
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

function clampOutlinePanelWidth(width: number): number {
  return Math.min(selectMaxOutlinePanelWidth(), Math.max(MIN_OUTLINE_PANEL_WIDTH, width));
}

function selectMaxOutlinePanelWidth(): number {
  if (typeof window === 'undefined') {
    return MAX_OUTLINE_PANEL_WIDTH;
  }

  return Math.max(MIN_OUTLINE_PANEL_WIDTH, Math.min(MAX_OUTLINE_PANEL_WIDTH, window.innerWidth - 520));
}

function normalizeSidePanelWidths(
  fileDrawerWidth: number,
  outlineWidth: number,
  fileDrawerOpen: boolean,
  outlineVisible: boolean,
  priority: SidePanelWidthPriority,
): Pick<ReaderLayoutPreferences, 'fileDrawerWidth' | 'outlineWidth'> {
  let nextFileDrawerWidth = clampFileDrawerWidth(fileDrawerWidth);
  let nextOutlineWidth = clampOutlinePanelWidth(outlineWidth);

  if (!fileDrawerOpen || typeof window === 'undefined') {
    return {
      fileDrawerWidth: nextFileDrawerWidth,
      outlineWidth: nextOutlineWidth,
    };
  }

  const maxCombinedWidth = Math.max(
    MIN_FILE_DRAWER_WIDTH + (outlineVisible ? MIN_OUTLINE_PANEL_WIDTH : 0),
    window.innerWidth - MIN_READER_LAYOUT_WIDTH,
  );
  let overflow = nextFileDrawerWidth + (outlineVisible ? nextOutlineWidth : 0) - maxCombinedWidth;

  const reduceOutlineWidth = () => {
    const outlineReduction = Math.min(overflow, nextOutlineWidth - MIN_OUTLINE_PANEL_WIDTH);
    nextOutlineWidth -= outlineReduction;
    overflow -= outlineReduction;
  };

  const reduceFileDrawerWidth = () => {
    const fileDrawerReduction = Math.min(overflow, nextFileDrawerWidth - MIN_FILE_DRAWER_WIDTH);
    nextFileDrawerWidth -= fileDrawerReduction;
    overflow -= fileDrawerReduction;
  };

  if (overflow > 0 && priority === 'file-drawer') {
    reduceOutlineWidth();
  }

  if (overflow > 0) {
    reduceFileDrawerWidth();
  }

  if (overflow > 0) {
    reduceOutlineWidth();
  }

  return {
    fileDrawerWidth: nextFileDrawerWidth,
    outlineWidth: nextOutlineWidth,
  };
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
