import { useEffect, useMemo, useRef, useState } from 'react';

import { selectDefaultDocument } from '../shared/fileSystem';
import { renderMarkdown } from '../shared/render/markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, subscribeSettings } from '../shared/settings';
import type { FileTreeNode, RenderResult } from '../shared/types';
import { selectActiveHeadingId } from './activeHeading';
import { FileDrawer } from './components/FileDrawer';
import { OutlinePanel } from './components/OutlinePanel';
import { ReaderToolbar } from './components/ReaderToolbar';
import { reloadCurrentDocument } from './currentDocumentReload';
import { openDirectory, readMarkdownFile, scanMarkdownDirectory } from './fileSystemAccess';
import {
  canReadDirectory,
  loadLastDocument,
  requestDirectoryReadPermission,
  saveLastDocument,
  selectRememberedDocumentPath,
  type LastDocumentRecord,
} from './recentDocument';
import { installTableFullscreen } from './tableFullscreen';
import './App.css';

const EMPTY_RENDER: RenderResult = {
  html: '',
  outline: [],
  title: null,
  links: [],
  diagnostics: [],
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
  const renderedContentRef = useRef<HTMLDivElement | null>(null);
  const title = useMemo(() => rendered.title ?? activePath ?? 'Markdown Reader', [activePath, rendered.title]);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    void restoreLastDocument();
  }, []);

  useEffect(() => {
    return subscribeSettings(setSettings);
  }, []);

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

  async function openFile(handle: FileSystemDirectoryHandle, path: string, remember = true) {
    setError(null);
    setStatus(`正在打开 ${path}`);

    try {
      const source = await readMarkdownFile(handle, path);
      const result = await renderMarkdown(source);

      setActivePath(path);
      setMarkdown(source);
      setRendered(result);
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

  return (
    <div
      className={`reader-app theme-${settings.reading.theme} width-${settings.reading.width} style-${settings.reading.style}`}
    >
      <ReaderToolbar
        title={title}
        rawMode={settings.reading.rawMode}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        onReload={() => void reloadActiveFile()}
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
        onClose={() => setDrawerOpen(false)}
        onSelect={(path) => {
          if (directoryHandle) {
            void openFile(directoryHandle, path);
          }
          setDrawerOpen(false);
        }}
      />
      <main className="reader-layout">
        <article className="document-reader">
          {status && <p className="status-note">{status}</p>}
          {error && <p className="error-note">{error}</p>}
          {activePath ? (
            settings.reading.rawMode ? (
              <pre>{markdown}</pre>
            ) : (
              <div ref={renderedContentRef} dangerouslySetInnerHTML={{ __html: rendered.html }} />
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
            onNavigate={(id) => document.getElementById(id)?.scrollIntoView({ block: 'start' })}
          />
        )}
      </main>
    </div>
  );
}
