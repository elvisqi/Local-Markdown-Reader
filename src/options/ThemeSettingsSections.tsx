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

type ThemeLibraryListProps = {
  settings: ReaderSettings;
  bundledThemes: ReaderThemePackage[];
  index: RemoteThemeIndex | null;
  installedThemes: ReaderThemePackage[];
  hiddenRemoteThemeIds?: readonly string[];
  onRefresh: () => void | Promise<void>;
  onPreviewBundled: ThemeActionHandler;
  onInstallBundled: ThemeActionHandler;
  onPreviewRemote: RemoteThemeActionHandler;
  onInstallRemote: RemoteThemeActionHandler;
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
  settings: ReaderSettings;
  installedThemes: ReaderThemePackage[];
  activeThemeId: ReaderSettings['reading']['themeId'];
  onPreview: ThemeActionHandler;
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
  label?: string;
  compact?: boolean;
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

export function ThemeLibraryList({
  settings,
  bundledThemes,
  index,
  installedThemes,
  hiddenRemoteThemeIds = [],
  onRefresh,
  onPreviewBundled,
  onInstallBundled,
  onPreviewRemote,
  onInstallRemote,
}: ThemeLibraryListProps) {
  const hiddenRemoteThemeIdSet = new Set([
    ...hiddenRemoteThemeIds,
    ...bundledThemes.map((theme) => theme.id),
  ]);
  const visibleRemoteThemes = index?.themes.filter((theme) => !hiddenRemoteThemeIdSet.has(theme.id)) ?? [];
  const hasThemes = bundledThemes.length || visibleRemoteThemes.length;

  function findInstalledTheme(themeId: string): ReaderThemePackage | undefined {
    return installedThemes.find((item) => item.id === themeId);
  }

  return (
    <div className="theme-catalog theme-library">
      <div className="theme-section-heading">
        <h3>主题库</h3>
        <button type="button" onClick={() => void onRefresh()}>
          刷新远程主题
        </button>
      </div>
      {hasThemes ? (
        <ul className="theme-catalog-list theme-library-list" aria-label="主题库">
          {bundledThemes.map((theme) => {
            const installedTheme = findInstalledTheme(theme.id);
            const installedSameVersion = installedTheme?.version === theme.version;
            const installedState = formatBundledThemeInstalledState(theme, installedTheme);

            return (
              <li key={`bundled:${theme.id}`} className="theme-package-card">
                <ThemePreview
                  settings={{
                    ...settings,
                    reading: { ...settings.reading, themeId: createInstalledReaderThemeId(theme.id) },
                  }}
                  installedTheme={theme}
                  label={`${theme.name} 预览`}
                  compact
                />
                <ThemePackageCardDetails
                  name={theme.name}
                  version={theme.version}
                  colorScheme={theme.colorScheme}
                  author={theme.author}
                  description={theme.description}
                  sourceLabel="内置"
                  stateLabel={installedState}
                />
                <div className="theme-package-actions">
                  <button type="button" onClick={() => void onPreviewBundled(theme)}>
                    预览
                  </button>
                  <button type="button" onClick={() => void onInstallBundled(theme)} disabled={installedSameVersion}>
                    {installedSameVersion ? '已安装' : installedTheme ? '更新' : '安装'}
                  </button>
                </div>
              </li>
            );
          })}
          {visibleRemoteThemes.map((theme) => {
            const installedTheme = findInstalledTheme(theme.id);
            const installedSameVersion = installedTheme?.version === theme.version;
            const unavailable = theme.deprecated || !theme.compatible;
            const disabled = installedSameVersion || unavailable;
            const installedState = formatRemoteThemeInstalledState(theme, installedTheme);

            return (
              <li key={`remote:${theme.id}`} className="theme-package-card">
                {installedSameVersion && installedTheme ? (
                  <ThemePreview
                    settings={{
                      ...settings,
                      reading: { ...settings.reading, themeId: createInstalledReaderThemeId(installedTheme.id) },
                    }}
                    installedTheme={installedTheme}
                    label={`${theme.name} 预览`}
                    compact
                  />
                ) : theme.previewUrl ? (
                  <img
                    className="theme-remote-preview"
                    src={theme.previewUrl}
                    alt={`${theme.name} 预览图`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="theme-remote-preview theme-remote-preview--empty" aria-label={`${theme.name} 预览暂不可用`}>
                    暂无预览
                  </div>
                )}
                <ThemePackageCardDetails
                  name={theme.name}
                  version={theme.version}
                  colorScheme={theme.colorScheme}
                  author={theme.author}
                  description={theme.description}
                  tags={theme.tags}
                  sourceLabel="在线"
                  stateLabel={installedState}
                />
                <div className="theme-package-actions">
                  <button type="button" onClick={() => void onPreviewRemote(theme)} disabled={unavailable}>
                    预览
                  </button>
                  <button type="button" onClick={() => void onInstallRemote(theme)} disabled={disabled}>
                    {formatRemoteThemeInstallLabel(theme, installedTheme)}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="theme-package-meta">{index ? '暂无可显示的主题。' : '暂无远程主题索引。'}</p>
      )}
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
  settings,
  installedThemes,
  activeThemeId,
  onPreview,
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
          <li key={theme.id} className="theme-package-card">
            <ThemePreview
              settings={{
                ...settings,
                reading: { ...settings.reading, themeId: createInstalledReaderThemeId(theme.id) },
              }}
              installedTheme={theme}
              label={`${theme.name} 预览`}
              compact
            />
            <ThemePackageCardDetails
              name={active ? `${theme.name} · 使用中` : theme.name}
              version={theme.version}
              colorScheme={theme.colorScheme}
              author={theme.author}
              description={theme.description}
              sourceLabel="已安装"
              stateLabel={active ? '使用中' : null}
              diagnostics={formatThemePackageDiagnostics(theme)}
            />
            <div className="theme-package-actions">
              <button type="button" onClick={() => void onPreview(theme)}>
                预览
              </button>
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
  const titleId = `theme-preview-dialog-title-${theme.id}`;
  const primaryActionLabel = existingTheme
    ? existingTheme.version === theme.version ? '应用' : '确认更新'
    : '确认安装';

  return (
    <div className="theme-package-preview-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="theme-package-preview-modal__panel">
        <div className="theme-package-preview__summary">
          <div>
            <h3 id={titleId}>{theme.name} 主题预览</h3>
            <span>
              {theme.version} · {formatThemeColorScheme(theme.colorScheme)}
              {theme.author ? ` · ${theme.author}` : ''}
            </span>
            {theme.description && <p>{theme.description}</p>}
          </div>
          <div className="theme-package-actions">
            <button type="button" onClick={() => void onConfirm()}>
              {primaryActionLabel}
            </button>
            <button type="button" onClick={onCancel}>
              关闭
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
    </div>
  );
}

export function ThemePreview({
  settings,
  installedTheme,
  label = '阅读主题预览',
  compact = false,
}: ThemePreviewProps) {
  const builtinTheme = getBuiltinReaderTheme(settings.reading.themeId);
  const themeStylesheet = installedTheme
    ? buildInstalledThemeStylesheet(installedTheme)
    : buildBuiltinThemeStylesheet(builtinTheme);
  const className = [
    'theme-preview',
    compact ? 'theme-preview--compact' : null,
    `theme-${settings.reading.colorMode}`,
    builtinTheme?.cssClass,
  ].filter(Boolean).join(' ');

  return (
    <div className={className} data-reader-theme-id={settings.reading.themeId} data-theme-layout-scope="theme-preview-overlay">
      {themeStylesheet && <style>{themeStylesheet}</style>}
      <article className="document-reader theme-preview__document" aria-label={label}>
        <h1 className="markdown-heading markdown-heading--h1">主题预览</h1>
        <h2 className="markdown-heading markdown-heading--h2">阅读层级</h2>
        <p className="markdown-paragraph">
          这是一段用于检查正文、<a className="markdown-link markdown-link--external" href="#preview-link">链接</a>、
          <code className="markdown-code markdown-code--inline markdown-inline-code">inline</code>、
          <mark className="markdown-mark">高亮</mark>和行高的示例内容。
        </p>
        <p className="markdown-paragraph theme-preview__tags">
          <span className="markdown-tag" data-tag="theme">#theme</span>
          <span className="markdown-tag" data-tag="status">#status</span>
          <span className="markdown-tag" data-tag="done">#done</span>
        </p>
        <h3 className="markdown-heading markdown-heading--h3">任务列表</h3>
        <ul className="markdown-list markdown-list--unordered">
          <li className="markdown-list-item markdown-task markdown-task--checked">
            <input className="markdown-task-checkbox" type="checkbox" checked readOnly /> 已完成事项
          </li>
          <li className="markdown-list-item markdown-task">
            <input className="markdown-task-checkbox" type="checkbox" readOnly /> 待处理事项
          </li>
        </ul>
        <div className="theme-preview__callouts">
          <blockquote className="markdown-quote callout callout-info" data-callout="info">
            <div className="callout-title">提示</div>
            <div className="callout-content">
              <p className="markdown-paragraph">引用块用于观察边框、背景和弱化文本的层次。</p>
            </div>
          </blockquote>
          <blockquote className="markdown-quote callout callout-warning" data-callout="warning">
            <div className="callout-title">注意</div>
            <div className="callout-content">
              <p className="markdown-paragraph">警告块用于检查强调色、图标位和标题权重。</p>
            </div>
          </blockquote>
          <blockquote className="markdown-quote callout callout-success" data-callout="success">
            <div className="callout-title">完成</div>
            <div className="callout-content">
              <p className="markdown-paragraph">成功块用于检查柔和背景和状态色。</p>
            </div>
          </blockquote>
        </div>
        <h3 className="markdown-heading markdown-heading--h3">代码块</h3>
        <pre className="markdown-code-block" data-language="ts"><code className="language-ts markdown-code markdown-code--block">
          <span className="line"><span className="token keyword">const</span> <span className="token function">rows</span> <span className="token operator">=</span> <span className="token punctuation">[</span><span className="token string">"标题"</span><span className="token punctuation">,</span> <span className="token string">"正文"</span><span className="token punctuation">]</span><span className="token punctuation">;</span></span>
          <span className="line"><span className="token comment">// theme preview details</span></span>
          <span className="line"><span className="token keyword">return</span> rows<span className="token punctuation">.</span><span className="token function">length</span><span className="token punctuation">;</span></span>
        </code></pre>
        <h4 className="markdown-heading markdown-heading--h4">数据表格</h4>
        <table className="markdown-table">
          <caption className="markdown-table-caption">表格、边框和斑马纹</caption>
          <thead className="markdown-table-head">
            <tr className="markdown-table-row">
              <th className="markdown-table-cell markdown-table-cell--head">项目</th>
              <th className="markdown-table-cell markdown-table-cell--head">状态</th>
              <th className="markdown-table-cell markdown-table-cell--head">说明</th>
            </tr>
          </thead>
          <tbody className="markdown-table-body">
            <tr className="markdown-table-row">
              <td className="markdown-table-cell">表格</td>
              <td className="markdown-table-cell">可读</td>
              <td className="markdown-table-cell">用于检查列宽</td>
            </tr>
            <tr className="markdown-table-row">
              <td className="markdown-table-cell">代码块</td>
              <td className="markdown-table-cell">清晰</td>
              <td className="markdown-table-cell">用于检查语法色</td>
            </tr>
            <tr className="markdown-table-row">
              <td className="markdown-table-cell">Callout</td>
              <td className="markdown-table-cell">突出</td>
              <td className="markdown-table-cell">用于检查块样式</td>
            </tr>
          </tbody>
        </table>
        <figure className="markdown-image">
          <div className="theme-preview__image-frame" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <figcaption className="markdown-image-caption">图片边框和说明文字</figcaption>
        </figure>
        <div className="mermaid" aria-label="Mermaid 图示样本">
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </div>
        <hr className="markdown-rule" />
      </article>
    </div>
  );
}

function ThemePackageCardDetails({
  name,
  version,
  colorScheme,
  author,
  description,
  tags = [],
  sourceLabel,
  stateLabel,
  diagnostics,
}: {
  name: string;
  version: string;
  colorScheme: ReaderThemePackage['colorScheme'];
  author?: string;
  description?: string;
  tags?: string[];
  sourceLabel: string;
  stateLabel: string | null;
  diagnostics?: string[];
}) {
  return (
    <div className="theme-package-card__details">
      <div className="theme-package-title">
        <strong>{name}</strong>
        <span className="theme-package-source">{sourceLabel}</span>
        {stateLabel && <span className="theme-package-state">{stateLabel}</span>}
      </div>
      <span>
        {version} · {formatThemeColorScheme(colorScheme)}
        {author ? ` · ${author}` : ''}
      </span>
      {diagnostics?.length ? (
        <div className="theme-package-diagnostics" aria-label={`${name} 诊断信息`}>
          {diagnostics.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {description && <p>{description}</p>}
      {tags.length ? <p>{tags.join(' · ')}</p> : null}
    </div>
  );
}

function formatThemePackageDiagnostics(theme: ReaderThemePackage): string[] {
  const css = theme.css ?? '';
  const cssBytes = new TextEncoder().encode(css).byteLength;
  const ruleCount = (css.match(/\{/g) ?? []).length;

  return [
    `CSS ${formatByteSize(cssBytes)}`,
    `${ruleCount} 条规则`,
    `指纹 ${createThemePackageFingerprint(theme)}`,
  ];
}

function formatByteSize(byteLength: number): string {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  const kilobytes = byteLength / 1024;
  const value = kilobytes >= 10 ? kilobytes.toFixed(0) : kilobytes.toFixed(1);
  return `${value.replace(/\.0$/, '')} KB`;
}

function createThemePackageFingerprint(theme: ReaderThemePackage): string {
  const sortedTokens = Object.fromEntries(Object.entries(theme.tokens).sort(([a], [b]) => a.localeCompare(b)));
  const input = JSON.stringify({
    id: theme.id,
    version: theme.version,
    colorScheme: theme.colorScheme,
    tokens: sortedTokens,
    css: theme.css,
  });
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
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

function formatBundledThemeInstalledState(
  theme: ReaderThemePackage,
  installedTheme: ReaderThemePackage | undefined,
): string | null {
  if (!installedTheme) {
    return null;
  }

  return installedTheme.version === theme.version ? '已安装' : '已安装旧版';
}
