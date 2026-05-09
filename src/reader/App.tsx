import { useMemo, useState } from 'react';

import { DEFAULT_SETTINGS } from '../shared/settings';
import type { FileTreeNode, RenderResult } from '../shared/types';
import { FileDrawer } from './components/FileDrawer';
import { OutlinePanel } from './components/OutlinePanel';
import { ReaderToolbar } from './components/ReaderToolbar';
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
  const [tree] = useState<FileTreeNode[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [markdown] = useState('');
  const [rendered] = useState<RenderResult>(EMPTY_RENDER);
  const title = useMemo(() => rendered.title ?? activePath ?? 'Markdown Reader', [activePath, rendered.title]);

  return (
    <div className={`reader-app theme-${settings.reading.theme} width-${settings.reading.width}`}>
      <ReaderToolbar
        title={title}
        theme={settings.reading.theme}
        width={settings.reading.width}
        rawMode={settings.reading.rawMode}
        onOpenFolder={() => undefined}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        onThemeChange={(theme) => setSettings((current) => ({ ...current, reading: { ...current.reading, theme } }))}
        onWidthChange={(width) => setSettings((current) => ({ ...current, reading: { ...current.reading, width } }))}
        onRawModeChange={(rawMode) =>
          setSettings((current) => ({ ...current, reading: { ...current.reading, rawMode } }))
        }
      />
      <FileDrawer
        open={drawerOpen}
        tree={tree}
        activePath={activePath}
        onClose={() => setDrawerOpen(false)}
        onSelect={(path) => {
          setActivePath(path);
          setDrawerOpen(false);
        }}
      />
      <main className="reader-layout">
        <article className="document-reader">
          {activePath ? (
            settings.reading.rawMode ? (
              <pre>{markdown}</pre>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
            )
          ) : (
            <section className="empty-state">
              <h2>Open a local folder</h2>
              <p>Choose a folder with Markdown files to browse it as a local documentation set.</p>
            </section>
          )}
        </article>
        {settings.reading.showOutline && (
          <OutlinePanel
            outline={rendered.outline}
            onNavigate={(id) => document.getElementById(id)?.scrollIntoView({ block: 'start' })}
          />
        )}
      </main>
    </div>
  );
}
