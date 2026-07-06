import { useRef } from 'react';

import {
  BUILTIN_READER_THEMES,
  buildBuiltinThemeStylesheet,
  buildInstalledThemeStylesheet,
  createInstalledReaderThemeId,
  getBuiltinReaderTheme,
} from '../shared/themes';
import type {
  ColorModePreference,
  ReaderSettings,
  ReaderThemePackage,
  ReadingWidth,
  RemoteThemeIndex,
  RemoteThemeIndexEntry,
} from '../shared/types';

type ThemeActionHandler = (theme: ReaderThemePackage) => void | Promise<void>;
type RemoteThemeActionHandler = (theme: RemoteThemeIndexEntry) => void | Promise<void>;

type ReadingSettingsFormProps = {
  settings: ReaderSettings;
  installedThemes: ReaderThemePackage[];
  onSettingsChange: (settings: ReaderSettings) => Promise<void>;
};

type ThemePackageImportControlsProps = {
  onThemePackageFile: (file: File | undefined) => void | Promise<void>;
};

type ThemeCatalogListProps = {
  themes: ReaderThemePackage[];
  installedThemes: ReaderThemePackage[];
  onPreview: ThemeActionHandler;
  onInstall: ThemeActionHandler;
};

type RemoteThemeListProps = {
  index: RemoteThemeIndex | null;
  installedThemes: ReaderThemePackage[];
  hiddenThemeIds?: readonly string[];
  onRefresh: () => void | Promise<void>;
  onPreview: RemoteThemeActionHandler;
  onInstall: RemoteThemeActionHandler;
};

type InstalledThemePackageListProps = {
  installedThemes: ReaderThemePackage[];
  activeThemeId: ReaderSettings['reading']['themeId'];
  onApply: ThemeActionHandler;
  onExport: ThemeActionHandler;
  onRemove: ThemeActionHandler;
};

type ThemePackageCurrentSummaryProps = {
  theme: ReaderThemePackage;
};

type PendingThemePackagePreviewProps = {
  settings: ReaderSettings;
  theme: ReaderThemePackage;
  existingTheme: ReaderThemePackage | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

type ThemePreviewProps = {
  settings: ReaderSettings;
  installedTheme: ReaderThemePackage | null;
};

export function ThemePackageImportControls({
  onThemePackageFile,
}: ThemePackageImportControlsProps) {
  const themeFileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleThemePackageFile(file: File | undefined) {
    try {
      await onThemePackageFile(file);
    } finally {
      if (themeFileInputRef.current) {
        themeFileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="theme-package-actions">
      <input
        ref={themeFileInputRef}
        type="file"
        accept=".mdv-theme.json,.json,application/json"
        aria-label="选择主题包文件"
        onChange={(event) => void handleThemePackageFile(event.target.files?.[0])}
      />
      <button type="button" onClick={() => themeFileInputRef.current?.click()}>
        选择主题包
      </button>
    </div>
  );
}

export function ReadingSettingsForm({
  settings,
  installedThemes,
  onSettingsChange,
}: ReadingSettingsFormProps) {
  return (
    <div className="reading-settings-grid__controls">
      <label>
        颜色模式
        <select
          value={settings.reading.colorMode}
          onChange={(event) =>
            void onSettingsChange({
              ...settings,
              reading: { ...settings.reading, colorMode: event.target.value as ColorModePreference },
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
            void onSettingsChange({
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
        阅读主题
        <select
          value={settings.reading.themeId}
          onChange={(event) =>
            void onSettingsChange({
              ...settings,
              reading: { ...settings.reading, themeId: event.target.value as ReaderSettings['reading']['themeId'] },
            })
          }
        >
          <optgroup label="内置">
            {BUILTIN_READER_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </optgroup>
          {installedThemes.length ? (
            <optgroup label="已安装">
              {installedThemes.map((theme) => (
                <option key={theme.id} value={createInstalledReaderThemeId(theme.id)}>
                  {theme.name} · {theme.version}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      <label>
        弹窗颜色模式
        <select
          value={settings.ui.popupColorMode}
          onChange={(event) =>
            void onSettingsChange({
              ...settings,
              ui: { ...settings.ui, popupColorMode: event.target.value as ColorModePreference },
            })
          }
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </label>
    </div>
  );
}

export function ThemeCatalogList({
  themes,
  installedThemes,
  onPreview,
  onInstall,
}: ThemeCatalogListProps) {
  function findInstalledTheme(themeId: string): ReaderThemePackage | undefined {
    return installedThemes.find((item) => item.id === themeId);
  }

  return (
    <div className="theme-catalog">
      <h3>推荐主题</h3>
      <ul className="theme-catalog-list" aria-label="推荐主题">
        {themes.map((theme) => {
          const installedTheme = findInstalledTheme(theme.id);
          const installedSameVersion = installedTheme?.version === theme.version;

          return (
            <li key={theme.id}>
              <div>
                <strong>{theme.name}</strong>
                <span>
                  {theme.version} · {formatThemeColorScheme(theme.colorScheme)}
                  {theme.author ? ` · ${theme.author}` : ''}
                </span>
                {theme.description && <p>{theme.description}</p>}
              </div>
              <div className="theme-package-actions">
                <button type="button" onClick={() => void onPreview(theme)}>
                  预览
                </button>
                <button type="button" onClick={() => void onInstall(theme)} disabled={installedSameVersion}>
                  {installedSameVersion ? '已安装' : installedTheme ? '更新' : '安装'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RemoteThemeList({
  index,
  installedThemes,
  hiddenThemeIds = [],
  onRefresh,
  onPreview,
  onInstall,
}: RemoteThemeListProps) {
  const hiddenThemeIdSet = new Set(hiddenThemeIds);
  const visibleThemes = index?.themes.filter((theme) => !hiddenThemeIdSet.has(theme.id)) ?? [];

  function findInstalledTheme(themeId: string): ReaderThemePackage | undefined {
    return installedThemes.find((item) => item.id === themeId);
  }

  return (
    <div className="theme-catalog">
      <div className="theme-section-heading">
        <h3>远程主题</h3>
        <button type="button" onClick={() => void onRefresh()}>
          刷新远程主题
        </button>
      </div>
      {visibleThemes.length ? (
        <ul className="theme-catalog-list" aria-label="远程主题">
          {visibleThemes.map((theme) => {
            const installedTheme = findInstalledTheme(theme.id);
            const installedSameVersion = installedTheme?.version === theme.version;
            const unavailable = theme.deprecated || !theme.compatible;
            const disabled = installedSameVersion || unavailable;
            const installedState = formatRemoteThemeInstalledState(theme, installedTheme);

            return (
              <li key={theme.id}>
                <div>
                  {theme.previewUrl && (
                    <img
                      className="theme-remote-preview"
                      src={theme.previewUrl}
                      alt={`${theme.name} 预览图`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="theme-package-title">
                    <strong>{theme.name}</strong>
                    {installedState && <span className="theme-package-state">{installedState}</span>}
                  </div>
                  <span>
                    {theme.version} · {formatThemeColorScheme(theme.colorScheme)}
                    {theme.author ? ` · ${theme.author}` : ''}
                  </span>
                  {theme.description && <p>{theme.description}</p>}
                  {theme.tags.length ? <p>{theme.tags.join(' · ')}</p> : null}
                </div>
                <div className="theme-package-actions">
                  <button type="button" onClick={() => void onPreview(theme)} disabled={unavailable}>
                    预览
                  </button>
                  <button type="button" onClick={() => void onInstall(theme)} disabled={disabled}>
                    {formatRemoteThemeInstallLabel(theme, installedTheme)}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="theme-package-meta">{index ? '暂无可显示的远程主题。' : '暂无远程主题索引。'}</p>
      )}
    </div>
  );
}

export function ThemePackageCurrentSummary({
  theme,
}: ThemePackageCurrentSummaryProps) {
  return (
    <p className="theme-package-meta">
      当前：{theme.name} · {theme.version} · {formatThemeColorScheme(theme.colorScheme)}
      {theme.author ? ` · ${theme.author}` : ''}
    </p>
  );
}

export function InstalledThemePackageList({
  installedThemes,
  activeThemeId,
  onApply,
  onExport,
  onRemove,
}: InstalledThemePackageListProps) {
  if (!installedThemes.length) {
    return null;
  }

  return (
    <ul className="theme-package-list" aria-label="已安装主题">
      {installedThemes.map((theme) => {
        const active = activeThemeId === createInstalledReaderThemeId(theme.id);

        return (
          <li key={theme.id}>
            <div>
              <strong>{active ? `${theme.name} · 使用中` : theme.name}</strong>
              <span>
                {theme.version} · {formatThemeColorScheme(theme.colorScheme)}
                {theme.author ? ` · ${theme.author}` : ''}
              </span>
              {theme.description && <p>{theme.description}</p>}
            </div>
            <div className="theme-package-actions">
              <button type="button" onClick={() => void onApply(theme)} disabled={active}>
                应用
              </button>
              <button type="button" onClick={() => void onExport(theme)}>
                导出
              </button>
              <button type="button" onClick={() => void onRemove(theme)}>
                删除
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PendingThemePackagePreview({
  settings,
  theme,
  existingTheme,
  onConfirm,
  onCancel,
}: PendingThemePackagePreviewProps) {
  return (
    <div className="theme-package-preview">
      <div className="theme-package-preview__summary">
        <div>
          <strong>{theme.name}</strong>
          <span>
            {theme.version} · {formatThemeColorScheme(theme.colorScheme)}
            {theme.author ? ` · ${theme.author}` : ''}
          </span>
          {theme.description && <p>{theme.description}</p>}
        </div>
        <div className="theme-package-actions">
          <button type="button" onClick={() => void onConfirm()}>
            {existingTheme ? '确认更新' : '确认安装'}
          </button>
          <button type="button" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
      <ThemePreview
        settings={{
          ...settings,
          reading: { ...settings.reading, themeId: createInstalledReaderThemeId(theme.id) },
        }}
        installedTheme={theme}
      />
    </div>
  );
}

export function ThemePreview({
  settings,
  installedTheme,
}: ThemePreviewProps) {
  const builtinTheme = getBuiltinReaderTheme(settings.reading.themeId);
  const themeStylesheet = installedTheme
    ? buildInstalledThemeStylesheet(installedTheme)
    : buildBuiltinThemeStylesheet(builtinTheme);
  const className = [
    'theme-preview',
    `theme-${settings.reading.colorMode}`,
    builtinTheme?.cssClass,
  ].filter(Boolean).join(' ');

  return (
    <div className={className} data-reader-theme-id={settings.reading.themeId}>
      {themeStylesheet && <style>{themeStylesheet}</style>}
      <article className="document-reader theme-preview__document" aria-label="阅读主题预览">
        <h1>主题预览</h1>
        <p>
          这是一段用于检查正文、<a href="#preview-link">链接</a>、强调文本和行高的示例内容。
        </p>
        <blockquote>
          <p>引用块用于观察边框、背景和弱化文本的层次。</p>
        </blockquote>
        <pre><code>{'const rows = ["标题", "正文", "表格"];'}</code></pre>
        <table>
          <thead>
            <tr>
              <th>项目</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>表格</td>
              <td>可读</td>
            </tr>
            <tr>
              <td>代码块</td>
              <td>清晰</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}

function formatThemeColorScheme(colorScheme: ReaderThemePackage['colorScheme']): string {
  if (colorScheme === 'light') {
    return '浅色';
  }

  if (colorScheme === 'dark') {
    return '深色';
  }

  return '跟随系统';
}

function formatRemoteThemeInstallLabel(
  theme: RemoteThemeIndexEntry,
  installedTheme: ReaderThemePackage | undefined,
): string {
  if (!theme.compatible) {
    return '不兼容';
  }

  if (theme.deprecated) {
    return '已下架';
  }

  if (installedTheme?.version === theme.version) {
    return '已安装';
  }

  return installedTheme ? '更新' : '安装';
}

function formatRemoteThemeInstalledState(
  theme: RemoteThemeIndexEntry,
  installedTheme: ReaderThemePackage | undefined,
): string | null {
  if (!installedTheme) {
    return null;
  }

  return installedTheme.version === theme.version ? '已安装' : '已安装旧版';
}
