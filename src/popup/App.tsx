import { useEffect, useState } from 'react';

import { clearLastDocument, loadLastDocument, type LastDocumentRecord } from '../reader/recentDocument';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings';
import type { ReaderSettings, ReadingStyle, ReadingWidth, ThemePreference } from '../shared/types';
import './App.css';

export function App() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [lastDocument, setLastDocument] = useState<LastDocumentRecord | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void loadLastDocument().then(setLastDocument);
  }, []);

  async function updateSettings(next: ReaderSettings) {
    setSettings(next);
    await saveSettings(next);
  }

  async function openReader() {
    await chrome.runtime.sendMessage({ type: 'openReader' });
    window.close();
  }

  async function openOptions() {
    await chrome.runtime.openOptionsPage();
    window.close();
  }

  async function clearRememberedDocument() {
    await clearLastDocument();
    setLastDocument(null);
  }

  return (
    <main className="popup-app">
      <header>
        <h1>Markdown 阅读器</h1>
      </header>
      <button type="button" className="primary-button" onClick={openReader}>
        打开阅读器
      </button>
      <section className="last-document" aria-label="上次打开">
        <div>
          <span>上次打开</span>
          <strong title={lastDocument ? `${lastDocument.directoryName}/${lastDocument.path}` : undefined}>
            {lastDocument ? `${lastDocument.directoryName}/${lastDocument.path}` : '未记录'}
          </strong>
        </div>
        {lastDocument && (
          <button type="button" onClick={() => void clearRememberedDocument()}>
            清空上次打开
          </button>
        )}
      </section>
      <label>
        主题
        <select
          value={settings.reading.theme}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, theme: event.target.value as ThemePreference },
            })
          }
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </label>
      <label>
        宽度
        <select
          value={settings.reading.width}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, width: event.target.value as ReadingWidth },
            })
          }
        >
          <option value="narrow">窄</option>
          <option value="comfortable">舒适</option>
          <option value="wide">宽</option>
          <option value="full">全宽</option>
        </select>
      </label>
      <label>
        样式
        <select
          value={settings.reading.style}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, style: event.target.value as ReadingStyle },
            })
          }
        >
          <option value="paper">纸张</option>
          <option value="clean">清爽文档</option>
          <option value="github">GitHub</option>
          <option value="classic">经典</option>
        </select>
      </label>
      <label className="inline-control">
        <input
          type="checkbox"
          checked={settings.reading.rawMode}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, rawMode: event.target.checked },
            })
          }
        />
        显示原文
      </label>
      <label className="inline-control">
        <input
          type="checkbox"
          checked={settings.reading.showOutline}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, showOutline: event.target.checked },
            })
          }
        />
        显示大纲
      </label>
      <label className="inline-control">
        <input
          type="checkbox"
          checked={settings.reading.autoReload}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, autoReload: event.target.checked },
            })
          }
        />
        自动刷新
      </label>
      <button type="button" onClick={openOptions}>
        设置
      </button>
    </main>
  );
}
