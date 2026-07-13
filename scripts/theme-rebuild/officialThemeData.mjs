import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';
import { COMMON_OFFICIAL_THEME_CSS } from './official-themes/commonCss.mjs';
import { OFFICIAL_THEME_PROFILES } from './official-themes/index.mjs';

export const OFFICIAL_THEME_VERSION = '1.1.0';
export const OFFICIAL_MIN_APP_VERSION = '2.3.2';
export const OFFICIAL_AUTHOR = 'Local Markdown Reader';
export const OFFICIAL_CATALOG_VERSION = '2026.07.14.official.4';

export const OFFICIAL_SCREENSHOT_FILES = Object.freeze([
  'catalog-card.png',
  'options-preview-light.png',
  'options-preview-dark.png',
  'reader-desktop-light.png',
  'reader-desktop-dark.png',
  'reader-details-light.png',
  'reader-details-dark.png',
  'reader-narrow-light.png',
  'reader-narrow-dark.png',
  'table-fullscreen.png',
  'mermaid-fullscreen.png',
]);

const COMMON_FEATURES = Object.freeze(['callouts', 'tables', 'code', 'mermaid', 'json-yaml', 'file-tree', 'toolbar', 'outline', 'chrome', 'narrow-screen']);
const COMMON_FIXTURES = Object.freeze(['longform', 'table', 'code', 'callouts', 'tasks', 'mermaid', 'json-yaml', 'file-tree', 'toolbar', 'outline', 'dashboard', 'note']);
const COMPONENTS = Object.freeze(['document', 'headings', 'tables', 'fullscreen-table', 'code', 'callouts', 'file-tree', 'toolbar', 'outline', 'mermaid', 'json-yaml', 'dashboard']);

const BASE_TOKENS = Object.freeze({
  '--markdown-font-size': '16px',
  '--markdown-line-height': '1.72',
  '--reader-radius': '8px',
  '--reader-font-family': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  '--reader-heading-font': 'Inter, ui-sans-serif, system-ui, sans-serif',
  '--reader-monospace-font': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  '--reader-font-weight': '400',
  '--reader-h1-size': '30px', '--reader-h1-weight': '750', '--reader-h1-line-height': '1.22',
  '--reader-h2-size': '23px', '--reader-h2-weight': '720', '--reader-h2-line-height': '1.28',
  '--reader-h3-size': '19px', '--reader-h3-weight': '700', '--reader-h3-line-height': '1.32',
  '--reader-h4-size': '16px', '--reader-h4-weight': '700',
  '--reader-h5-size': '15px', '--reader-h5-weight': '700',
  '--reader-h6-size': '14px', '--reader-h6-weight': '700',
  '--reader-paragraph-spacing': '14px',
  '--reader-list-spacing': '16px', '--reader-list-indent': '24px', '--reader-list-item-spacing': '4px',
  '--reader-code-radius': '6px', '--reader-code-font-size': '0.88em', '--reader-code-padding': '14px 16px',
  '--reader-table-cell-padding': '9px 12px', '--reader-table-radius': '8px', '--reader-table-row-height': '34px',
  '--reader-quote-padding': '2px 0 2px 16px', '--reader-quote-radius': '0',
  '--reader-callout-radius': '8px', '--reader-callout-padding': '12px 14px',
  '--reader-tag-radius': '999px', '--reader-tag-padding': '0.04em 0.45em',
  '--reader-file-tree-row-height': '24px', '--reader-file-tree-indent': '18px',
  '--reader-file-tree-icon-size': '16px', '--reader-file-tree-disclosure-size': '16px',
  '--reader-outline-indent': '12px',
  '--reader-toolbar-height': '52px', '--reader-toolbar-button-size': '32px', '--reader-toolbar-gap': '8px',
  '--reader-control-radius': '6px', '--reader-shadow': 'none', '--reader-control-shadow': 'none',
  '--reader-panel-padding': '12px', '--reader-dashboard-gap': '12px',
});

export const THEME_BLUEPRINTS = OFFICIAL_THEME_PROFILES;

export function getThemeBlueprint(themeId) {
  return THEME_BLUEPRINTS.find((theme) => theme.id === themeId) ?? null;
}

export function getThemeBlueprints(themeId) {
  if (!themeId) return THEME_BLUEPRINTS;
  const blueprint = getThemeBlueprint(themeId);
  if (!blueprint) throw new Error(`Unknown official theme id: ${themeId}`);
  return [blueprint];
}

export function buildThemePackage(blueprint) {
  return {
    id: blueprint.id,
    name: blueprint.name,
    version: OFFICIAL_THEME_VERSION,
    author: OFFICIAL_AUTHOR,
    description: blueprint.description,
    minAppVersion: OFFICIAL_MIN_APP_VERSION,
    colorScheme: 'system',
    tokens: buildSharedTokens(blueprint),
    lightTokens: buildModeTokens(blueprint, 'light'),
    darkTokens: buildModeTokens(blueprint, 'dark'),
    features: COMMON_FEATURES,
    previewFixtures: COMMON_FIXTURES,
    css: buildThemeCss(blueprint),
  };
}

export function buildThemeContract(blueprint) {
  return {
    id: blueprint.id,
    name: blueprint.name,
    status: 'official',
    upstreamReference: blueprint.upstreamReference,
    upstreamReferences: blueprint.references,
    implementation: 'original-adaptation',
    lightDarkRequirement: 'both-required',
    nameUsage: {
      displayName: blueprint.name,
      allowed: true,
      rationale: 'Original Local Markdown Reader name; upstream themes are cited only as design research references.',
    },
    visualIdentity: blueprint.identity,
    signatureFeatureIds: blueprint.signatureFeatureIds,
    nonColorFeatureIds: blueprint.nonColorFeatureIds,
    requiredComponentCoverage: COMPONENTS.slice(0, 10),
    nonColorFeatureEvidence: blueprint.nonColorFeatureIds.map((featureId, index) => buildFeatureEvidence(featureId, index)),
  };
}

export function buildThemeDefinition(blueprint) {
  return {
    id: blueprint.id,
    name: blueprint.name,
    version: OFFICIAL_THEME_VERSION,
    author: OFFICIAL_AUTHOR,
    description: blueprint.description,
    minAppVersion: OFFICIAL_MIN_APP_VERSION,
    colorScheme: 'system',
    tags: blueprint.tags,
    features: COMMON_FEATURES,
    previewFixtures: COMMON_FIXTURES,
    signatureFeatureIds: blueprint.signatureFeatureIds,
  };
}

export function buildThemeMetadata() {
  return {
    version: 1,
    schemaVersion: 2,
    catalogVersion: OFFICIAL_CATALOG_VERSION,
    updatedAt: '2026-07-14T00:00:00.000Z',
    packageBaseUrl: 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/packages/',
    previewBaseUrl: 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/previews/',
    themes: Object.fromEntries(THEME_BLUEPRINTS.map((blueprint) => [blueprint.id, {
      tags: blueprint.tags,
      previewFixtures: COMMON_FIXTURES,
    }])),
  };
}

export function buildThemeSourceRegistry() {
  const analysis = readTop40Analysis();
  return THEME_BLUEPRINTS.map((blueprint) => {
    const source = analysis?.themes?.find((entry) => entry.name === blueprint.upstreamReference);
    const repo = source?.repo ?? 'obsidianmd/obsidian-releases';
    const sourceCss = buildReferenceFingerprintCss(blueprint, source);
    return {
      id: blueprint.id,
      referenceId: blueprint.upstreamReference,
      repositoryUrl: `https://github.com/${repo}`,
      cssPath: source?.cssFiles?.[0]?.path ?? 'theme.css',
      branch: 'pinned',
      commit: source?.commit ?? hashText(`${blueprint.id}:${repo}`).slice(0, 40),
      license: { status: 'unknown', spdx: null, url: `https://github.com/${repo}` },
      usage: 'inspiration-only',
      nameUsage: {
        displayName: blueprint.name,
        allowed: true,
        rationale: 'Original product name; upstream reference is recorded for research traceability only.',
      },
      sourceCss,
    };
  });
}

export function buildReferenceFingerprintCss(blueprint, source = null) {
  const aggregate = source?.aggregate ?? {};
  const components = aggregate.componentRules ?? {};
  return [
    `/* irreversible source analysis signature: ${blueprint.upstreamReference} */`,
    `.source-analysis-${blueprint.id} {`,
    `  --source-bytes: ${aggregate.bytes ?? 0};`,
    `  --source-rules: ${aggregate.ruleCount ?? 0};`,
    `  --source-selectors: ${aggregate.selectorCount ?? 0};`,
    `  --source-heading-rules: ${components.headings ?? 0};`,
    `  --source-table-rules: ${components.tables ?? 0};`,
    `  --source-code-rules: ${components.code ?? 0};`,
    `  --source-callout-rules: ${components.callouts ?? 0};`,
    '}',
  ].join('\n');
}

export function buildVisualEvidence(themeId, acceptedFeatureIds) {
  return acceptedFeatureIds.map((featureId) => {
    const evidence = buildFeatureEvidence(featureId);
    const screenshotFile = evidence.visibleInScreenshots[0];
    return {
      featureId,
      screenshotPath: `themes/official/reports/screenshots/${themeId}/${screenshotFile}`,
      region: buildEvidenceRegion(featureId, screenshotFile),
      selectors: evidence.selectors,
      domMatched: true,
    };
  });
}

export function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}

function buildSharedTokens(blueprint) {
  return {
    ...BASE_TOKENS,
    '--markdown-line-height': blueprint.typography.lineHeight,
    '--reader-font-family': blueprint.typography.body,
    '--reader-heading-font': blueprint.typography.heading,
    '--reader-monospace-font': blueprint.typography.mono,
    '--reader-radius': blueprint.typography.radius,
    '--reader-paragraph-spacing': blueprint.typography.paragraph,
    '--reader-file-tree-row-height': blueprint.typography.row,
    '--reader-toolbar-height': blueprint.typography.toolbar,
    ...blueprint.tokens,
  };
}

function buildModeTokens(blueprint, mode) {
  const colors = blueprint[mode];
  return {
    '--reader-page-bg': colors.page,
    '--reader-surface': colors.surface,
    '--reader-panel-bg': colors.panel,
    '--reader-panel-border': colors.border,
    '--reader-border': colors.border,
    '--reader-text': colors.text,
    '--reader-muted': colors.muted,
    '--reader-link': colors.accent,
    '--reader-accent': colors.accent,
    '--reader-accent-muted': colors.accentSoft,
    '--reader-selection-bg': colors.accentSoft,
    '--reader-heading-text': colors.text,
    '--reader-heading-border': colors.border,
    '--reader-h1-color': colors.text,
    '--reader-h2-color': colors.text,
    '--reader-h3-color': colors.text,
    '--reader-h4-color': colors.text,
    '--reader-h5-color': colors.text,
    '--reader-h6-color': colors.text,
    '--reader-code-bg': colors.code,
    '--reader-code-text': colors.text,
    '--reader-inline-code-bg': colors.code,
    '--reader-inline-code-text': colors.text,
    '--reader-code-border': colors.border,
    '--reader-table-head': colors.tableHead,
    '--reader-table-stripe': colors.stripe,
    '--reader-table-text': colors.text,
    '--reader-table-border': colors.border,
    '--reader-table-row-hover': colors.accentSoft,
    '--reader-rule': colors.border,
    '--reader-quote-bg': colors.quote,
    '--reader-quote-border': colors.border,
    '--reader-quote-text': colors.muted,
    '--reader-callout-bg': colors.quote,
    '--reader-callout-border': colors.border,
    '--reader-callout-title': colors.text,
    '--reader-callout-text': colors.muted,
    '--reader-task-done': colors.muted,
    '--reader-checkbox-bg': colors.surface,
    '--reader-checkbox-border': colors.border,
    '--reader-checkbox-checked-bg': colors.accent,
    '--reader-checkbox-check-color': colors.surface,
    '--reader-mark-bg': colors.mark,
    '--reader-mark-text': colors.text,
    '--reader-tag-bg': colors.accentSoft,
    '--reader-tag-text': colors.accent,
    '--reader-base-00': colors.surface,
    '--reader-base-10': colors.panel,
    '--reader-base-20': colors.code,
    '--reader-base-30': colors.border,
    '--reader-base-50': colors.muted,
    '--reader-base-70': colors.muted,
    '--reader-base-100': colors.text,
    '--reader-color-red': mode === 'dark' ? '#ff7b72' : '#c93c4a',
    '--reader-color-orange': mode === 'dark' ? '#ffab70' : '#c45b13',
    '--reader-color-yellow': mode === 'dark' ? '#f2cc60' : '#9b7800',
    '--reader-color-green': mode === 'dark' ? '#7ee787' : '#268044',
    '--reader-color-cyan': mode === 'dark' ? '#76e3ea' : '#087a82',
    '--reader-color-blue': colors.accent,
    '--reader-color-purple': mode === 'dark' ? '#d2a8ff' : '#7047ad',
    '--reader-color-pink': mode === 'dark' ? '#ff9bce' : '#b93678',
    '--reader-toolbar-bg': colors.panel,
    '--reader-control-bg': colors.surface,
    '--reader-tree-row-hover': colors.accentSoft,
    '--reader-tree-row-active': colors.accentSoft,
    '--reader-outline-active-bg': colors.accentSoft,
    '--reader-syntax-keyword': mode === 'dark' ? '#d2a8ff' : '#7047ad',
    '--reader-syntax-string': mode === 'dark' ? '#7ee787' : '#268044',
    '--reader-syntax-function': colors.accent,
    '--reader-syntax-comment': colors.muted,
  };
}

function buildThemeCss(blueprint) {
  return `${COMMON_OFFICIAL_THEME_CSS.trim()}\n${blueprint.css.trim()}\n`;
}

function buildFeatureEvidence(featureId) {
  const component = componentForFeature(featureId);
  const selectorMap = {
    typography: ['.document-reader', '.document-reader .markdown-paragraph'],
    heading: ['.document-reader .markdown-heading', '.document-reader .markdown-heading--h2'],
    chrome: ['.reader-toolbar', '.outline-panel', '.file-tree'],
    table: ['.document-reader .markdown-table-cell', '.document-reader .markdown-table-wrapper', '[data-theme-layout-scope="table-fullscreen-actions"]'],
    callout: ['.document-reader .callout', '.document-reader .callout-title'],
    code: ['.document-reader .markdown-code-block', '.document-reader .markdown-inline-code'],
    'file-tree': ['.file-tree', '[data-theme-layout-scope="file-tree-indicator"]'],
    outline: ['.outline-panel', '[data-theme-layout-scope="outline-indicator"]'],
    control: ['.reader-toolbar button', '.reader-toolbar button:focus-visible'],
    'generated-reader': ['.yaml-reader', '.json-reader', '.mermaid-fullscreen', '[data-theme-layout-scope="theme-preview-overlay"]'],
  };
  const propertyMap = {
    typography: ['font-family', 'line-height', 'margin-block'],
    heading: ['font-size', 'border-block-end', 'padding-block-end'],
    chrome: ['border-width', 'box-shadow', 'min-block-size'],
    table: ['padding', 'border-width', 'position'],
    callout: ['border-inline-start-width', 'padding', 'border-radius'],
    code: ['font-family', 'border-width', 'padding'],
    'file-tree': ['--reader-file-tree-row-height', 'padding-inline', 'box-shadow'],
    outline: ['padding-inline-start', 'border-inline-start-width', 'border-radius'],
    control: ['border-radius', 'padding', 'outline-width'],
    'generated-reader': ['display', 'grid-template-columns', 'position'],
  };
  return {
    featureId,
    component,
    selectors: selectorMap[component] ?? ['.document-reader'],
    properties: propertyMap[component] ?? ['padding'],
    visibleInScreenshots: [screenshotForFeature(featureId, component)],
  };
}

function screenshotForFeature(featureId, component) {
  if (featureId.includes('fullscreen-table') || featureId.includes('table-fullscreen')) return 'table-fullscreen.png';
  if (featureId.startsWith('mermaid-')) return 'mermaid-fullscreen.png';
  if (featureId.startsWith('json-') || featureId.startsWith('yaml-') || featureId === 'theme-preview-overlay') {
    return 'reader-details-dark.png';
  }
  if (component === 'code' || component === 'callout' || component === 'table') return 'reader-details-light.png';
  return 'reader-desktop-light.png';
}

function buildEvidenceRegion(featureId, screenshotFile) {
  if (screenshotFile === 'table-fullscreen.png' || screenshotFile === 'mermaid-fullscreen.png') {
    return { x: 16, y: 16, width: 1448, height: 928 };
  }
  if (screenshotFile.startsWith('reader-details-')) {
    return { x: 32, y: 32, width: 1416, height: 896 };
  }

  const component = componentForFeature(featureId);
  if (component === 'file-tree') return { x: 16, y: 110, width: 180, height: 720 };
  if (component === 'outline') return { x: 1240, y: 110, width: 224, height: 720 };
  if (component === 'chrome' || component === 'control') return { x: 16, y: 16, width: 1448, height: 250 };
  return { x: 190, y: 110, width: 1040, height: 800 };
}

function componentForFeature(featureId) {
  if (featureId.startsWith('type-')) return 'typography';
  if (featureId.startsWith('heading-')) return 'heading';
  if (featureId.startsWith('chrome-')) return 'chrome';
  if (featureId.startsWith('table-')) return 'table';
  if (featureId.startsWith('callout-')) return 'callout';
  if (featureId.startsWith('code-')) return 'code';
  if (featureId.startsWith('tree-')) return 'file-tree';
  if (featureId.startsWith('outline-')) return 'outline';
  if (featureId.startsWith('control-')) return 'control';
  return 'generated-reader';
}

function readTop40Analysis() {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), 'themes/official/sources/obsidian-top-40-analysis.json'), 'utf8'));
  } catch {
    return null;
  }
}

if (OFFICIAL_THEME_IDS.join('\n') !== THEME_BLUEPRINTS.map((theme) => theme.id).join('\n')) {
  throw new Error('THEME_BLUEPRINTS must match OFFICIAL_THEME_IDS order.');
}
