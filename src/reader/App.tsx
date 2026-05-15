import { useEffect, useMemo, useRef, useState } from 'react';

import { flattenMarkdownFiles, selectDefaultDocument } from '../shared/fileSystem';
import { renderMarkdown } from '../shared/render/markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, subscribeSettings } from '../shared/settings';
import { consumeTemporaryMarkdownDocument, type TemporaryMarkdownDocument } from '../shared/temporaryDocument';
import type { FileTreeNode, RenderResult } from '../shared/types';
import { selectActiveHeadingId } from './activeHeading';
import { FileDrawer } from './components/FileDrawer';
import { LargeDocumentReader } from './components/LargeDocumentReader';
import { OutlinePanel } from './components/OutlinePanel';
import { ReaderToolbar } from './components/ReaderToolbar';
import { reloadCurrentDocument } from './currentDocumentReload';
import { selectSiblingMarkdownNavigation } from './fileNavigation';
import {
  openDirectory,
  openMarkdownFile,
  readMarkdownFile,
  readMarkdownFileSlice,
  readMarkdownFileSnapshot,
  scanMarkdownDirectory,
  type MarkdownFileSnapshot,
} from './fileSystemAccess';
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

type LargeDocumentSession = {
  kind: Exclude<LargeDocumentKind, 'normal'>;
  reason: string;
  file: File;
  index: LargeDocumentIndex;
  client: LargeDocumentWorkerClient;
  rememberRecord?: LastDocumentRecord;
};

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [rendered, setRendered] = useState<RenderResult>(EMPTY_RENDER);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [lastDocument, setLastDocument] = useState<LastDocumentRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawActionStatus, setRawActionStatus] = useState<string | null>(null);
  const [largeDocument, setLargeDocument] = useState<LargeDocumentSession | null>(null);
  const [largeAnchorLine, setLargeAnchorLine] = useState(1);
  const renderedContentRef = useRef<HTMLDivElement | null>(null);
  const title = useMemo(() => rendered.title ?? activePath ?? 'Markdown Reader', [activePath, rendered.title]);
  const fileNavigation = useMemo(
    () => selectSiblingMarkdownNavigation(tree, activePath),
    [activePath, tree],
  );

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

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
    setActiveHeadingId(rendered.outline[0]?.id ?? null);
  }, [rendered.outline]);

  useEffect(() => {
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
  }, [rendered.html]);

  useEffect(() => {
    if (!renderedContentRef.current || settings.reading.rawMode) {
      return undefined;
    }

    return installTableFullscreen(renderedContentRef.current);
  }, [rendered.html, settings.reading.rawMode]);

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
    setStatus('请选择一个文件夹，读取其中的 Markdown 文件。');

    try {
      const handle = await openDirectory();
      const nextTree = await scanMarkdownDirectory(handle);
      const defaultPath = selectDefaultDocument(nextTree);

      setDirectoryHandle(handle);
      setTree(nextTree);
      setDrawerOpen(false);
      setStatus(nextTree.length ? null : '这个文件夹里没有找到 Markdown 文件。');

      if (defaultPath) {
        await openFile(handle, defaultPath, true);
      } else {
        setActivePath(null);
        setMarkdown('');
        setRendered(EMPTY_RENDER);
      }
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : '无法打开文件夹。');
    }
  }

  async function openStandaloneFile() {
    setError(null);
    setStatus('请选择一个 Markdown 文件。');

    try {
      const snapshot = await openMarkdownFile();
      const sample = await readMarkdownFileSlice(snapshot.file, 0, Math.min(snapshot.size, LARGE_SAMPLE_BYTES));
      const classification = classifyMarkdownDocument({ size: snapshot.size, sample });

      setDirectoryHandle(null);
      setTree([]);
      setDrawerOpen(false);

      if (classification.kind !== 'normal') {
        await openLargeDocument(snapshot, classification.kind, classification.reason ?? '已进入大文件安全模式。', {
          anchorLine: 1,
        });
        return;
      }

      closeLargeDocument();
      const source = await snapshot.file.text();
      const result = await renderMarkdown(source);

      setActivePath(snapshot.name);
      setMarkdown(source);
      setRendered(result);
      setLargeAnchorLine(1);
      setStatus(null);
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
    options: { anchorLine?: number } = {},
  ) {
    setError(null);
    setStatus(`正在打开 ${path}`);

    try {
      const snapshot = await readMarkdownFileSnapshot(handle, path);
      const sample = await readMarkdownFileSlice(snapshot.file, 0, Math.min(snapshot.size, LARGE_SAMPLE_BYTES));
      const classification = classifyMarkdownDocument({ size: snapshot.size, sample });

      if (classification.kind !== 'normal') {
        const record = remember
          ? {
              directoryHandle: handle,
              directoryName: handle.name,
              path,
              updatedAt: Date.now(),
            }
          : undefined;

        await openLargeDocument(snapshot, classification.kind, classification.reason ?? '已进入大文件安全模式。', {
          rememberRecord: record,
          anchorLine: options.anchorLine ?? 1,
        });
        return;
      }

      closeLargeDocument();

      const source = await readMarkdownFile(handle, path);
      const result = await renderMarkdown(source);

      setActivePath(path);
      setMarkdown(source);
      setRendered(result);
      setLargeAnchorLine(1);
      setStatus(null);

      if (remember) {
        const record = {
          directoryHandle: handle,
          directoryName: handle.name,
          path,
          updatedAt: Date.now(),
        };
        setLastDocument(record);
        await saveLastDocument(record);
      }
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : `无法打开 ${path}。`);
    }
  }

  async function openLargeDocument(
    snapshot: MarkdownFileSnapshot,
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
    setMarkdown('');
    setRendered({
      ...EMPTY_RENDER,
      title: index.title ?? snapshot.path,
      outline: index.outline,
      diagnostics: index.warnings.map((message) => ({ level: 'warning', message })),
    });
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
      setTree([]);
      setActivePath(name);
      setMarkdown(source);
      setRendered(result);
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
    setTree([]);
    setActivePath(null);
    setMarkdown('');
    setRendered(EMPTY_RENDER);
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
      setTree(nextTree);

      if (rememberedPath) {
        await openFile(record.directoryHandle, rememberedPath, rememberedPath !== record.path);
      } else {
        setStatus('上次打开的文件夹里没有找到 Markdown 文件。');
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

    await reloadCurrentDocument({
      directoryHandle,
      activePath,
      scrollY: window.scrollY,
      readMarkdownFile,
      renderMarkdown,
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
        ? flattenMarkdownFiles(nextTree).some((file) => file.path === activePath)
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
      setMarkdown('');
      setRendered(EMPTY_RENDER);
      setStatus('这个文件夹里没有找到 Markdown 文件。');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : '无法重载目录。');
    }
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
      const suggestedName = selectMarkdownSaveName(activePath);

      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'Markdown 文件',
              accept: { 'text/markdown': ['.md', '.markdown'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(markdown);
        await writable.close();
        setRawActionStatus('已保存');
        return;
      }

      downloadMarkdownSource(markdown, suggestedName);
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

  function closeDrawerFromReader(event: React.MouseEvent<HTMLElement>) {
    if (!drawerOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDrawerOpen(false);
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
      <FileDrawer
        open={drawerOpen}
        tree={tree}
        activePath={activePath}
        onOpenFolder={openFolder}
        onReloadFolder={() => void reloadFolderTree()}
        onClose={() => setDrawerOpen(false)}
        onSelect={(path) => {
          if (directoryHandle) {
            void openFile(directoryHandle, path);
          }
          setDrawerOpen(false);
        }}
      />
      <main className="reader-layout" onClickCapture={closeDrawerFromReader}>
        <article className="document-reader">
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
                    复制原文
                  </button>
                  <button type="button" onClick={() => void saveMarkdownSourceAs()}>
                    另存为
                  </button>
                  {rawActionStatus && <span role="status">{rawActionStatus}</span>}
                </div>
                <pre>{markdown}</pre>
              </section>
            ) : (
              <div ref={renderedContentRef}>
                <RenderedMarkdownContent html={rendered.html} mermaidEnabled={settings.rendering.mermaid} />
              </div>
            )
          ) : (
            <section className="empty-state">
              <h2>打开本地文件夹</h2>
              <p>选择包含 Markdown 文件的文件夹，把它作为本地文档集阅读。</p>
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

              document.getElementById(id)?.scrollIntoView({ block: 'start' });
            }}
          />
        )}
      </main>
    </div>
  );
}

function selectMarkdownSaveName(path: string | null): string {
  const fallbackName = 'document.md';
  const name = path?.split('/').filter(Boolean).at(-1) ?? fallbackName;

  return /\.(md|markdown)$/i.test(name) ? name : `${name}.md`;
}

function downloadMarkdownSource(source: string, filename: string) {
  const objectUrl = URL.createObjectURL(new Blob([source], { type: 'text/markdown;charset=utf-8' }));
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
