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
        <h1>Markdown 阅读器设置</h1>
        {saved && <span>已保存</span>}
      </header>
      <section>
        <h2>阅读</h2>
        <label>
          阅读器主题
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
          阅读宽度
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
          阅读样式
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
        <label>
          弹窗主题
          <select
            value={settings.ui.popupTheme}
            onChange={(event) =>
              void updateSettings({
                ...settings,
                ui: { ...settings.ui, popupTheme: event.target.value as ThemePreference },
              })
            }
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
      </section>
      <section>
        <h2>渲染</h2>
        <Toggle
          label="语法高亮"
          checked={settings.rendering.syntaxHighlighting}
          onChange={(syntaxHighlighting) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, syntaxHighlighting },
            })
          }
        />
        <Toggle
          label="Mermaid 图表"
          checked={settings.rendering.mermaid}
          onChange={(mermaid) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, mermaid },
            })
          }
        />
        <Toggle
          label="MathJax 公式"
          checked={settings.rendering.mathJax}
          onChange={(mathJax) =>
            void updateSettings({
              ...settings,
              rendering: { ...settings.rendering, mathJax },
            })
          }
        />
        <Toggle
          label="Emoji 短代码"
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
        <h2>自定义 CSS</h2>
        <label>
          应用到正文的 CSS
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
