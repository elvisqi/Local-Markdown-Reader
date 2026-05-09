import { useEffect, useState } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings';
import type { ReaderSettings, ReadingStyle, ReadingWidth, ThemePreference } from '../shared/types';
import './App.css';

export function App() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  async function updateSettings(next: ReaderSettings) {
    setSettings(next);
    await saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 900);
  }

  return (
    <main className="options-app">
      <header>
        <h1>Markdown Reader Settings</h1>
        {saved && <span>Saved</span>}
      </header>
      <section>
        <h2>Reading</h2>
        <label>
          Reader theme
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
          Reading width
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
        <label>
          Reading style
          <select
            value={settings.reading.style}
            onChange={(event) =>
              void updateSettings({
                ...settings,
                reading: { ...settings.reading, style: event.target.value as ReadingStyle },
              })
            }
          >
            <option value="clean">Clean Doc</option>
            <option value="github">GitHub</option>
            <option value="paper">Paper</option>
            <option value="classic">Classic</option>
          </select>
        </label>
        <label>
          Popup theme
          <select
            value={settings.ui.popupTheme}
            onChange={(event) =>
              void updateSettings({
                ...settings,
                ui: { ...settings.ui, popupTheme: event.target.value as ThemePreference },
              })
            }
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>
      <section>
        <h2>Rendering</h2>
        <Toggle
          label="Syntax highlighting"
          checked={settings.rendering.syntaxHighlighting}
          onChange={(syntaxHighlighting) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, syntaxHighlighting },
            })
          }
        />
        <Toggle
          label="Mermaid diagrams"
          checked={settings.rendering.mermaid}
          onChange={(mermaid) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, mermaid },
            })
          }
        />
        <Toggle
          label="MathJax formulas"
          checked={settings.rendering.mathJax}
          onChange={(mathJax) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, mathJax },
            })
          }
        />
        <Toggle
          label="Emoji shortcodes"
          checked={settings.rendering.emoji}
          onChange={(emoji) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, emoji },
            })
          }
        />
      </section>
      <section>
        <h2>Custom CSS</h2>
        <label>
          CSS applied to rendered Markdown
          <textarea
            value={settings.rendering.customCss}
            rows={8}
            onChange={(event) =>
              void updateSettings({
                ...settings,
                rendering: { ...settings.rendering, customCss: event.target.value },
              })
            }
          />
        </label>
      </section>
    </main>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
