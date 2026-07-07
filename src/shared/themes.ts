import type {
  BuiltinReaderThemeId,
  InstalledReaderThemeId,
  ReaderThemePackage,
  ReaderThemeFeature,
  ReaderThemePreviewFixture,
  ReadingStyle,
  RemoteThemeIndex,
  RemoteThemeIndexEntry,
  ThemeColorScheme,
} from './types';
import {
  THEME_CSS_SANITIZER_VERSION,
  sanitizeAndScopeThemeCss,
  scopeThemeCss,
} from './themeCss.js';
import { APP_VERSION } from './version';

const THEMES_KEY = 'readerThemePackages';
const REMOTE_THEME_INDEX_CACHE_KEY = 'readerRemoteThemeIndex';
export const DEFAULT_REMOTE_THEME_INDEX_URL = 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/index.json';
export { THEME_CSS_SANITIZER_VERSION } from './themeCss.js';

const MAX_THEME_CSS_LENGTH = 128 * 1024;
const MAX_THEME_TOKEN_COUNT = 320;
const MAX_THEME_TOKEN_VALUE_LENGTH = 500;
const MAX_THEME_FIELD_LENGTH = 160;
const REMOTE_THEME_INDEX_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_REMOTE_THEME_TAGS = 12;
const MAX_REMOTE_THEME_INDEX_ITEMS = 200;
const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const TOKEN_NAME_PATTERN = /^--(?:reader|markdown)-[a-z0-9-]+$/;
const SAFE_CSS_VALUE_PATTERN = /^(?!.*(?:url\s*\(|@import|expression\s*\(|javascript:|behavior\s*:))[^;{}]+$/i;
const BUILTIN_READER_THEME_PREFIX = 'builtin:';
const INSTALLED_READER_THEME_PREFIX = 'installed:';
const SUPPORTED_THEME_FEATURES = new Set<ReaderThemeFeature>([
  'callouts',
  'tables',
  'tasks',
  'code',
  'mermaid',
  'json-yaml',
  'file-tree',
  'toolbar',
  'outline',
  'chrome',
  'narrow-screen',
]);
const SUPPORTED_THEME_PREVIEW_FIXTURES = new Set<ReaderThemePreviewFixture>([
  'longform',
  'table',
  'code',
  'callouts',
  'tasks',
  'mermaid',
  'json-yaml',
  'file-tree',
  'toolbar',
  'outline',
  'dashboard',
  'ledger',
  'note',
]);
const THEME_PACKAGE_FIELDS = new Set([
  'id',
  'name',
  'version',
  'author',
  'description',
  'minAppVersion',
  'colorScheme',
  'tokens',
  'lightTokens',
  'darkTokens',
  'features',
  'previewFixtures',
  'css',
]);
const STORED_THEME_PACKAGE_FIELDS = new Set([
  ...THEME_PACKAGE_FIELDS,
  'installedAt',
  'scopedCss',
  'sanitizerVersion',
  'sourceCssHash',
  'scopedCssHash',
]);

export type BuiltinReaderTheme = {
  id: BuiltinReaderThemeId;
  legacyStyle: ReadingStyle;
  name: string;
  cssClass: string;
  tokens: Record<string, string>;
  css: string;
};

export const DEFAULT_READER_THEME_TOKENS: Record<string, string> = {
  '--markdown-font-size': '16px',
  '--markdown-line-height': '1.72',
  '--reader-page-bg': '#f6f7f9',
  '--reader-surface': '#ffffff',
  '--reader-border': '#dfe4ea',
  '--reader-text': '#18202a',
  '--reader-muted': '#647282',
  '--reader-link': '#175ddc',
  '--reader-radius': '8px',
  '--reader-panel-bg': '#ffffff',
  '--reader-panel-border': '#dfe4ea',
  '--reader-accent': '#175ddc',
  '--reader-accent-muted': '#e8f0ff',
  '--reader-selection-bg': '#dbeafe',
  '--reader-heading-text': '#18202a',
  '--reader-heading-font': 'inherit',
  '--reader-heading-border': '#d1d9e2',
  '--reader-font-family': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  '--reader-monospace-font': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  '--reader-font-weight': '400',
  '--reader-h1-color': '#18202a',
  '--reader-h1-size': '30px',
  '--reader-h1-weight': '750',
  '--reader-h1-line-height': '1.22',
  '--reader-h2-color': '#18202a',
  '--reader-h2-size': '23px',
  '--reader-h2-weight': '720',
  '--reader-h2-line-height': '1.28',
  '--reader-h3-color': '#18202a',
  '--reader-h3-size': '19px',
  '--reader-h3-weight': '700',
  '--reader-h3-line-height': '1.32',
  '--reader-h4-color': '#18202a',
  '--reader-h4-size': '16px',
  '--reader-h4-weight': '700',
  '--reader-h5-color': '#18202a',
  '--reader-h5-size': '16px',
  '--reader-h5-weight': '700',
  '--reader-h6-color': '#18202a',
  '--reader-h6-size': '16px',
  '--reader-h6-weight': '700',
  '--reader-paragraph-spacing': '14px',
  '--reader-list-spacing': '16px',
  '--reader-list-indent': '24px',
  '--reader-list-item-spacing': '4px',
  '--reader-code-bg': '#eef2f5',
  '--reader-code-text': '#243141',
  '--reader-inline-code-bg': '#eef2f5',
  '--reader-inline-code-text': '#243141',
  '--reader-code-radius': '6px',
  '--reader-code-border': '#dfe4ea',
  '--reader-code-font-size': '0.88em',
  '--reader-table-head': '#f8fafc',
  '--reader-table-stripe': '#f6f8fa',
  '--reader-table-text': '#18202a',
  '--reader-table-border': '#dfe4ea',
  '--reader-table-cell-padding': '9px 12px',
  '--reader-table-row-hover': '#eef4ff',
  '--reader-rule': '#d1d9e2',
  '--reader-quote-bg': 'transparent',
  '--reader-quote-border': '#cfd8e3',
  '--reader-quote-text': '#52606d',
  '--reader-quote-padding': '2px 0 2px 16px',
  '--reader-quote-radius': '0',
  '--reader-callout-bg': '#f6f9fc',
  '--reader-callout-border': '#cfd8e3',
  '--reader-callout-title': '#18202a',
  '--reader-callout-text': '#52606d',
  '--reader-callout-radius': '8px',
  '--reader-task-done': '#7b8794',
  '--reader-checkbox-bg': '#ffffff',
  '--reader-checkbox-border': '#aab6c4',
  '--reader-checkbox-checked-bg': '#175ddc',
  '--reader-checkbox-check-color': '#ffffff',
  '--reader-mark-bg': '#fff4b8',
  '--reader-mark-text': '#28251f',
  '--reader-tag-bg': '#e8f0ff',
  '--reader-tag-text': '#175ddc',
  '--reader-tag-radius': '999px',
  '--reader-tag-padding': '0.04em 0.45em',
  '--reader-base-00': '#ffffff',
  '--reader-base-10': '#f8fafc',
  '--reader-base-20': '#eef2f5',
  '--reader-base-30': '#dfe4ea',
  '--reader-base-50': '#94a3b8',
  '--reader-base-70': '#475569',
  '--reader-base-100': '#18202a',
  '--reader-color-red': '#dc2626',
  '--reader-color-orange': '#ea580c',
  '--reader-color-yellow': '#ca8a04',
  '--reader-color-green': '#16a34a',
  '--reader-color-cyan': '#0891b2',
  '--reader-color-blue': '#175ddc',
  '--reader-color-purple': '#7c3aed',
  '--reader-color-pink': '#db2777',
  '--reader-toolbar-bg': '#ffffff',
  '--reader-control-bg': '#ffffff',
  '--reader-control-radius': '6px',
  '--reader-tree-row-hover': '#f0f4f8',
  '--reader-tree-row-active': '#e8f0ff',
  '--reader-file-tree-row-height': '24px',
  '--reader-file-tree-indent': '18px',
  '--reader-file-tree-icon-size': '16px',
  '--reader-file-tree-disclosure-size': '16px',
  '--reader-outline-active-bg': '#e8f0ff',
  '--reader-outline-indent': '12px',
  '--reader-toolbar-height': '52px',
  '--reader-toolbar-button-size': '32px',
  '--reader-toolbar-gap': '8px',
  '--reader-syntax-keyword': '#7c3aed',
  '--reader-syntax-string': '#15803d',
  '--reader-syntax-function': '#175ddc',
  '--reader-syntax-comment': '#647282',
  '--reader-shadow': 'none',
};

export const BUILTIN_READER_THEMES: BuiltinReaderTheme[] = [
  {
    id: 'builtin:paper',
    legacyStyle: 'paper',
    name: '纸张',
    cssClass: 'reader-theme-paper',
    tokens: {
      ...DEFAULT_READER_THEME_TOKENS,
      '--markdown-font-size': '17px',
      '--markdown-line-height': '1.82',
      '--reader-page-bg': '#f7f7f4',
      '--reader-surface': '#fffefa',
      '--reader-border': '#ddd8cd',
      '--reader-text': '#252a2e',
      '--reader-muted': '#6f756f',
      '--reader-link': '#526f8e',
      '--reader-radius': '10px',
      '--reader-panel-bg': '#fffefa',
      '--reader-panel-border': '#ddd8cd',
      '--reader-accent': '#526f8e',
      '--reader-accent-muted': '#edf3f6',
      '--reader-selection-bg': '#dbe7f1',
      '--reader-heading-text': '#252a2e',
      '--reader-heading-font': 'Georgia, "Times New Roman", serif',
      '--reader-heading-border': '#d8d2c6',
      '--reader-code-bg': '#f0eee8',
      '--reader-code-text': '#2d3033',
      '--reader-inline-code-bg': '#f0eee8',
      '--reader-inline-code-text': '#2d3033',
      '--reader-table-head': '#f7f4ed',
      '--reader-table-stripe': '#faf8f2',
      '--reader-rule': '#d8d2c6',
      '--reader-quote-bg': '#faf8f2',
      '--reader-quote-border': '#c5bda8',
      '--reader-quote-text': '#5f655f',
      '--reader-task-done': '#8a867c',
      '--reader-mark-bg': '#fff2a8',
      '--reader-mark-text': '#28251f',
      '--reader-tag-bg': '#edf3f6',
      '--reader-tag-text': '#526f8e',
      '--reader-shadow': '0 10px 32px rgba(80, 76, 68, 0.08)',
    },
    css: '.document-reader h1, .document-reader h2, .document-reader h3 { font-family: Georgia, "Times New Roman", serif; }',
  },
  {
    id: 'builtin:clean',
    legacyStyle: 'clean',
    name: '清爽文档',
    cssClass: 'reader-theme-clean',
    tokens: {
      ...DEFAULT_READER_THEME_TOKENS,
      '--markdown-font-size': '16px',
      '--markdown-line-height': '1.68',
      '--reader-page-bg': '#fafbfc',
      '--reader-surface': '#ffffff',
      '--reader-border': '#d8dee6',
      '--reader-text': '#242a32',
      '--reader-muted': '#667484',
      '--reader-link': '#205493',
      '--reader-radius': '8px',
      '--reader-panel-bg': '#ffffff',
      '--reader-panel-border': '#d8dee6',
      '--reader-accent': '#205493',
      '--reader-accent-muted': '#e8f0fb',
      '--reader-selection-bg': '#dbeafe',
      '--reader-heading-text': '#242a32',
      '--reader-heading-font': 'inherit',
      '--reader-heading-border': '#cfd8e3',
      '--reader-code-bg': '#eef2f5',
      '--reader-code-text': '#24303c',
      '--reader-inline-code-bg': '#eef2f5',
      '--reader-inline-code-text': '#24303c',
      '--reader-table-head': '#fbfcfd',
      '--reader-table-stripe': '#f6f8fa',
      '--reader-rule': '#cfd8e3',
      '--reader-quote-bg': 'transparent',
      '--reader-quote-border': '#cfd8e3',
      '--reader-quote-text': '#667484',
      '--reader-task-done': '#7b8794',
      '--reader-mark-bg': '#fff4b8',
      '--reader-mark-text': '#242a32',
      '--reader-tag-bg': '#e8f0fb',
      '--reader-tag-text': '#205493',
      '--reader-shadow': 'none',
    },
    css: '',
  },
  {
    id: 'builtin:github',
    legacyStyle: 'github',
    name: 'GitHub',
    cssClass: 'reader-theme-github',
    tokens: {
      ...DEFAULT_READER_THEME_TOKENS,
      '--markdown-font-size': '16px',
      '--markdown-line-height': '1.65',
      '--reader-page-bg': '#ffffff',
      '--reader-surface': '#ffffff',
      '--reader-border': '#d0d7de',
      '--reader-text': '#1f2328',
      '--reader-muted': '#57606a',
      '--reader-link': '#0969da',
      '--reader-radius': '0',
      '--reader-panel-bg': '#ffffff',
      '--reader-panel-border': '#d0d7de',
      '--reader-accent': '#0969da',
      '--reader-accent-muted': '#ddf4ff',
      '--reader-selection-bg': '#ddf4ff',
      '--reader-heading-text': '#1f2328',
      '--reader-heading-font': 'inherit',
      '--reader-heading-border': '#d8dee4',
      '--reader-code-bg': '#eff1f3',
      '--reader-code-text': '#24292f',
      '--reader-inline-code-bg': '#eff1f3',
      '--reader-inline-code-text': '#24292f',
      '--reader-table-head': '#f6f8fa',
      '--reader-table-stripe': '#f6f8fa',
      '--reader-rule': '#d0d7de',
      '--reader-quote-bg': 'transparent',
      '--reader-quote-border': '#d0d7de',
      '--reader-quote-text': '#57606a',
      '--reader-task-done': '#6e7781',
      '--reader-mark-bg': '#fff8c5',
      '--reader-mark-text': '#1f2328',
      '--reader-tag-bg': '#ddf4ff',
      '--reader-tag-text': '#0969da',
      '--reader-shadow': 'none',
    },
    css: '.document-reader { border: 0; border-radius: 0; }',
  },
  {
    id: 'builtin:classic',
    legacyStyle: 'classic',
    name: '经典',
    cssClass: 'reader-theme-classic',
    tokens: {
      ...DEFAULT_READER_THEME_TOKENS,
      '--markdown-font-size': '16px',
      '--markdown-line-height': '1.72',
      '--reader-page-bg': '#f6f7f9',
      '--reader-surface': '#ffffff',
      '--reader-border': '#dfe4ea',
      '--reader-text': '#18202a',
      '--reader-muted': '#647282',
      '--reader-link': '#175ddc',
      '--reader-radius': '8px',
      '--reader-panel-bg': '#ffffff',
      '--reader-panel-border': '#dfe4ea',
      '--reader-accent': '#175ddc',
      '--reader-accent-muted': '#e8f0ff',
      '--reader-selection-bg': '#dbeafe',
      '--reader-heading-text': '#18202a',
      '--reader-heading-font': 'inherit',
      '--reader-heading-border': 'transparent',
      '--reader-code-bg': '#eef2f5',
      '--reader-code-text': '#243141',
      '--reader-inline-code-bg': '#eef2f5',
      '--reader-inline-code-text': '#243141',
      '--reader-table-head': '#f8fafc',
      '--reader-table-stripe': '#f6f8fa',
      '--reader-rule': '#d1d9e2',
      '--reader-quote-bg': 'transparent',
      '--reader-quote-border': '#cfd8e3',
      '--reader-quote-text': '#52606d',
      '--reader-task-done': '#7b8794',
      '--reader-mark-bg': '#fff4b8',
      '--reader-mark-text': '#28251f',
      '--reader-tag-bg': '#e8f0ff',
      '--reader-tag-text': '#175ddc',
      '--reader-shadow': 'none',
    },
    css: '.document-reader { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; } .document-reader h1, .document-reader h2, .document-reader h3, .document-reader h4, .document-reader h5, .document-reader h6 { border-bottom: 0; } .document-reader h1 a, .document-reader h2 a, .document-reader h3 a, .document-reader h4 a, .document-reader h5 a, .document-reader h6 a { color: var(--reader-link); text-decoration: underline; }',
  },
];

export const DEFAULT_READER_THEME_ID: BuiltinReaderThemeId = 'builtin:paper';

type ThemePackageInput = {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  author?: unknown;
  description?: unknown;
  minAppVersion?: unknown;
  colorScheme?: unknown;
  tokens?: unknown;
  lightTokens?: unknown;
  darkTokens?: unknown;
  features?: unknown;
  previewFixtures?: unknown;
  css?: unknown;
  scopedCss?: unknown;
  sanitizerVersion?: unknown;
  sourceCssHash?: unknown;
  scopedCssHash?: unknown;
};

type NormalizeThemePackageOptions = {
  allowInstalledAt?: boolean;
};

type RemoteThemeIndexInput = {
  version?: unknown;
  schemaVersion?: unknown;
  catalogVersion?: unknown;
  updatedAt?: unknown;
  themes?: unknown;
};

type RemoteThemeIndexEntryInput = {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  author?: unknown;
  description?: unknown;
  minAppVersion?: unknown;
  colorScheme?: unknown;
  downloadUrl?: unknown;
  packageUrl?: unknown;
  sha256?: unknown;
  previewUrl?: unknown;
  tags?: unknown;
  features?: unknown;
  previewFixtures?: unknown;
  deprecated?: unknown;
  replacementThemeId?: unknown;
};

type FetchRemoteThemeIndexOptions = {
  indexUrl?: string;
  fetcher?: typeof fetch;
  area?: chrome.storage.StorageArea;
  refresh?: boolean;
  cacheTtlMs?: number;
};

type LoadRemoteThemeOptions = {
  entry: RemoteThemeIndexEntry;
  fetcher?: typeof fetch;
};

type InstallRemoteThemeOptions = {
  entry: RemoteThemeIndexEntry;
  fetcher?: typeof fetch;
  area?: chrome.storage.StorageArea;
};

export async function loadInstalledThemes(
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<ReaderThemePackage[]> {
  if (!area?.get) {
    return [];
  }

  const stored = await area.get(THEMES_KEY);
  return parseStoredThemePackages(stored[THEMES_KEY]);
}

export async function loadCachedRemoteThemeIndex(
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<RemoteThemeIndex | null> {
  if (!area?.get) {
    return null;
  }

  const stored = await area.get(REMOTE_THEME_INDEX_CACHE_KEY);
  return parseCachedRemoteThemeIndex(stored[REMOTE_THEME_INDEX_CACHE_KEY]);
}

export async function saveCachedRemoteThemeIndex(
  index: RemoteThemeIndex,
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<void> {
  if (!area?.set) {
    return;
  }

  await area.set({ [REMOTE_THEME_INDEX_CACHE_KEY]: index });
}

export async function fetchRemoteThemeIndex({
  indexUrl = DEFAULT_REMOTE_THEME_INDEX_URL,
  fetcher = globalThis.fetch,
  area = globalThis.chrome?.storage?.local,
  refresh = false,
  cacheTtlMs = REMOTE_THEME_INDEX_CACHE_TTL_MS,
}: FetchRemoteThemeIndexOptions = {}): Promise<RemoteThemeIndex> {
  if (!fetcher) {
    throw new Error('当前环境不支持获取远程主题源。');
  }

  assertHttpsUrl(indexUrl, '远程主题源地址');
  const fetchedAt = Date.now();
  if (!refresh) {
    const cached = await loadCachedRemoteThemeIndex(area);
    if (cached?.sourceUrl === indexUrl && fetchedAt - cached.fetchedAt < cacheTtlMs) {
      return cached;
    }
  }

  const requestUrl = buildRemoteThemeIndexRequestUrl(indexUrl, fetchedAt, refresh);
  const response = await fetcher(requestUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`无法获取远程主题源：HTTP ${response.status}。`);
  }

  const index = normalizeRemoteThemeIndex(await response.json(), indexUrl, fetchedAt);
  await saveCachedRemoteThemeIndex(index, area);
  return index;
}

function buildRemoteThemeIndexRequestUrl(indexUrl: string, timestamp: number, refresh: boolean): string {
  const url = new URL(indexUrl);
  url.searchParams.set(refresh ? 'refresh' : 't', String(timestamp));
  return url.toString();
}

function buildRemoteThemePackageRequestUrl(downloadUrl: string, sha256: string): string {
  const url = new URL(downloadUrl);
  url.searchParams.set('sha256', sha256.toLowerCase());
  return url.toString();
}

export function createBuiltinReaderThemeId(style: ReadingStyle): BuiltinReaderThemeId {
  return `${BUILTIN_READER_THEME_PREFIX}${style}` as BuiltinReaderThemeId;
}

export function createInstalledReaderThemeId(themeId: string): InstalledReaderThemeId {
  return `${INSTALLED_READER_THEME_PREFIX}${themeId}` as InstalledReaderThemeId;
}

export function getBuiltinReaderTheme(themeId: string): BuiltinReaderTheme | null {
  return BUILTIN_READER_THEMES.find((theme) => theme.id === themeId) ?? null;
}

export function getInstalledThemePackageId(themeId: string): string | null {
  return themeId.startsWith(INSTALLED_READER_THEME_PREFIX)
    ? themeId.slice(INSTALLED_READER_THEME_PREFIX.length)
    : null;
}

export async function saveInstalledThemes(
  themes: ReaderThemePackage[],
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<void> {
  if (!area?.set) {
    return;
  }

  await area.set({ [THEMES_KEY]: themes });
}

export async function installThemePackageFromText(
  text: string,
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<{ theme: ReaderThemePackage; themes: ReaderThemePackage[] }> {
  const theme = parseThemePackageText(text);

  return installThemePackage(theme, area);
}

export async function installThemePackage(
  theme: ReaderThemePackage,
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<{ theme: ReaderThemePackage; themes: ReaderThemePackage[] }> {
  assertThemeCompatible(theme);
  const installed = await loadInstalledThemes(area);
  const themes = [
    theme,
    ...installed.filter((item) => item.id !== theme.id),
  ].sort(compareThemes);

  await saveInstalledThemes(themes, area);

  return { theme, themes };
}

export async function installRemoteTheme({
  entry,
  fetcher = globalThis.fetch,
  area = globalThis.chrome?.storage?.local,
}: InstallRemoteThemeOptions): Promise<{ theme: ReaderThemePackage; themes: ReaderThemePackage[] }> {
  const theme = await loadRemoteTheme({ entry, fetcher });

  return installThemePackage(theme, area);
}

export async function loadRemoteTheme({
  entry,
  fetcher = globalThis.fetch,
}: LoadRemoteThemeOptions): Promise<ReaderThemePackage> {
  if (!entry.compatible) {
    throw new Error(`主题 ${entry.name} 与当前应用版本不兼容。`);
  }

  if (!fetcher) {
    throw new Error('当前环境不支持下载远程主题。');
  }

  assertHttpsUrl(entry.downloadUrl, '远程主题下载地址');
  const requestUrl = buildRemoteThemePackageRequestUrl(entry.downloadUrl, entry.sha256);
  const response = await fetcher(requestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`无法下载远程主题：HTTP ${response.status}。`);
  }

  const text = await response.text();
  const actualHash = await calculateSha256(text);
  if (actualHash !== entry.sha256.toLowerCase()) {
    throw new Error('远程主题校验失败，文件可能已损坏或被篡改。');
  }

  const theme = parseThemePackageText(text);
  if (theme.id !== entry.id || theme.version !== entry.version) {
    throw new Error('远程主题包与索引声明不一致。');
  }
  assertThemeCompatible(theme);

  return theme;
}

export async function deleteInstalledTheme(
  themeId: string,
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.local,
): Promise<ReaderThemePackage[]> {
  const themes = (await loadInstalledThemes(area)).filter((theme) => theme.id !== themeId);
  await saveInstalledThemes(themes, area);

  return themes;
}

export function subscribeInstalledThemes(
  onChange: (themes: ReaderThemePackage[]) => void,
  storage: typeof chrome.storage | undefined = globalThis.chrome?.storage,
): () => void {
  if (!storage?.onChanged?.addListener || !storage.onChanged.removeListener) {
    return () => {};
  }

  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local' || !changes[THEMES_KEY]) {
      return;
    }

    onChange(parseStoredThemePackages(changes[THEMES_KEY].newValue));
  };

  storage.onChanged.addListener(listener);

  return () => storage.onChanged.removeListener(listener);
}

export function parseThemePackageText(text: string, installedAt = Date.now()): ReaderThemePackage {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('主题包不是有效的 JSON 文件。');
  }

  return normalizeThemePackage(parsed, installedAt);
}

export function assertThemeCompatible(theme: Pick<ReaderThemePackage, 'name' | 'minAppVersion'>, appVersion = APP_VERSION) {
  if (!theme.minAppVersion) {
    return;
  }

  if (compareSemver(theme.minAppVersion, appVersion) > 0) {
    throw new Error(`主题 ${theme.name} 需要应用版本 ${theme.minAppVersion} 或更高版本。当前版本是 ${appVersion}。`);
  }
}

export function serializeThemePackage(theme: ReaderThemePackage): string {
  const packageJson = {
    id: theme.id,
    name: theme.name,
    version: theme.version,
    ...(theme.author ? { author: theme.author } : {}),
    ...(theme.description ? { description: theme.description } : {}),
    ...(theme.minAppVersion ? { minAppVersion: theme.minAppVersion } : {}),
    colorScheme: theme.colorScheme,
    tokens: theme.tokens,
    ...(theme.lightTokens && Object.keys(theme.lightTokens).length ? { lightTokens: theme.lightTokens } : {}),
    ...(theme.darkTokens && Object.keys(theme.darkTokens).length ? { darkTokens: theme.darkTokens } : {}),
    ...(theme.features?.length ? { features: theme.features } : {}),
    ...(theme.previewFixtures?.length ? { previewFixtures: theme.previewFixtures } : {}),
    ...(theme.css ? { css: theme.css } : {}),
  };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

export function buildInstalledThemeStylesheet(theme: ReaderThemePackage | null): string {
  if (!theme) {
    return '';
  }

  const scope = `[data-reader-theme-id="${createInstalledReaderThemeId(theme.id)}"][data-reader-theme-id]`;
  const tokenCss = buildReaderThemeTokenStylesheet(scope, theme.tokens, theme.lightTokens, theme.darkTokens);
  const scopedCss = theme.scopedCss?.trim() || (theme.css.trim() ? scopeCss(theme.css, scope) : '');
  return [tokenCss, scopedCss].filter(Boolean).join('\n\n');
}

export function buildBuiltinThemeStylesheet(theme: BuiltinReaderTheme | null): string {
  if (!theme) {
    return '';
  }

  return buildReaderThemeStylesheet(theme);
}

export function buildReaderThemeStylesheet(theme: { id: string; tokens: Record<string, string>; css: string }): string {
  const scope = `[data-reader-theme-id="${theme.id}"][data-reader-theme-id]`;
  const tokenCss = buildReaderThemeTokenStylesheet(scope, theme.tokens);
  const scopedCss = theme.css.trim() ? scopeCss(theme.css, scope) : '';
  return [tokenCss, scopedCss].filter(Boolean).join('\n\n');
}

export function scopeCss(css: string, scope: string): string {
  return scopeThemeCss(css, scope);
}

function buildReaderThemeTokenStylesheet(
  scope: string,
  tokens: Record<string, string>,
  lightTokens: Record<string, string> = {},
  darkTokens: Record<string, string> = {},
): string {
  const blocks: string[] = [];
  const sharedBlock = buildTokenBlock(scope, tokens);
  if (sharedBlock) {
    blocks.push(sharedBlock);
  }

  if (Object.keys(lightTokens).length) {
    blocks.push(buildTokenBlock(`.theme-light${scope}`, lightTokens));
    blocks.push(buildTokenBlock(`.theme-system${scope}`, lightTokens));
  }

  if (Object.keys(darkTokens).length) {
    blocks.push(buildTokenBlock(`.theme-dark${scope}`, darkTokens));
    blocks.push(`@media (prefers-color-scheme: dark) {\n${buildTokenBlock(`.theme-system${scope}`, darkTokens)}\n}`);
  }

  return blocks.filter(Boolean).join('\n\n');
}

function buildTokenBlock(selector: string, tokens: Record<string, string>): string {
  const tokenLines = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`);
  return tokenLines.length ? `${selector} {\n${tokenLines.join('\n')}\n}` : '';
}

function normalizeThemePackage(
  input: unknown,
  installedAt: number,
  options: NormalizeThemePackageOptions = {},
): ReaderThemePackage {
  if (!isPlainObject(input)) {
    throw new Error('主题包必须是一个 JSON 对象。');
  }

  assertSupportedThemePackageFields(input, options.allowInstalledAt ? STORED_THEME_PACKAGE_FIELDS : THEME_PACKAGE_FIELDS);

  const themeInput = input as ThemePackageInput;
  const id = normalizeRequiredString(themeInput.id, 'id').toLowerCase();
  if (!THEME_ID_PATTERN.test(id)) {
    throw new Error('主题 id 只能包含字母、数字、点、下划线和短横线，长度为 2 到 64 个字符。');
  }

  const name = normalizeRequiredString(themeInput.name, 'name');
  const version = normalizeRequiredString(themeInput.version, 'version');
  const colorScheme = normalizeColorScheme(themeInput.colorScheme);
  const tokens = normalizeThemeTokens(themeInput.tokens);
  const lightTokens = normalizeThemeTokens(themeInput.lightTokens);
  const darkTokens = normalizeThemeTokens(themeInput.darkTokens);
  const features = normalizeThemeFeatures(themeInput.features);
  const previewFixtures = normalizeThemePreviewFixtures(themeInput.previewFixtures);
  const css = normalizeThemeCss(themeInput.css);
  const cssState = buildThemeCssState(id, css, themeInput, options.allowInstalledAt === true);

  if (
    !Object.keys(tokens).length &&
    !Object.keys(lightTokens).length &&
    !Object.keys(darkTokens).length &&
    !css.trim()
  ) {
    throw new Error('主题包至少需要提供 tokens 或 css。');
  }

  return {
    id,
    name,
    version,
    author: normalizeOptionalString(themeInput.author, 'author'),
    description: normalizeOptionalString(themeInput.description, 'description'),
    minAppVersion: normalizeOptionalString(themeInput.minAppVersion, 'minAppVersion'),
    colorScheme,
    tokens,
    ...(Object.keys(lightTokens).length ? { lightTokens } : {}),
    ...(Object.keys(darkTokens).length ? { darkTokens } : {}),
    features,
    previewFixtures,
    css,
    scopedCss: cssState.scopedCss,
    sanitizerVersion: cssState.sanitizerVersion,
    sourceCssHash: cssState.sourceCssHash,
    scopedCssHash: cssState.scopedCssHash,
    installedAt,
  };
}

function buildThemeCssState(
  id: string,
  css: string,
  input: ThemePackageInput,
  allowStoredCssMetadata: boolean,
): Pick<ReaderThemePackage, 'scopedCss' | 'sanitizerVersion' | 'sourceCssHash' | 'scopedCssHash'> {
  if (allowStoredCssMetadata) {
    const stored = normalizeStoredCssState(input);
    if (stored && stored.sanitizerVersion === THEME_CSS_SANITIZER_VERSION) {
      return stored;
    }
  }

  const result = sanitizeAndScopeThemeCss(
    css,
    `[data-reader-theme-id="${createInstalledReaderThemeId(id)}"][data-reader-theme-id]`,
    { themeId: id },
  );

  return {
    scopedCss: result.scopedCss,
    sanitizerVersion: result.sanitizerVersion,
    sourceCssHash: result.sourceCssHash,
    scopedCssHash: result.scopedCssHash,
  };
}

function normalizeStoredCssState(
  input: ThemePackageInput,
): Pick<ReaderThemePackage, 'scopedCss' | 'sanitizerVersion' | 'sourceCssHash' | 'scopedCssHash'> | null {
  if (
    typeof input.scopedCss !== 'string' ||
    typeof input.sanitizerVersion !== 'string' ||
    typeof input.sourceCssHash !== 'string' ||
    typeof input.scopedCssHash !== 'string'
  ) {
    return null;
  }

  if (
    input.scopedCss.length > MAX_THEME_CSS_LENGTH * 2 ||
    !SHA256_PATTERN.test(input.sourceCssHash) ||
    !SHA256_PATTERN.test(input.scopedCssHash)
  ) {
    return null;
  }

  return {
    scopedCss: input.scopedCss.trim(),
    sanitizerVersion: input.sanitizerVersion,
    sourceCssHash: input.sourceCssHash.toLowerCase(),
    scopedCssHash: input.scopedCssHash.toLowerCase(),
  };
}

function normalizeRemoteThemeIndex(input: unknown, sourceUrl: string, fetchedAt: number): RemoteThemeIndex {
  if (!isPlainObject(input)) {
    throw new Error('远程主题索引必须是一个 JSON 对象。');
  }

  const indexInput = input as RemoteThemeIndexInput;
  const version = normalizeRemoteIndexVersion(indexInput.version);
  const schemaVersion = normalizeOptionalPositiveInteger(indexInput.schemaVersion, 'schemaVersion');
  const catalogVersion = normalizeOptionalString(indexInput.catalogVersion, 'catalogVersion');
  const updatedAt = normalizeOptionalString(indexInput.updatedAt, 'updatedAt');
  if (!Array.isArray(indexInput.themes)) {
    throw new Error('远程主题索引 themes 字段必须是数组。');
  }

  if (indexInput.themes.length > MAX_REMOTE_THEME_INDEX_ITEMS) {
    throw new Error(`远程主题索引不能超过 ${MAX_REMOTE_THEME_INDEX_ITEMS} 个主题。`);
  }

  const themes = indexInput.themes
    .map((item) => normalizeRemoteThemeIndexEntry(item))
    .sort(compareRemoteThemeEntries);

  return {
    sourceUrl,
    fetchedAt,
    version,
    ...(schemaVersion ? { schemaVersion } : {}),
    ...(catalogVersion ? { catalogVersion } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    themes,
  };
}

function normalizeRemoteThemeIndexEntry(input: unknown): RemoteThemeIndexEntry {
  if (!isPlainObject(input)) {
    throw new Error('远程主题条目必须是一个 JSON 对象。');
  }

  const entryInput = input as RemoteThemeIndexEntryInput;
  const id = normalizeRequiredString(entryInput.id, 'id').toLowerCase();
  if (!THEME_ID_PATTERN.test(id)) {
    throw new Error('远程主题 id 只能包含字母、数字、点、下划线和短横线，长度为 2 到 64 个字符。');
  }

  const name = normalizeRequiredString(entryInput.name, 'name');
  const version = normalizeRequiredString(entryInput.version, 'version');
  const colorScheme = normalizeColorScheme(entryInput.colorScheme);
  const minAppVersion = normalizeOptionalString(entryInput.minAppVersion, 'minAppVersion');
  const downloadUrl = normalizeRequiredUrl(entryInput.downloadUrl ?? entryInput.packageUrl, 'downloadUrl');
  const packageUrl = normalizeOptionalUrl(entryInput.packageUrl, 'packageUrl');
  const sha256 = normalizeSha256(entryInput.sha256);
  const previewUrl = normalizeOptionalUrl(entryInput.previewUrl, 'previewUrl');
  const tags = normalizeRemoteThemeTags(entryInput.tags);
  const features = normalizeThemeFeatures(entryInput.features);
  const previewFixtures = normalizeThemePreviewFixtures(entryInput.previewFixtures);
  const deprecated = entryInput.deprecated === true;
  const replacementThemeId = normalizeOptionalString(entryInput.replacementThemeId, 'replacementThemeId');
  if (replacementThemeId && !THEME_ID_PATTERN.test(replacementThemeId)) {
    throw new Error('远程主题 replacementThemeId 格式无效。');
  }

  return {
    id,
    name,
    version,
    author: normalizeOptionalString(entryInput.author, 'author'),
    description: normalizeOptionalString(entryInput.description, 'description'),
    minAppVersion,
    colorScheme,
    downloadUrl,
    ...(packageUrl ? { packageUrl } : {}),
    sha256,
    previewUrl,
    tags,
    features,
    previewFixtures,
    deprecated,
    replacementThemeId,
    compatible: isThemeCompatible({ name, minAppVersion }),
  };
}

function parseCachedRemoteThemeIndex(value: unknown): RemoteThemeIndex | null {
  try {
    if (!isPlainObject(value)) {
      return null;
    }

    const sourceUrl = normalizeRequiredUrl(value.sourceUrl, 'sourceUrl');
    const fetchedAt = typeof value.fetchedAt === 'number' ? value.fetchedAt : 0;
    return normalizeRemoteThemeIndex(value, sourceUrl, fetchedAt);
  } catch {
    return null;
  }
}

function assertSupportedThemePackageFields(input: Record<string, unknown>, supportedFields: Set<string>): void {
  const unsupportedFields = Object.keys(input)
    .filter((field) => !supportedFields.has(field))
    .sort();

  if (!unsupportedFields.length) {
    return;
  }

  throw new Error(`主题包包含不支持的字段：${unsupportedFields.join('、')}。`);
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`主题包缺少 ${fieldName} 字段。`);
  }

  const normalized = value.trim();
  if (normalized.length > MAX_THEME_FIELD_LENGTH) {
    throw new Error(`主题包 ${fieldName} 字段过长。`);
  }

  return normalized;
}

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`主题包 ${fieldName} 字段必须是字符串。`);
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > MAX_THEME_FIELD_LENGTH) {
    throw new Error(`主题包 ${fieldName} 字段过长。`);
  }

  return normalized;
}

function normalizeRemoteIndexVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error('远程主题索引 version 字段必须是正整数。');
  }

  return value;
}

function normalizeOptionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`远程主题索引 ${fieldName} 字段必须是正整数。`);
  }

  return value;
}

function normalizeRequiredUrl(value: unknown, fieldName: string): string {
  const url = normalizeRequiredString(value, fieldName);
  assertHttpsUrl(url, `远程主题 ${fieldName}`);
  return url;
}

function normalizeOptionalUrl(value: unknown, fieldName: string): string | undefined {
  const url = normalizeOptionalString(value, fieldName);
  if (!url) {
    return undefined;
  }

  assertHttpsUrl(url, `远程主题 ${fieldName}`);
  return url;
}

function normalizeSha256(value: unknown): string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value.trim())) {
    throw new Error('远程主题 sha256 必须是 64 位十六进制字符串。');
  }

  return value.trim().toLowerCase();
}

function normalizeRemoteThemeTags(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('远程主题 tags 字段必须是数组。');
  }

  if (value.length > MAX_REMOTE_THEME_TAGS) {
    throw new Error(`远程主题 tags 不能超过 ${MAX_REMOTE_THEME_TAGS} 个。`);
  }

  return value.map((tag) => {
    if (typeof tag !== 'string' || !tag.trim()) {
      throw new Error('远程主题 tags 只能包含非空字符串。');
    }

    const normalized = tag.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/i.test(normalized)) {
      throw new Error(`远程主题 tag 格式无效：${tag}。`);
    }

    return normalized;
  });
}

function normalizeThemeFeatures(value: unknown): ReaderThemeFeature[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('主题 features 字段必须是数组。');
  }

  if (value.length > 12) {
    throw new Error('主题 features 不能超过 12 个。');
  }

  const features = new Set<ReaderThemeFeature>();
  for (const feature of value) {
    if (typeof feature !== 'string' || !SUPPORTED_THEME_FEATURES.has(feature as ReaderThemeFeature)) {
      throw new Error(`不支持的主题 feature：${String(feature)}。`);
    }
    features.add(feature as ReaderThemeFeature);
  }

  return [...features];
}

function normalizeThemePreviewFixtures(value: unknown): ReaderThemePreviewFixture[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('主题 previewFixtures 字段必须是数组。');
  }

  if (value.length > 12) {
    throw new Error('主题 previewFixtures 不能超过 12 个。');
  }

  const fixtures = new Set<ReaderThemePreviewFixture>();
  for (const fixture of value) {
    if (typeof fixture !== 'string' || !SUPPORTED_THEME_PREVIEW_FIXTURES.has(fixture as ReaderThemePreviewFixture)) {
      throw new Error(`不支持的主题 previewFixture：${String(fixture)}。`);
    }
    fixtures.add(fixture as ReaderThemePreviewFixture);
  }

  return [...fixtures];
}

function normalizeColorScheme(value: unknown): ThemeColorScheme {
  if (value === undefined) {
    return 'system';
  }

  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  throw new Error('主题包 colorScheme 必须是 system、light 或 dark。');
}

function normalizeThemeTokens(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new Error('主题 tokens 必须是一个对象。');
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_THEME_TOKEN_COUNT) {
    throw new Error(`主题 tokens 不能超过 ${MAX_THEME_TOKEN_COUNT} 个。`);
  }

  const tokens: Record<string, string> = {};
  for (const [name, tokenValue] of entries) {
    if (!TOKEN_NAME_PATTERN.test(name)) {
      throw new Error(`不支持的主题变量：${name}。`);
    }

    if (typeof tokenValue !== 'string') {
      throw new Error(`主题变量 ${name} 的值必须是字符串。`);
    }

    const normalizedValue = tokenValue.trim();
    if (
      !normalizedValue ||
      normalizedValue.length > MAX_THEME_TOKEN_VALUE_LENGTH ||
      !SAFE_CSS_VALUE_PATTERN.test(normalizedValue)
    ) {
      throw new Error(`主题变量 ${name} 的值不安全或过长。`);
    }

    if (name === '--reader-file-tree-row-height') {
      assertFileTreeRowHeightTokenValue(normalizedValue);
    }

    tokens[name] = normalizedValue;
  }

  return tokens;
}

function assertFileTreeRowHeightTokenValue(value: string): void {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/);
  const numericValue = match ? Number.parseFloat(match[1]) : NaN;
  if (!match || !Number.isFinite(numericValue) || numericValue < 22 || numericValue > 40) {
    throw new Error('--reader-file-tree-row-height 必须是 22px 到 40px 之间的 px 数值。');
  }
}

function normalizeThemeCss(value: unknown): string {
  if (value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error('主题包 css 字段必须是字符串。');
  }

  if (value.length > MAX_THEME_CSS_LENGTH) {
    throw new Error('主题 CSS 不能超过 128KB。');
  }

  return value.trim();
}

function parseStoredThemePackages(value: unknown): ReaderThemePackage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      try {
        return normalizeStoredThemePackage(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is ReaderThemePackage => Boolean(item))
    .sort(compareThemes);
}

function normalizeStoredThemePackage(input: unknown): ReaderThemePackage {
  const theme = normalizeThemePackage(input, Date.now(), { allowInstalledAt: true });

  return {
    ...theme,
    installedAt: isPlainObject(input) && typeof input.installedAt === 'number' ? input.installedAt : theme.installedAt,
  };
}

function compareThemes(a: ReaderThemePackage, b: ReaderThemePackage): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id);
}

function compareRemoteThemeEntries(a: RemoteThemeIndexEntry, b: RemoteThemeIndexEntry): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id);
}

function isThemeCompatible(theme: Pick<ReaderThemePackage, 'name' | 'minAppVersion'>, appVersion = APP_VERSION): boolean {
  if (!theme.minAppVersion) {
    return true;
  }

  return compareSemver(theme.minAppVersion, appVersion) <= 0;
}

function compareSemver(a: string, b: string): number {
  const left = parseSemver(a);
  const right = parseSemver(b);

  for (let index = 0; index < 3; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function parseSemver(version: string): [number, number, number] {
  const match = version.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return [0, 0, 0];
  }

  return [
    Number.parseInt(match[1] ?? '0', 10),
    Number.parseInt(match[2] ?? '0', 10),
    Number.parseInt(match[3] ?? '0', 10),
  ];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function assertHttpsUrl(value: string, label: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} 格式无效。`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${label} 必须使用 https。`);
  }
}

async function calculateSha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前环境不支持远程主题校验。');
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
