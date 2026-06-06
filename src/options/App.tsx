import { useEffect, useState } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings';
import type { ReaderSettings, ReadingStyle, ReadingWidth, ThemePreference } from '../shared/types';
import {
  authorizeAiProjectSource,
  clearAiProjectState,
  EMPTY_AI_PROJECT_STATE,
  getAiProjectProviderLabel,
  loadAiProjectState,
  mergeAiProjectDirectory,
  rescanAiProjectSource,
  saveAiProjectState,
  type AiProjectEntry,
  type AiProjectProvider,
  type AiProjectSourceRecord,
  type AiProjectState,
} from '../reader/aiProjects';
import { openDirectory } from '../reader/fileSystemAccess';
import './App.css';

export function App() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [aiProjectState, setAiProjectState] = useState<AiProjectState>(EMPTY_AI_PROJECT_STATE);
  const [saved, setSaved] = useState(false);
  const [aiProjectStatus, setAiProjectStatus] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    void loadAiProjectState().then(setAiProjectState);
  }, []);

  async function updateSettings(next: ReaderSettings) {
    setSettings(next);
    await saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 900);
  }

  async function updateAiProjectSource(provider: AiProjectProvider, action: 'authorize' | 'rescan') {
    setAiProjectStatus(`${action === 'authorize' ? '请选择' : '正在重扫'} ${getAiProjectProviderLabel(provider)} 配置目录。`);

    try {
      const result = action === 'authorize'
        ? await authorizeAiProjectSource(aiProjectState, provider)
        : await rescanAiProjectSource(aiProjectState, provider);

      setAiProjectState(result.state);
      await saveAiProjectState(result.state);

      const projectCount = result.state.sources[provider]?.projectCount ?? 0;
      const warningText = result.warnings.length ? ` ${result.warnings.join(' ')}` : '';
      setAiProjectStatus(`已扫描 ${getAiProjectProviderLabel(provider)}：${projectCount} 个项目。${warningText}`.trim());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setAiProjectStatus(null);
        return;
      }

      setAiProjectStatus(err instanceof Error ? err.message : `无法扫描 ${getAiProjectProviderLabel(provider)} 项目。`);
    }
  }

  async function clearAiProjects() {
    setAiProjectState(EMPTY_AI_PROJECT_STATE);
    setAiProjectStatus('已清空 AI 项目记录。');
    await clearAiProjectState();
  }

  async function authorizeAiProject(project: AiProjectEntry) {
    setAiProjectStatus(`请选择项目目录：${project.expectedPath}`);

    try {
      const handle = await openDirectory();
      const nextState = mergeAiProjectDirectory(aiProjectState, project, handle);

      setAiProjectState(nextState);
      await saveAiProjectState(nextState);
      setAiProjectStatus(`已授权项目：${project.name}。`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setAiProjectStatus(null);
        return;
      }

      setAiProjectStatus(err instanceof Error ? err.message : `无法授权项目 ${project.name}。`);
    }
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
        <h2>AI 项目</h2>
        <p className="options-note">
          授权 Codex 或 Claude Code 的配置目录后，在这里授权项目目录；阅读器左侧只显示已授权项目。
        </p>
        <AiProjectSourceSettings
          provider="codex"
          source={aiProjectState.sources.codex}
          onAuthorize={() => void updateAiProjectSource('codex', 'authorize')}
          onRescan={() => void updateAiProjectSource('codex', 'rescan')}
        />
        <AiProjectSourceSettings
          provider="claude"
          source={aiProjectState.sources.claude}
          onAuthorize={() => void updateAiProjectSource('claude', 'authorize')}
          onRescan={() => void updateAiProjectSource('claude', 'rescan')}
        />
        <div className="options-actions">
          <span>{aiProjectState.projects.length ? `${aiProjectState.projects.length} 个项目` : '尚未扫描项目'}</span>
          <button type="button" onClick={() => void clearAiProjects()} disabled={!aiProjectState.projects.length}>
            清空 AI 项目记录
          </button>
        </div>
        {aiProjectState.projects.length ? (
          <AiProjectList
            projects={aiProjectState.projects}
            onAuthorize={(project) => void authorizeAiProject(project)}
          />
        ) : null}
        {aiProjectStatus && <p className="options-status">{aiProjectStatus}</p>}
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

function AiProjectList({
  projects,
  onAuthorize,
}: {
  projects: AiProjectEntry[];
  onAuthorize: (project: AiProjectEntry) => void;
}) {
  return (
    <ul className="ai-project-list">
      {projects.map((project) => (
        <li key={project.id}>
          <div>
            <strong>{project.directoryName ? `${project.name} · 已授权` : project.name}</strong>
            <span>{project.expectedPath}</span>
          </div>
          <button
            type="button"
            onClick={() => onAuthorize(project)}
          >
            {project.directoryHandle ? `重新授权项目：${project.name}` : `授权项目：${project.name}`}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AiProjectSourceSettings({
  provider,
  source,
  onAuthorize,
  onRescan,
}: {
  provider: AiProjectProvider;
  source: AiProjectSourceRecord | undefined;
  onAuthorize: () => void;
  onRescan: () => void;
}) {
  const providerName = getAiProjectProviderLabel(provider);

  return (
    <div className="ai-source-setting">
      <div>
        <strong>{providerName}</strong>
        <span>{source ? `${source.rootName} · ${source.projectCount} 个项目` : getExpectedRootHint(provider)}</span>
      </div>
      <div>
        <button type="button" onClick={onAuthorize}>
          {source ? `重新授权 ${providerName}` : `授权 ${providerName}`}
        </button>
        <button type="button" onClick={onRescan} disabled={!source}>
          重扫 {providerName}
        </button>
      </div>
    </div>
  );
}

function getExpectedRootHint(provider: AiProjectProvider): string {
  return provider === 'codex' ? '选择 ~/.codex' : '选择 ~/.claude';
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
