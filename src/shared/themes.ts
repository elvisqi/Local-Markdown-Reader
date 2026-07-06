import type {
  BuiltinReaderThemeId,
  InstalledReaderThemeId,
  ReaderThemePackage,
  ReadingStyle,
  RemoteThemeIndex,
  RemoteThemeIndexEntry,
  ThemeColorScheme,
} from './types';
import { APP_VERSION } from './version';

const THEMES_KEY = 'readerThemePackages';
const REMOTE_THEME_INDEX_CACHE_KEY = 'readerRemoteThemeIndex';
export const DEFAULT_REMOTE_THEME_INDEX_URL = 'https://cdn.jsdelivr.net/gh/elvisqi/Local-Markdown-Reader@2.0/themes/index.json';
const MAX_THEME_CSS_LENGTH = 64 * 1024;
const MAX_THEME_TOKEN_COUNT = 80;
const MAX_THEME_TOKEN_VALUE_LENGTH = 500;
const MAX_THEME_FIELD_LENGTH = 160;
const MAX_REMOTE_THEME_TAGS = 12;
const MAX_REMOTE_THEME_INDEX_ITEMS = 200;
const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const TOKEN_NAME_PATTERN = /^--(?:reader|markdown)-[a-z0-9-]+$/;
const SAFE_CSS_VALUE_PATTERN = /^(?!.*(?:url\s*\(|@import|expression\s*\(|javascript:|behavior\s*:))[^;{}]+$/i;
const UNSAFE_CSS_PATTERN = /@import|url\s*\(|expression\s*\(|javascript:|behavior\s*:|@font-face/i;
const SUPPORTED_CONDITIONAL_AT_RULE_PATTERN = /^@(media|supports|container)\b/i;
const BUILTIN_READER_THEME_PREFIX = 'builtin:';
const INSTALLED_READER_THEME_PREFIX = 'installed:';
const THEME_PACKAGE_FIELDS = new Set([
  'id',
  'name',
  'version',
  'author',
  'description',
  'minAppVersion',
  'colorScheme',
  'tokens',
  'css',
]);
const STORED_THEME_PACKAGE_FIELDS = new Set([...THEME_PACKAGE_FIELDS, 'installedAt']);

export type BuiltinReaderTheme = {
  id: BuiltinReaderThemeId;
  legacyStyle: ReadingStyle;
  name: string;
  cssClass: string;
  tokens: Record<string, string>;
  css: string;
};

export const BUILTIN_READER_THEMES: BuiltinReaderTheme[] = [
  {
    id: 'builtin:paper',
    legacyStyle: 'paper',
    name: '纸张',
    cssClass: 'reader-theme-paper',
    tokens: {
      '--markdown-font-size': '17px',
      '--markdown-line-height': '1.82',
      '--reader-page-bg': '#f7f7f4',
      '--reader-surface': '#fffefa',
      '--reader-border': '#ddd8cd',
      '--reader-text': '#252a2e',
      '--reader-muted': '#6f756f',
      '--reader-link': '#526f8e',
      '--reader-code-bg': '#f0eee8',
      '--reader-table-head': '#f7f4ed',
      '--reader-table-stripe': '#faf8f2',
      '--reader-rule': '#d8d2c6',
      '--reader-quote-bg': '#faf8f2',
      '--reader-quote-border': '#c5bda8',
      '--reader-quote-text': '#5f655f',
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
      '--markdown-font-size': '16px',
      '--markdown-line-height': '1.68',
      '--reader-page-bg': '#fafbfc',
      '--reader-surface': '#ffffff',
      '--reader-border': '#d8dee6',
      '--reader-text': '#242a32',
      '--reader-muted': '#667484',
      '--reader-link': '#205493',
      '--reader-code-bg': '#eef2f5',
      '--reader-table-head': '#fbfcfd',
      '--reader-table-stripe': '#f6f8fa',
      '--reader-rule': '#cfd8e3',
      '--reader-quote-border': '#cfd8e3',
      '--reader-quote-text': '#667484',
    },
    css: '',
  },
  {
    id: 'builtin:github',
    legacyStyle: 'github',
    name: 'GitHub',
    cssClass: 'reader-theme-github',
    tokens: {
      '--markdown-font-size': '16px',
      '--markdown-line-height': '1.65',
      '--reader-page-bg': '#ffffff',
      '--reader-surface': '#ffffff',
      '--reader-border': '#d0d7de',
      '--reader-text': '#1f2328',
      '--reader-muted': '#57606a',
      '--reader-link': '#0969da',
      '--reader-code-bg': '#eff1f3',
      '--reader-table-head': '#f6f8fa',
      '--reader-table-stripe': '#f6f8fa',
      '--reader-rule': '#d0d7de',
      '--reader-quote-border': '#d0d7de',
      '--reader-quote-text': '#57606a',
    },
    css: '.document-reader { border: 0; border-radius: 0; }',
  },
  {
    id: 'builtin:classic',
    legacyStyle: 'classic',
    name: '经典',
    cssClass: 'reader-theme-classic',
    tokens: {},
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
  css?: unknown;
};

type NormalizeThemePackageOptions = {
  allowInstalledAt?: boolean;
};

type RemoteThemeIndexInput = {
  version?: unknown;
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
  sha256?: unknown;
  previewUrl?: unknown;
  tags?: unknown;
  deprecated?: unknown;
  replacementThemeId?: unknown;
};

type FetchRemoteThemeIndexOptions = {
  indexUrl?: string;
  fetcher?: typeof fetch;
  area?: chrome.storage.StorageArea;
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
}: FetchRemoteThemeIndexOptions = {}): Promise<RemoteThemeIndex> {
  if (!fetcher) {
    throw new Error('当前环境不支持获取远程主题源。');
  }

  assertHttpsUrl(indexUrl, '远程主题源地址');
  const response = await fetcher(indexUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`无法获取远程主题源：HTTP ${response.status}。`);
  }

  const index = normalizeRemoteThemeIndex(await response.json(), indexUrl, Date.now());
  await saveCachedRemoteThemeIndex(index, area);
  return index;
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
  const response = await fetcher(entry.downloadUrl, { cache: 'no-store' });
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
    ...(theme.css ? { css: theme.css } : {}),
  };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

export function buildInstalledThemeStylesheet(theme: ReaderThemePackage | null): string {
  if (!theme) {
    return '';
  }

  return buildReaderThemeStylesheet({
    id: createInstalledReaderThemeId(theme.id),
    tokens: theme.tokens,
    css: theme.css,
  });
}

export function buildBuiltinThemeStylesheet(theme: BuiltinReaderTheme | null): string {
  if (!theme) {
    return '';
  }

  return buildReaderThemeStylesheet(theme);
}

export function buildReaderThemeStylesheet(theme: { id: string; tokens: Record<string, string>; css: string }): string {
  const scope = `[data-reader-theme-id="${theme.id}"][data-reader-theme-id]`;
  const tokenLines = Object.entries(theme.tokens).map(([name, value]) => `  ${name}: ${value};`);
  const tokenCss = tokenLines.length ? `${scope} {\n${tokenLines.join('\n')}\n}` : '';
  const scopedCss = theme.css.trim() ? scopeCss(theme.css, scope) : '';
  return [tokenCss, scopedCss].filter(Boolean).join('\n\n');
}

export function scopeCss(css: string, scope: string): string {
  const sanitizedCss = sanitizeThemeCss(css);

  return scopeCssFragment(sanitizedCss, scope).trim();
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
  const css = normalizeThemeCss(themeInput.css);
  if (css) {
    scopeCss(css, '[data-reader-theme-id="theme-preview"]');
  }

  if (!Object.keys(tokens).length && !css.trim()) {
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
    css,
    installedAt,
  };
}

function normalizeRemoteThemeIndex(input: unknown, sourceUrl: string, fetchedAt: number): RemoteThemeIndex {
  if (!isPlainObject(input)) {
    throw new Error('远程主题索引必须是一个 JSON 对象。');
  }

  const indexInput = input as RemoteThemeIndexInput;
  const version = normalizeRemoteIndexVersion(indexInput.version);
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
  const downloadUrl = normalizeRequiredUrl(entryInput.downloadUrl, 'downloadUrl');
  const sha256 = normalizeSha256(entryInput.sha256);
  const previewUrl = normalizeOptionalUrl(entryInput.previewUrl, 'previewUrl');
  const tags = normalizeRemoteThemeTags(entryInput.tags);
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
    sha256,
    previewUrl,
    tags,
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

    tokens[name] = normalizedValue;
  }

  return tokens;
}

function normalizeThemeCss(value: unknown): string {
  if (value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error('主题包 css 字段必须是字符串。');
  }

  return sanitizeThemeCss(value);
}

function sanitizeThemeCss(css: string): string {
  if (css.length > MAX_THEME_CSS_LENGTH) {
    throw new Error('主题 CSS 不能超过 64KB。');
  }

  if (css.trim() && !css.includes('{')) {
    throw new Error('主题 CSS 必须包含完整的 CSS 规则。');
  }

  if (UNSAFE_CSS_PATTERN.test(css)) {
    throw new Error('主题 CSS 不能包含远程资源、@import 或不安全表达式。');
  }

  return css.trim();
}

function scopeCssFragment(css: string, scope: string): string {
  let result = '';
  let position = 0;

  while (position < css.length) {
    const braceIndex = css.indexOf('{', position);
    if (braceIndex === -1) {
      result += css.slice(position);
      break;
    }

    const prelude = css.slice(position, braceIndex).trim();
    const endIndex = findMatchingBrace(css, braceIndex);
    if (endIndex === -1) {
      throw new Error('主题 CSS 存在未闭合的规则。');
    }

    const body = css.slice(braceIndex + 1, endIndex);
    if (prelude.startsWith('@')) {
      if (!SUPPORTED_CONDITIONAL_AT_RULE_PATTERN.test(prelude)) {
        throw new Error(`主题 CSS 暂不支持 ${prelude.split(/\s+/)[0]} 规则。`);
      }

      result += `${prelude} {\n${scopeCssFragment(body, scope).trim()}\n}\n`;
    } else {
      result += `${scopeSelectorList(prelude, scope)} {${body}}\n`;
    }

    position = endIndex + 1;
  }

  return result;
}

function scopeSelectorList(selectorList: string, scope: string): string {
  return splitSelectorList(selectorList)
    .map((selector) => scopeSelector(selector.trim(), scope))
    .filter(Boolean)
    .join(', ');
}

function splitSelectorList(selectorList: string): string[] {
  const selectors: string[] = [];
  let current = '';
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < selectorList.length; index += 1) {
    const char = selectorList[index];
    const previous = selectorList[index - 1];

    if (quote) {
      current += char;
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1);
    }

    if (char === ',' && depth === 0) {
      selectors.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    selectors.push(current);
  }

  return selectors;
}

function scopeSelector(selector: string, scope: string): string {
  if (!selector) {
    return selector;
  }

  if (selector.startsWith(scope)) {
    return selector;
  }

  if (selector.startsWith('.reader-app')) {
    return selector.replace(/^\.reader-app(?=[\s.#:[>+~]|$)/, scope);
  }

  if (/^(?:html|body|:root)(?=[\s.#:[>+~]|$)/.test(selector)) {
    return selector.replace(/^(?:html|body|:root)(?=[\s.#:[>+~]|$)/, scope);
  }

  return `${scope} ${selector}`;
}

function findMatchingBrace(css: string, openIndex: number): number {
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];
    const previous = css[index - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
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
