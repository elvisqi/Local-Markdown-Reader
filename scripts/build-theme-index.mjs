import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeAndScopeThemeCss } from '../src/shared/themeCss.js';

const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';
const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/i;
const COLOR_SCHEMES = new Set(['light', 'dark', 'system']);
const SUPPORTED_THEME_FEATURES = new Set([
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
const SUPPORTED_THEME_PREVIEW_FIXTURES = new Set([
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
const TOKEN_NAME_PATTERN = /^--(?:reader|markdown)-[a-z0-9-]+$/;
const SAFE_CSS_VALUE_PATTERN = /^(?!.*(?:url\s*\(|@import|expression\s*\(|javascript:|behavior\s*:))[^;{}]+$/i;
const MAX_THEME_FIELD_LENGTH = 160;
const MAX_THEME_TOKEN_COUNT = 320;
const MAX_THEME_TOKEN_VALUE_LENGTH = 500;
const MAX_THEME_CSS_LENGTH = 128 * 1024;
const MAX_REMOTE_THEME_TAGS = 12;

export async function buildThemeIndex({ rootDir = process.cwd() } = {}) {
  const themesDir = resolve(rootDir, 'themes');
  const packagesDir = resolve(themesDir, 'packages');
  const metadata = await readThemeMetadata(resolve(themesDir, 'metadata.json'));
  const packageNames = (await readdir(packagesDir))
    .filter((name) => name.endsWith(THEME_PACKAGE_SUFFIX))
    .sort((a, b) => a.localeCompare(b));
  const entries = [];
  const seenIds = new Set();

  for (const packageName of packageNames) {
    const packagePath = resolve(packagesDir, packageName);
    const text = await readFile(packagePath, 'utf8');
    const theme = normalizeThemePackage(parseJson(text, packagePath), packageName);
    const expectedPackageName = `${theme.id}${THEME_PACKAGE_SUFFIX}`;

    if (packageName !== expectedPackageName) {
      throw new Error(`Theme package filename ${packageName} must match theme id ${theme.id}.`);
    }

    if (seenIds.has(theme.id)) {
      throw new Error(`Duplicate theme id: ${theme.id}.`);
    }
    seenIds.add(theme.id);

    const remoteMetadata = normalizeRemoteMetadata(theme.id, metadata.themes[theme.id]);
    const downloadUrl = normalizeVersionedUrl(normalizeDownloadUrl(metadata.packageBaseUrl, packageName), theme.version);
    entries.push(removeUndefined({
      id: theme.id,
      name: theme.name,
      version: theme.version,
      author: theme.author,
      description: theme.description,
      minAppVersion: theme.minAppVersion,
      colorScheme: theme.colorScheme,
      downloadUrl,
      packageUrl: downloadUrl,
      sha256: createHash('sha256').update(text).digest('hex'),
      previewUrl: remoteMetadata.previewUrl ?? normalizePreviewUrl(metadata.previewBaseUrl, theme.id, theme.version),
      tags: remoteMetadata.tags,
      features: theme.features,
      previewFixtures: remoteMetadata.previewFixtures.length ? remoteMetadata.previewFixtures : theme.previewFixtures,
      deprecated: remoteMetadata.deprecated,
      replacementThemeId: remoteMetadata.replacementThemeId,
    }));
  }

  for (const themeId of Object.keys(metadata.themes).sort()) {
    if (!seenIds.has(themeId)) {
      throw new Error(`Metadata references missing theme package: ${themeId}.`);
    }
  }

  return {
    version: metadata.version,
    schemaVersion: metadata.schemaVersion,
    catalogVersion: metadata.catalogVersion,
    updatedAt: metadata.updatedAt,
    themes: entries.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function formatThemeIndex(index) {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export async function writeThemeIndexFile({ rootDir = process.cwd() } = {}) {
  const index = await buildThemeIndex({ rootDir });
  await writeFile(resolve(rootDir, 'themes', 'index.json'), formatThemeIndex(index));
  return index;
}

export async function verifyThemeIndexFile({ rootDir = process.cwd() } = {}) {
  const expected = formatThemeIndex(await buildThemeIndex({ rootDir }));
  const indexPath = resolve(rootDir, 'themes', 'index.json');
  const actual = await readFile(indexPath, 'utf8');

  if (actual !== expected) {
    throw new Error('themes/index.json is out of date. Run npm run themes:index.');
  }
}

export async function main(argv = process.argv.slice(2), rootDir = process.cwd()) {
  const options = parseArgs(argv, rootDir);

  if (options.check) {
    await verifyThemeIndexFile({ rootDir: options.rootDir });
    console.log('theme index verified');
    return;
  }

  const index = await writeThemeIndexFile({ rootDir: options.rootDir });
  console.log(`theme index generated: ${index.themes.length} themes`);
}

function parseArgs(argv, rootDir) {
  const options = {
    check: false,
    rootDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--root') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--root requires a directory path.');
      }
      options.rootDir = resolve(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}.`);
    }
  }

  return options;
}

async function readThemeMetadata(metadataPath) {
  const metadata = parseJson(await readFile(metadataPath, 'utf8'), metadataPath);
  if (!isPlainObject(metadata)) {
    throw new Error('themes/metadata.json must be a JSON object.');
  }

  const version = normalizePositiveInteger(metadata.version, 'metadata version');
  const schemaVersion = metadata.schemaVersion === undefined ? undefined : normalizePositiveInteger(metadata.schemaVersion, 'metadata schemaVersion');
  const catalogVersion = normalizeOptionalString(metadata.catalogVersion, 'metadata catalogVersion');
  const updatedAt = normalizeRequiredString(metadata.updatedAt, 'metadata updatedAt');
  const packageBaseUrl = normalizeHttpsUrl(metadata.packageBaseUrl, 'metadata packageBaseUrl');
  const previewBaseUrl = metadata.previewBaseUrl === undefined
    ? undefined
    : normalizeHttpsUrl(metadata.previewBaseUrl, 'metadata previewBaseUrl');
  const themes = normalizeMetadataThemes(metadata.themes);

  return {
    version,
    schemaVersion,
    catalogVersion,
    updatedAt,
    packageBaseUrl,
    previewBaseUrl,
    themes,
  };
}

function normalizeMetadataThemes(input) {
  if (input === undefined) {
    return {};
  }

  if (!isPlainObject(input)) {
    throw new Error('metadata themes must be a JSON object.');
  }

  const themes = {};
  for (const [themeId, metadata] of Object.entries(input)) {
    if (!THEME_ID_PATTERN.test(themeId)) {
      throw new Error(`metadata theme id is invalid: ${themeId}.`);
    }
    themes[themeId] = normalizeRemoteMetadata(themeId, metadata);
  }

  return themes;
}

function normalizeRemoteMetadata(themeId, input) {
  if (input === undefined) {
    return {
      tags: [],
      previewFixtures: [],
    };
  }

  if (!isPlainObject(input)) {
    throw new Error(`metadata for ${themeId} must be a JSON object.`);
  }

  const previewUrl = input.previewUrl === undefined
    ? undefined
    : normalizeHttpsUrl(input.previewUrl, `${themeId} previewUrl`);
  const deprecated = input.deprecated === undefined ? undefined : normalizeBoolean(input.deprecated, `${themeId} deprecated`);
  const replacementThemeId = input.replacementThemeId === undefined
    ? undefined
    : normalizeThemeId(input.replacementThemeId, `${themeId} replacementThemeId`);

  return {
    tags: normalizeTags(input.tags, themeId),
    previewUrl,
    previewFixtures: normalizePreviewFixtures(input.previewFixtures, `${themeId} previewFixtures`),
    deprecated,
    replacementThemeId,
  };
}

function normalizeThemePackage(input, packageName) {
  if (!isPlainObject(input)) {
    throw new Error(`${packageName} must be a JSON object.`);
  }

  const unsupportedFields = Object.keys(input).filter((field) => !THEME_PACKAGE_FIELDS.has(field)).sort();
  if (unsupportedFields.length) {
    throw new Error(`${packageName} contains unsupported fields: ${unsupportedFields.join(', ')}.`);
  }

  const id = normalizeThemeId(input.id, `${packageName} id`).toLowerCase();
  const name = normalizeRequiredString(input.name, `${packageName} name`);
  const version = normalizeRequiredString(input.version, `${packageName} version`);
  const author = normalizeOptionalString(input.author, `${packageName} author`);
  const description = normalizeOptionalString(input.description, `${packageName} description`);
  const minAppVersion = normalizeOptionalString(input.minAppVersion, `${packageName} minAppVersion`);
  const colorScheme = input.colorScheme === undefined ? 'system' : normalizeColorScheme(input.colorScheme, packageName);
  const tokens = normalizeTokens(input.tokens, packageName);
  const lightTokens = normalizeTokens(input.lightTokens, `${packageName} lightTokens`);
  const darkTokens = normalizeTokens(input.darkTokens, `${packageName} darkTokens`);
  const features = normalizeFeatures(input.features, `${packageName} features`);
  const previewFixtures = normalizePreviewFixtures(input.previewFixtures, `${packageName} previewFixtures`);
  const css = normalizeCss(input.css, packageName, id);

  if (!Object.keys(tokens).length && !Object.keys(lightTokens).length && !Object.keys(darkTokens).length && !css) {
    throw new Error(`${packageName} must define tokens or css.`);
  }

  return {
    id,
    name,
    version,
    author,
    description,
    minAppVersion,
    colorScheme,
    features,
    previewFixtures,
  };
}

function normalizeDownloadUrl(packageBaseUrl, packageName) {
  const base = packageBaseUrl.endsWith('/') ? packageBaseUrl : `${packageBaseUrl}/`;
  return normalizeHttpsUrl(new URL(packageName, base).href, `${packageName} downloadUrl`);
}

function normalizePreviewUrl(previewBaseUrl, themeId, version) {
  if (!previewBaseUrl) {
    return undefined;
  }

  const base = previewBaseUrl.endsWith('/') ? previewBaseUrl : `${previewBaseUrl}/`;
  return normalizeVersionedUrl(normalizeHttpsUrl(new URL(`${themeId}.svg`, base).href, `${themeId} previewUrl`), version);
}

function normalizeVersionedUrl(value, version) {
  const url = new URL(value);
  url.searchParams.set('v', version);
  return normalizeHttpsUrl(url.href, `${value} versionedUrl`);
}

function normalizeRequiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  const normalized = value.trim();
  if (normalized.length > MAX_THEME_FIELD_LENGTH) {
    throw new Error(`${label} is too long.`);
  }

  return normalized;
}

function normalizeOptionalString(value, label) {
  if (value === undefined) {
    return undefined;
  }

  return normalizeRequiredString(value, label);
}

function normalizeThemeId(value, label) {
  const id = normalizeRequiredString(value, label);
  if (!THEME_ID_PATTERN.test(id)) {
    throw new Error(`${label} must match ${THEME_ID_PATTERN}.`);
  }

  return id;
}

function normalizeColorScheme(value, packageName) {
  if (!COLOR_SCHEMES.has(value)) {
    throw new Error(`${packageName} colorScheme must be system, light, or dark.`);
  }

  return value;
}

function normalizeTokens(value, packageName) {
  if (value === undefined) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new Error(`${packageName} tokens must be a JSON object.`);
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_THEME_TOKEN_COUNT) {
    throw new Error(`${packageName} tokens cannot exceed ${MAX_THEME_TOKEN_COUNT} entries.`);
  }

  const tokens = {};
  for (const [name, tokenValue] of entries) {
    if (!TOKEN_NAME_PATTERN.test(name)) {
      throw new Error(`${packageName} has unsupported token: ${name}.`);
    }

    if (typeof tokenValue !== 'string') {
      throw new Error(`${packageName} token ${name} must be a string.`);
    }

    const normalizedValue = tokenValue.trim();
    if (
      !normalizedValue ||
      normalizedValue.length > MAX_THEME_TOKEN_VALUE_LENGTH ||
      !SAFE_CSS_VALUE_PATTERN.test(normalizedValue)
    ) {
      throw new Error(`${packageName} token ${name} is unsafe or too long.`);
    }

    if (name === '--reader-file-tree-row-height') {
      assertFileTreeRowHeightTokenValue(normalizedValue, packageName);
    }

    tokens[name] = normalizedValue;
  }

  return tokens;
}

function assertFileTreeRowHeightTokenValue(value, packageName) {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/);
  const numericValue = match ? Number.parseFloat(match[1]) : NaN;
  if (!match || !Number.isFinite(numericValue) || numericValue < 22 || numericValue > 40) {
    throw new Error(`${packageName} --reader-file-tree-row-height must be a px value from 22px to 40px.`);
  }
}

function normalizeCss(value, packageName, themeId) {
  if (value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error(`${packageName} css must be a string.`);
  }

  if (value.length > MAX_THEME_CSS_LENGTH) {
    throw new Error(`${packageName} css cannot exceed 128KB.`);
  }

  const css = value.trim();
  if (css) {
    sanitizeAndScopeThemeCss(css, `[data-reader-theme-id="installed:${themeId}"][data-reader-theme-id]`, { themeId });
  }

  return css;
}

function normalizeFeatures(value, label) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  if (value.length > 12) {
    throw new Error(`${label} cannot exceed 12 entries.`);
  }

  const features = new Set();
  for (const feature of value) {
    if (typeof feature !== 'string' || !SUPPORTED_THEME_FEATURES.has(feature)) {
      throw new Error(`${label} contains unsupported feature: ${String(feature)}.`);
    }
    features.add(feature);
  }

  return [...features];
}

function normalizePreviewFixtures(value, label) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  if (value.length > 12) {
    throw new Error(`${label} cannot exceed 12 entries.`);
  }

  const fixtures = new Set();
  for (const fixture of value) {
    if (typeof fixture !== 'string' || !SUPPORTED_THEME_PREVIEW_FIXTURES.has(fixture)) {
      throw new Error(`${label} contains unsupported preview fixture: ${String(fixture)}.`);
    }
    fixtures.add(fixture);
  }

  return [...fixtures];
}

function normalizePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function normalizeHttpsUrl(value, label) {
  const url = normalizeRequiredString(value, label);
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use https.`);
  }

  return parsed.href;
}

function normalizeBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
}

function normalizeTags(value, themeId) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${themeId} tags must be an array.`);
  }

  if (value.length > MAX_REMOTE_THEME_TAGS) {
    throw new Error(`${themeId} tags cannot exceed ${MAX_REMOTE_THEME_TAGS} entries.`);
  }

  return value.map((tag) => {
    if (typeof tag !== 'string' || !tag.trim()) {
      throw new Error(`${themeId} tags must be non-empty strings.`);
    }

    const normalized = tag.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/i.test(normalized)) {
      throw new Error(`${themeId} tag is invalid: ${tag}.`);
    }

    return normalized;
  });
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function removeUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
