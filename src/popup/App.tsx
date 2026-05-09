import { useEffect, useState } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings';
import type { ReaderSettings, ReadingWidth, ThemePreference } from '../shared/types';
import './App.css';

export function App() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void loadSettings().then(setSettings);
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

  return (
    <main className="popup-app">
      <header>
        <h1>Markdown Reader</h1>
      </header>
      <button type="button" className="primary-button" onClick={openReader}>
        Open Reader
      </button>
      <label>
        Theme
        <select
          value={settings.reading.theme}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, theme: event.target.value as ThemePreference },
            })
          }
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label>
        Width
        <select
          value={settings.reading.width}
          onChange={(event) =>
            void updateSettings({
              ...settings,
              reading: { ...settings.reading, width: event.target.value as ReadingWidth },
            })
          }
        >
          <option value="narrow">Narrow</option>
          <option value="comfortable">Comfortable</option>
          <option value="wide">Wide</option>
          <option value="full">Full</option>
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
        Raw Markdown
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
        Outline
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
        Auto Reload
      </label>
      <button type="button" onClick={openOptions}>
        Settings
      </button>
    </main>
  );
}
