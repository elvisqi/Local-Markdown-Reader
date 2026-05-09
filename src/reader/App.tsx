import { useEffect, useMemo, useState } from 'react';

import { selectDefaultDocument } from '../shared/fileSystem';
import { renderMarkdown } from '../shared/render/markdown';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings';
import type { FileTreeNode, RenderResult } from '../shared/types';
import { selectActiveHeadingId } from './activeHeading';
import { FileDrawer } from './components/FileDrawer';
import { OutlinePanel } from './components/OutlinePanel';
import { ReaderToolbar } from './components/ReaderToolbar';
import { openDirectory, readMarkdownFile, scanMarkdownDirectory } from './fileSystemAccess';
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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const title = useMemo(() => rendered.title ?? activePath ?? 'Markdown Reader', [activePath, rendered.title]);

  useEffect(() => {
    void loadSettings().then(setSettings);
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
        await openFile(handle, defaultPath);
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

  async function openFile(handle: FileSystemDirectoryHandle, path: string) {
    setError(null);
    setStatus(`正在打开 ${path}`);

    try {
      const source = await readMarkdownFile(handle, path);
      const result = await renderMarkdown(source);

      setActivePath(path);
      setMarkdown(source);
      setRendered(result);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : `无法打开 ${path}。`);
    }
  }

  return (
    <div
      className={`reader-app theme-${settings.reading.theme} width-${settings.reading.width} style-${settings.reading.style}`}
    >
      <ReaderToolbar
        title={title}
        rawMode={settings.reading.rawMode}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
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
              <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
            )
          ) : (
            <section className="empty-state">
              <h2>打开本地文件夹</h2>
              <p>选择包含 Markdown 文件的文件夹，把它作为本地文档集阅读。</p>
              <button type="button" onClick={openFolder}>
                打开文件夹
              </button>
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
