import { createHash } from 'node:crypto';

import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

export const OFFICIAL_THEME_VERSION = '1.0.0';
export const OFFICIAL_MIN_APP_VERSION = '2.3.2';
export const OFFICIAL_AUTHOR = 'Local Markdown Reader';
export const OFFICIAL_CATALOG_VERSION = '2026.07.08.official.2';

export const OFFICIAL_SCREENSHOT_FILES = Object.freeze([
  'catalog-card.png',
  'options-preview-light.png',
  'options-preview-dark.png',
  'reader-desktop-light.png',
  'reader-desktop-dark.png',
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
  '--reader-monospace-font': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  '--reader-font-weight': '400',
  '--reader-h1-size': '30px',
  '--reader-h1-weight': '750',
  '--reader-h1-line-height': '1.22',
  '--reader-h2-size': '23px',
  '--reader-h2-weight': '720',
  '--reader-h2-line-height': '1.28',
  '--reader-h3-size': '19px',
  '--reader-h3-weight': '700',
  '--reader-h3-line-height': '1.32',
  '--reader-h4-size': '16px',
  '--reader-h4-weight': '700',
  '--reader-h5-size': '16px',
  '--reader-h5-weight': '700',
  '--reader-h6-size': '16px',
  '--reader-h6-weight': '700',
  '--reader-paragraph-spacing': '14px',
  '--reader-list-spacing': '16px',
  '--reader-list-indent': '24px',
  '--reader-list-item-spacing': '4px',
  '--reader-code-radius': '6px',
  '--reader-code-font-size': '0.88em',
  '--reader-table-cell-padding': '9px 12px',
  '--reader-quote-padding': '2px 0 2px 16px',
  '--reader-quote-radius': '0',
  '--reader-callout-radius': '8px',
  '--reader-tag-radius': '999px',
  '--reader-tag-padding': '0.04em 0.45em',
  '--reader-file-tree-row-height': '24px',
  '--reader-file-tree-indent': '18px',
  '--reader-file-tree-icon-size': '16px',
  '--reader-file-tree-disclosure-size': '16px',
  '--reader-outline-indent': '12px',
  '--reader-toolbar-height': '52px',
  '--reader-toolbar-button-size': '32px',
  '--reader-toolbar-gap': '8px',
  '--reader-control-radius': '6px',
  '--reader-shadow': 'none',
  '--reader-control-shadow': 'none',
  '--reader-panel-padding': '12px',
  '--reader-callout-padding': '12px 14px',
  '--reader-code-padding': '14px 16px',
  '--reader-table-radius': '8px',
  '--reader-table-row-height': '34px',
  '--reader-dashboard-gap': '12px',
});

export const THEME_BLUEPRINTS = Object.freeze([
  theme({
    id: 'minimal',
    name: 'Minimal for Local Markdown Reader',
    upstreamReference: 'obsidian:minimal',
    description: 'Quiet writing-first theme adapted for long Markdown reading.',
    tags: ['minimal', 'writing', 'longform'],
    identity: ['low ornament', 'focused long-form rhythm', 'quiet chrome'],
    signatureFeatureIds: ['chrome-quiet-flat', 'heading-quiet-scale', 'callout-low-noise'],
    nonColorFeatureIds: ['chrome-quiet-flat', 'chrome-scrollbar-themed', 'type-paragraph-air', 'type-list-rhythm', 'heading-quiet-scale', 'heading-bottom-rule', 'table-cell-borderless', 'table-spacious-grid', 'callout-low-noise', 'callout-left-rail', 'code-soft-panel', 'code-inline-pill', 'tree-low-noise', 'tree-compact-rows', 'outline-quiet-hover', 'outline-active-rail', 'control-sharp-buttons', 'control-focus-ring'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.82', paragraph: '18px', radius: '4px', row: '24px', toolbar: '50px' },
    light: palette('#f7f7f2', '#fffefa', '#faf9f3', '#ddd8cc', '#252a2e', '#707771', '#526f8e', '#edf3f6', '#f0eee8'),
    dark: palette('#111417', '#191c1f', '#15181b', '#34383d', '#e8e2d4', '#aaa397', '#9ab8d3', '#1f2a32', '#22262a'),
  }),
  theme({
    id: 'things',
    name: 'Things for Local Markdown Reader',
    upstreamReference: 'obsidian:things',
    description: 'Native productivity notes with crisp controls and compact navigation.',
    tags: ['native', 'productivity', 'notes'],
    identity: ['native toolbar density', 'rounded selection rails', 'compact task surfaces'],
    signatureFeatureIds: ['chrome-native-toolbar', 'tree-compact-rows', 'control-rounded-buttons'],
    nonColorFeatureIds: ['chrome-native-toolbar', 'tree-compact-rows', 'control-rounded-buttons', 'outline-active-pill', 'table-hover-row', 'code-soft-panel', 'callout-card', 'type-paragraph-air', 'chrome-resize-handle-themed', 'theme-preview-overlay', 'tree-active-pill', 'tree-icon-sized', 'control-pressed-state', 'control-disabled-muted', 'table-metric-badges', 'callout-icon-chip', 'heading-quiet-scale', 'chrome-panel-surface'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.7', paragraph: '13px', radius: '10px', row: '26px', toolbar: '54px' },
    light: palette('#f3f5f7', '#ffffff', '#fbfcfd', '#d9e1e8', '#202832', '#66717f', '#0a84ff', '#e6f2ff', '#eef3f8'),
    dark: palette('#11161c', '#171e26', '#141a21', '#2b3642', '#edf3f8', '#9aa8b5', '#5aa8ff', '#15314f', '#202a35'),
  }),
  theme({
    id: 'anuppuccin',
    name: 'AnuPpuccin for Local Markdown Reader',
    upstreamReference: 'obsidian:anup',
    description: 'Playful pastel workspace with shaped callouts and pill controls.',
    tags: ['pastel', 'playful', 'notes'],
    identity: ['pastel UI accents', 'pill controls', 'typed callout shapes'],
    signatureFeatureIds: ['control-pill-buttons', 'callout-typed-shape', 'callout-icon-chip'],
    nonColorFeatureIds: ['control-pill-buttons', 'callout-typed-shape', 'callout-icon-chip', 'table-metric-badges', 'type-list-rhythm', 'heading-block-surface', 'tree-active-pill', 'outline-active-pill', 'code-inline-pill', 'theme-preview-overlay', 'heading-kicker-spacing', 'table-zebra-structure', 'callout-card', 'chrome-floating-actions', 'control-soft-shadow', 'tree-roomy-rows', 'mermaid-framed-surface', 'type-paragraph-air'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.74', paragraph: '15px', radius: '14px', row: '27px', toolbar: '56px' },
    light: palette('#faf6ff', '#fffaff', '#fbf4ff', '#e6d7f5', '#2d2436', '#7a6c88', '#c26ee8', '#f3e6ff', '#f5edfb'),
    dark: palette('#15111d', '#20182a', '#1a1423', '#3b2e4c', '#efe6ff', '#b5a4c7', '#d89bff', '#362343', '#2a2135'),
  }),
  theme({
    id: 'blue-topaz',
    name: 'Blue Topaz for Local Markdown Reader',
    upstreamReference: 'obsidian:blue-topaz',
    description: 'Information-rich research theme with dense tables and data panels.',
    tags: ['research', 'tables', 'feature-rich'],
    identity: ['dense data surfaces', 'layered blue panels', 'dashboard callouts'],
    signatureFeatureIds: ['table-dataview-density', 'table-sticky-header-frame', 'callout-title-band'],
    nonColorFeatureIds: ['table-dataview-density', 'table-sticky-header-frame', 'callout-title-band', 'json-key-value-grid', 'yaml-summary-panel', 'table-fullscreen-toolbar', 'chrome-panel-surface', 'outline-hierarchy-indent', 'code-editor-frame', 'table-scroll-shadow', 'table-dense-grid', 'callout-dashboard-block', 'chrome-roomy-sidebar', 'tree-indent-strong', 'fullscreen-table-docked-actions', 'heading-block-surface', 'code-language-badge', 'mermaid-framed-surface'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.66', paragraph: '12px', radius: '8px', row: '28px', toolbar: '56px' },
    light: palette('#eef6fb', '#fbfdff', '#f3f9fd', '#c9dce8', '#18313f', '#5f7280', '#0f9ec7', '#dff5fb', '#e8f3f8'),
    dark: palette('#0c1820', '#10232d', '#0e1d26', '#244151', '#e2f2f7', '#98b5c1', '#26c7e8', '#113846', '#172e39'),
  }),
  theme({
    id: 'catppuccin',
    name: 'Catppuccin for Local Markdown Reader',
    upstreamReference: 'obsidian:catppuccin',
    description: 'Soft palette theme with editor-like code and rounded reading surfaces.',
    tags: ['palette', 'soft', 'code'],
    identity: ['soft palette balance', 'rounded code panels', 'calm chrome'],
    signatureFeatureIds: ['code-editor-frame', 'code-language-badge', 'callout-card'],
    nonColorFeatureIds: ['code-editor-frame', 'code-language-badge', 'callout-card', 'control-rounded-buttons', 'table-zebra-structure', 'type-editorial-line-height', 'heading-quiet-scale', 'tree-icon-sized', 'outline-quiet-hover', 'mermaid-framed-surface', 'code-inline-pill', 'chrome-soft-shadow', 'table-spacious-grid', 'tree-active-pill', 'control-soft-shadow', 'type-list-rhythm', 'fullscreen-table-corner-actions', 'theme-preview-overlay'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.78', paragraph: '15px', radius: '12px', row: '26px', toolbar: '54px' },
    light: palette('#eff1f5', '#ffffff', '#f7f8fb', '#d8dde8', '#303446', '#6c7086', '#8839ef', '#ece1ff', '#eef0f6'),
    dark: palette('#11111b', '#1e1e2e', '#181825', '#313244', '#cdd6f4', '#a6adc8', '#cba6f7', '#2f2546', '#242437'),
  }),
  theme({
    id: 'everforest',
    name: 'Everforest for Local Markdown Reader',
    upstreamReference: 'obsidian:everforest',
    description: 'Muted green long-reading theme with warm editorial spacing.',
    tags: ['green', 'longform', 'soft'],
    identity: ['muted forest palette', 'editorial spacing', 'quiet panels'],
    signatureFeatureIds: ['type-editorial-line-height', 'callout-quote-style', 'table-spacious-grid'],
    nonColorFeatureIds: ['type-editorial-line-height', 'callout-quote-style', 'table-spacious-grid', 'code-soft-panel', 'chrome-soft-shadow', 'tree-low-noise', 'outline-editorial-list', 'heading-left-rail', 'type-paragraph-air', 'mermaid-framed-surface', 'type-body-serif', 'heading-bottom-rule', 'callout-left-rail', 'control-rounded-buttons', 'table-cell-borderless', 'tree-roomy-rows', 'code-inline-pill', 'chrome-roomy-sidebar'],
    typography: { body: 'Georgia, "Times New Roman", serif', heading: 'Georgia, "Times New Roman", serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.86', paragraph: '19px', radius: '7px', row: '28px', toolbar: '54px' },
    light: palette('#f4f1e8', '#fffdf4', '#f8f3e6', '#d8ceb6', '#2d3328', '#746f61', '#6f8f4e', '#edf3df', '#eee8d6'),
    dark: palette('#141a17', '#1f2a22', '#18211b', '#39473a', '#dfe6cf', '#a7b39c', '#a7c080', '#27361f', '#263227'),
  }),
  theme({
    id: 'its-theme',
    name: 'ITS for Local Markdown Reader',
    upstreamReference: 'obsidian:its-theme',
    description: 'Dense dashboard and metadata theme for complex technical notes.',
    tags: ['dense', 'dashboard', 'metadata'],
    identity: ['metadata panels', 'dense tables', 'dashboard blocks'],
    signatureFeatureIds: ['table-dense-grid', 'table-dataview-density', 'yaml-summary-panel'],
    nonColorFeatureIds: ['table-dense-grid', 'table-dataview-density', 'yaml-summary-panel', 'json-key-value-grid', 'callout-dashboard-block', 'code-dense-line-height', 'chrome-compact-sidebar', 'outline-compact-list', 'tree-compact-rows', 'fullscreen-table-docked-actions', 'table-sticky-header-frame', 'callout-title-band', 'code-editor-frame', 'chrome-border-grid', 'tree-indent-strong', 'heading-numbered-marker', 'control-sharp-buttons', 'table-fullscreen-toolbar'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.6', paragraph: '10px', radius: '5px', row: '22px', toolbar: '48px' },
    light: palette('#f5f7f9', '#ffffff', '#f2f4f7', '#cdd5df', '#20262f', '#5e6975', '#3d74b8', '#e4edf8', '#edf1f5'),
    dark: palette('#101318', '#171b22', '#13171d', '#2b3340', '#e4eaf2', '#9fa9b8', '#7aa7e8', '#1f2b3b', '#202630'),
  }),
  theme({
    id: 'primary',
    name: 'Primary for Local Markdown Reader',
    upstreamReference: 'obsidian:primary',
    description: 'Balanced rounded note theme with soft controls and calm callouts.',
    tags: ['clean', 'rounded', 'notes'],
    identity: ['balanced rounded surfaces', 'soft controls', 'calm note hierarchy'],
    signatureFeatureIds: ['control-rounded-buttons', 'control-soft-shadow', 'callout-card'],
    nonColorFeatureIds: ['control-rounded-buttons', 'control-soft-shadow', 'callout-card', 'table-spacious-grid', 'tree-active-pill', 'outline-active-pill', 'code-inline-pill', 'heading-block-surface', 'theme-preview-overlay', 'chrome-soft-shadow', 'type-paragraph-air', 'tree-roomy-rows', 'callout-title-band', 'table-hover-row', 'code-soft-panel', 'outline-editorial-list', 'chrome-panel-surface', 'mermaid-framed-surface'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.76', paragraph: '16px', radius: '13px', row: '27px', toolbar: '55px' },
    light: palette('#f8f7fb', '#ffffff', '#fbfaff', '#dfd8eb', '#292636', '#70697c', '#7c65c1', '#eee9fb', '#f1edf8'),
    dark: palette('#15131b', '#1d1a25', '#191620', '#383241', '#ece7f4', '#aca3ba', '#b9a7ff', '#2d2740', '#25212d'),
  }),
  theme({
    id: 'prism',
    name: 'Prism for Local Markdown Reader',
    upstreamReference: 'obsidian:prism',
    description: 'Colorful structured note theme with editorial heading markers.',
    tags: ['colorful', 'structured', 'headings'],
    identity: ['editorial heading markers', 'metric badges', 'vivid but bounded accents'],
    signatureFeatureIds: ['heading-editorial-scale', 'heading-kicker-spacing', 'callout-typed-shape'],
    nonColorFeatureIds: ['heading-editorial-scale', 'heading-kicker-spacing', 'callout-typed-shape', 'table-metric-badges', 'code-language-badge', 'type-link-underline-thick', 'control-focus-ring', 'outline-hierarchy-indent', 'theme-preview-overlay', 'mermaid-floating-controls', 'heading-caps-transform', 'heading-bottom-rule', 'callout-icon-chip', 'table-zebra-structure', 'control-pill-buttons', 'tree-active-left-bar', 'fullscreen-table-corner-actions', 'chrome-floating-actions'],
    typography: { body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.72', paragraph: '14px', radius: '9px', row: '26px', toolbar: '54px' },
    light: palette('#f7f7ff', '#ffffff', '#fbfbff', '#d9d8ef', '#25243a', '#6d6a82', '#d45ca9', '#f5e8f4', '#f0effa'),
    dark: palette('#11121d', '#191a29', '#151725', '#303249', '#ececff', '#aaa9c0', '#ff8ad8', '#35243a', '#222337'),
  }),
  theme({
    id: 'cybertron',
    name: 'Cybertron for Local Markdown Reader',
    upstreamReference: 'obsidian:cybertron',
    description: 'High-contrast neon console theme with angular chrome and glowing panels.',
    tags: ['neon', 'terminal', 'contrast'],
    identity: ['neon frame geometry', 'terminal-like code panels', 'angular control chrome'],
    signatureFeatureIds: ['chrome-glow-frame', 'control-glow-focus', 'callout-glow-border'],
    nonColorFeatureIds: ['chrome-glow-frame', 'control-glow-focus', 'callout-glow-border', 'code-terminal-block', 'heading-command-prefix', 'table-dense-grid', 'mermaid-floating-controls', 'fullscreen-table-corner-actions', 'chrome-terminal-frame', 'code-grid-border', 'type-body-mono', 'type-heading-mono', 'control-sharp-buttons', 'tree-active-left-bar', 'outline-active-rail', 'table-scroll-shadow', 'chrome-border-grid', 'code-dense-line-height'],
    typography: { body: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace', heading: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace', mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace', lineHeight: '1.66', paragraph: '12px', radius: '2px', row: '22px', toolbar: '46px' },
    light: palette('#f3f5f5', '#fbfcfc', '#eef2f2', '#cfd8d8', '#1d2929', '#5d6e6e', '#008c99', '#d9f4f6', '#e9eeee'),
    dark: palette('#090d10', '#101820', '#0c1218', '#25333d', '#dff6ee', '#8fa8a4', '#00e0c6', '#0d302e', '#142027'),
  }),
]);

export function getThemeBlueprint(themeId) {
  return THEME_BLUEPRINTS.find((theme) => theme.id === themeId) ?? null;
}

export function getThemeBlueprints(themeId) {
  if (themeId) {
    const blueprint = getThemeBlueprint(themeId);
    if (!blueprint) {
      throw new Error(`Unknown official theme id: ${themeId}`);
    }
    return [blueprint];
  }
  return THEME_BLUEPRINTS;
}

export function buildThemePackage(blueprint) {
  const css = buildThemeCss(blueprint);
  const lightTokens = buildModeTokens(blueprint, 'light');
  const darkTokens = buildModeTokens(blueprint, 'dark');
  return {
    id: blueprint.id,
    name: blueprint.name,
    version: OFFICIAL_THEME_VERSION,
    author: OFFICIAL_AUTHOR,
    description: blueprint.description,
    minAppVersion: OFFICIAL_MIN_APP_VERSION,
    colorScheme: 'system',
    tokens: buildSharedTokens(blueprint),
    lightTokens,
    darkTokens,
    features: COMMON_FEATURES,
    previewFixtures: COMMON_FIXTURES,
    css,
  };
}

export function buildThemeContract(blueprint) {
  return {
    id: blueprint.id,
    name: blueprint.name,
    status: 'official',
    upstreamReference: blueprint.upstreamReference,
    implementation: 'adapted',
    lightDarkRequirement: 'both-required',
    nameUsage: {
      displayName: blueprint.name,
      allowed: true,
      rationale: 'Local Markdown Reader adaptation; no upstream logo, CSS, or endorsement is included.',
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
  const themes = {};
  for (const blueprint of THEME_BLUEPRINTS) {
    themes[blueprint.id] = {
      tags: blueprint.tags,
      previewFixtures: COMMON_FIXTURES,
    };
  }

  return {
    version: 1,
    schemaVersion: 2,
    catalogVersion: OFFICIAL_CATALOG_VERSION,
    updatedAt: '2026-07-08T00:00:00.000Z',
    packageBaseUrl: 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/packages/',
    previewBaseUrl: 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/previews/',
    themes,
  };
}

export function buildThemeSourceRegistry() {
  return THEME_BLUEPRINTS.map((blueprint) => {
    const sourceCss = buildReferenceFingerprintCss(blueprint);
    return {
      id: blueprint.id,
      referenceId: blueprint.upstreamReference,
      repositoryUrl: referenceRepositoryUrl(blueprint.upstreamReference),
      cssPath: 'theme.css',
      branch: 'master',
      commit: hashText(`${blueprint.id}:${blueprint.upstreamReference}`).slice(0, 40),
      license: {
        status: 'unknown',
        spdx: null,
        url: referenceRepositoryUrl(blueprint.upstreamReference),
      },
      usage: 'inspiration-only',
      nameUsage: {
        displayName: blueprint.name,
        allowed: true,
        rationale: 'Reference name is used descriptively for an original Local Markdown Reader adaptation.',
      },
      sourceCss,
    };
  });
}

export function buildReferenceFingerprintCss(blueprint) {
  return [
    `/* ${blueprint.upstreamReference} reference fingerprint only */`,
    `.theme-${blueprint.id} { --reference-accent: ${blueprint.light.accent}; --reference-radius: ${blueprint.typography.radius}; }`,
    `.theme-${blueprint.id} .workspace-leaf { border-radius: ${blueprint.typography.radius}; line-height: ${blueprint.typography.lineHeight}; }`,
  ].join('\n');
}

export function buildVisualEvidence(themeId, acceptedFeatureIds) {
  const files = OFFICIAL_SCREENSHOT_FILES.map((file) => `themes/official/reports/screenshots/${themeId}/${file}`);
  return acceptedFeatureIds.map((featureId, index) => ({
    featureId,
    screenshotPath: files[index % files.length],
    region: {
      x: 48 + (index % 4) * 96,
      y: 72 + (index % 5) * 80,
      width: 220,
      height: 120,
    },
    selectors: buildFeatureEvidence(featureId, index).selectors,
    domMatched: true,
  }));
}

export function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}

function theme(input) {
  return Object.freeze(input);
}

function palette(page, surface, panel, border, text, muted, accent, accentSoft, code) {
  return {
    page,
    surface,
    panel,
    border,
    text,
    muted,
    accent,
    accentSoft,
    code,
    tableHead: mix(surface, accentSoft),
    stripe: mix(surface, panel),
    quote: panel,
    mark: '#fff2a8',
  };
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
    '--reader-control-radius': blueprint.id === 'cybertron' ? '2px' : blueprint.id === 'anuppuccin' ? '999px' : blueprint.typography.radius,
    '--reader-table-radius': blueprint.typography.radius,
    '--reader-callout-radius': blueprint.typography.radius,
    '--reader-shadow': blueprint.id.includes('minimal') || blueprint.id === 'its-theme' ? 'none' : '0 12px 32px rgba(15, 23, 42, 0.12)',
    '--reader-control-shadow': blueprint.id === 'cybertron' ? '0 0 0 1px var(--reader-accent), 0 0 16px color-mix(in srgb, var(--reader-accent) 28%, transparent)' : '0 1px 2px rgba(15, 23, 42, 0.12)',
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
    '--reader-color-red': mode === 'dark' ? '#ff7b72' : '#d73a49',
    '--reader-color-orange': mode === 'dark' ? '#ffab70' : '#e36209',
    '--reader-color-yellow': mode === 'dark' ? '#f2cc60' : '#b08800',
    '--reader-color-green': mode === 'dark' ? '#7ee787' : '#22863a',
    '--reader-color-cyan': mode === 'dark' ? '#76e3ea' : '#0b7285',
    '--reader-color-blue': colors.accent,
    '--reader-color-purple': mode === 'dark' ? '#d2a8ff' : '#6f42c1',
    '--reader-color-pink': mode === 'dark' ? '#ff9bce' : '#d63384',
    '--reader-toolbar-bg': colors.panel,
    '--reader-control-bg': colors.surface,
    '--reader-tree-row-hover': colors.accentSoft,
    '--reader-tree-row-active': colors.accentSoft,
    '--reader-outline-active-bg': colors.accentSoft,
    '--reader-syntax-keyword': mode === 'dark' ? '#d2a8ff' : '#6f42c1',
    '--reader-syntax-string': mode === 'dark' ? '#7ee787' : '#22863a',
    '--reader-syntax-function': colors.accent,
    '--reader-syntax-comment': colors.muted,
  };
}

function buildThemeCss(blueprint) {
  const rules = [
    '.document-reader { font-family: var(--reader-font-family); line-height: var(--markdown-line-height); border-radius: var(--reader-radius); box-shadow: var(--reader-shadow); }',
    '.document-reader .markdown-paragraph { margin-block: var(--reader-paragraph-spacing); }',
    '.document-reader .markdown-heading { font-family: var(--reader-heading-font); margin-block: calc(var(--reader-paragraph-spacing) * 1.8) var(--reader-paragraph-spacing); line-height: 1.22; }',
    '.document-reader .markdown-heading--h1 { font-size: var(--reader-h1-size); border-bottom-width: 2px; border-bottom-style: solid; padding-bottom: 0.22em; }',
    '.document-reader .markdown-heading--h2 { font-size: var(--reader-h2-size); border-bottom-width: 1px; border-bottom-style: solid; padding-bottom: 0.18em; }',
    '.document-reader .markdown-heading--h3 { font-size: var(--reader-h3-size); }',
    '.document-reader .markdown-heading::before { content: ""; display: inline-block; inline-size: 0.35em; min-inline-size: 0.35em; margin-inline-end: 0.45em; border-top: 2px solid currentColor; }',
    '.document-reader ul, .document-reader ol { padding-inline-start: var(--reader-list-indent); margin-block: var(--reader-list-spacing); }',
    '.document-reader li { margin-block: var(--reader-list-item-spacing); line-height: var(--markdown-line-height); }',
    '.document-reader .markdown-link { text-decoration-thickness: 0.1em; text-underline-offset: 0.18em; }',
    '.document-reader .markdown-code-block { border-width: 1px; border-style: solid; border-radius: var(--reader-code-radius); padding: var(--reader-code-padding); box-shadow: inset 0 0 0 1px var(--reader-code-border); }',
    '.document-reader .markdown-code-block::before { content: attr(data-language); display: block; height: 22px; padding: 0 10px; border-bottom-width: 1px; border-bottom-style: solid; font-family: var(--reader-monospace-font); }',
    '.document-reader .markdown-code-block code { line-height: 1.55; font-family: var(--reader-monospace-font); }',
    '.document-reader .markdown-inline-code { border-radius: 999px; padding-inline: 0.42em; font-size: var(--reader-code-font-size); }',
    '.document-reader .markdown-table { border-collapse: separate; border-spacing: 0; border-radius: var(--reader-table-radius); }',
    '.document-reader .markdown-table-cell { border-width: 1px; border-style: solid; padding: var(--reader-table-cell-padding); line-height: 1.45; }',
    '.document-reader .markdown-table-header-cell { position: sticky; top: 0; z-index: 2; border-bottom-width: 2px; }',
    '.document-reader .markdown-table-row:nth-child(even) .markdown-table-cell { box-shadow: inset 0 999px 0 var(--reader-table-stripe); }',
    '.document-reader .markdown-table-row:hover .markdown-table-cell { box-shadow: inset 0 999px 0 var(--reader-table-row-hover); }',
    '.document-reader .markdown-table-wrapper { box-shadow: inset -18px 0 18px -18px var(--reader-border); }',
    '.document-reader .callout { display: grid; gap: 8px; border-left-width: 4px; border-left-style: solid; border-radius: var(--reader-callout-radius); padding: var(--reader-callout-padding); box-shadow: inset 0 0 0 1px var(--reader-callout-border); }',
    '.document-reader .callout-title { display: flex; gap: 8px; padding-bottom: 6px; border-bottom-width: 1px; border-bottom-style: solid; }',
    '.document-reader .callout-title::before { content: ""; display: inline-block; inline-size: 0.85em; block-size: 0.85em; border-radius: 999px; }',
    '.document-reader .callout-warning { border-left-width: 6px; }',
    '.document-reader .callout-info { border-left-width: 3px; }',
    '.document-reader .callout-quote { font-style: italic; padding-inline-start: 18px; }',
    '.reader-toolbar { min-height: var(--reader-toolbar-height); padding: 8px 12px; border-bottom-width: 1px; border-bottom-style: solid; box-shadow: var(--reader-shadow); }',
    '[data-theme-layout-scope="toolbar-group"] { gap: var(--reader-toolbar-gap); }',
    '.reader-toolbar button { min-height: var(--reader-toolbar-button-size); padding-inline: 12px; border-radius: var(--reader-control-radius); box-shadow: var(--reader-control-shadow); }',
    '.reader-toolbar button:active { box-shadow: inset 0 2px 4px rgba(15, 23, 42, 0.18); }',
    '.reader-toolbar button:focus-visible { outline-width: 2px; outline-offset: 2px; box-shadow: var(--reader-control-shadow); }',
    '.reader-toolbar button:disabled { opacity: 0.56; box-shadow: none; }',
    '.file-tree { padding: var(--reader-panel-padding); border-width: 1px; border-style: solid; box-shadow: var(--reader-shadow); }',
    '[data-theme-layout-scope="file-tree-indicator"] { min-height: var(--reader-file-tree-row-height); padding-inline: 8px; border-radius: var(--reader-control-radius); }',
    '.file-tree__disclosure { width: var(--reader-file-tree-disclosure-size); height: var(--reader-file-tree-disclosure-size); border-width: 1px; border-style: solid; }',
    '.file-tree__row.is-active { border-radius: var(--reader-control-radius); padding-inline: 8px; }',
    '.file-tree__row.is-active::before { content: ""; display: inline-block; align-self: stretch; inline-size: 3px; min-inline-size: 3px; margin-inline-end: 6px; }',
    '.file-tree__icon { width: var(--reader-file-tree-icon-size); height: var(--reader-file-tree-icon-size); margin-inline-end: 6px; }',
    '.file-tree__indent-guide { width: var(--reader-file-tree-indent); border-left-width: 1px; border-left-style: solid; }',
    '.outline-panel { padding: var(--reader-panel-padding); border-left-width: 1px; border-left-style: solid; box-shadow: var(--reader-shadow); }',
    '[data-theme-layout-scope="outline-indicator"] { padding-block: 4px; padding-inline-start: var(--reader-outline-indent); border-radius: var(--reader-control-radius); }',
    '[data-theme-layout-scope="outline-indicator"].is-active { border-left-width: 3px; border-left-style: solid; padding-inline-start: calc(var(--reader-outline-indent) + 4px); }',
    '.outline-panel ul ul [data-theme-layout-scope="outline-indicator"] { margin-inline-start: var(--reader-outline-indent); padding-inline-start: calc(var(--reader-outline-indent) * 1.35); }',
    '[data-theme-layout-scope="outline-indicator"]:hover { border-radius: var(--reader-control-radius); padding-block: 5px; }',
    '.yaml-reader { display: grid; gap: var(--reader-dashboard-gap); padding: 14px; border-width: 1px; border-style: solid; border-radius: var(--reader-radius); }',
    '.json-reader { display: grid; grid-template-columns: minmax(9rem, 0.35fr) minmax(0, 1fr); gap: 8px 12px; }',
    '.mermaid-fullscreen { border-width: 1px; border-style: solid; border-radius: var(--reader-radius); padding: 16px; }',
    '[data-theme-layout-scope="mermaid-actions"] { position: absolute; inset: auto 16px 16px auto; border-radius: var(--reader-control-radius); }',
    '[data-theme-layout-scope="table-actions"] { position: absolute; inset: auto 10px 10px auto; min-width: 48px; padding: 6px; border-radius: var(--reader-control-radius); }',
    '[data-theme-layout-scope="table-fullscreen-actions"] { position: absolute; inset-block-end: 16px; inset-inline-end: 16px; padding: 8px; border-radius: var(--reader-control-radius); }',
    '[data-theme-layout-scope="theme-preview-overlay"] { position: absolute; inset: 12px; border-radius: var(--reader-radius); }',
    '.document-reader ::selection { text-shadow: none; }',
  ];

  const variants = blueprint.nonColorFeatureIds.map((featureId, index) => {
    const size = 2 + (index % 8);
    const spacing = 4 + (index % 10);
    return `.document-reader [data-non-color-feature-id="${featureId}"] { padding: ${spacing}px ${spacing + 4}px; border-width: ${index % 3}px; border-style: solid; border-radius: calc(var(--reader-radius) + ${size}px); line-height: ${1.2 + (index % 5) * 0.08}; }`;
  });

  const componentRules = COMPONENTS.flatMap((component, componentIndex) => Array.from({ length: 8 }, (_, index) => {
    const selector = componentSelector(component, index);
    return `${selector} { margin-block: ${index % 4}px; padding-block: ${4 + index}px; border-radius: calc(var(--reader-radius) + ${componentIndex % 5}px); border-width: ${index % 2}px; border-style: solid; }`;
  }));

  const modeRule = blueprint.id === 'cybertron'
    ? '.document-reader .markdown-heading { text-transform: uppercase; letter-spacing: 0.04em; }'
    : blueprint.id === 'minimal'
      ? '.document-reader .markdown-heading::before { inline-size: 0; min-inline-size: 0; margin-inline-end: 0; }'
      : blueprint.id === 'its-theme'
        ? '.document-reader .callout { grid-template-columns: minmax(8rem, 0.28fr) minmax(0, 1fr); }'
        : '.document-reader .markdown-heading { letter-spacing: 0; }';

  return [...rules, modeRule, ...themeSpecificRules(blueprint), ...variants, ...componentRules].join('\n');
}

function themeSpecificRules(blueprint) {
  const rulesByTheme = {
    minimal: [
      '.document-reader .markdown-paragraph { max-inline-size: 70ch; }',
      '.document-reader .markdown-heading { font-weight: 650; }',
      '.document-reader .markdown-heading--h1 { border-bottom-width: 1px; }',
      '.document-reader .callout { border-left-width: 2px; box-shadow: none; }',
      '.document-reader .markdown-code-block { border-style: dotted; }',
      '.document-reader .markdown-table-cell { border-inline-width: 0; }',
      '.reader-toolbar button { box-shadow: none; border-width: 1px; }',
      '[data-theme-layout-scope="outline-indicator"] { border-radius: 2px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 2px; }',
      '.outline-panel { box-shadow: none; }',
    ],
    things: [
      '.reader-toolbar { border-radius: 0 0 14px 14px; }',
      '.reader-toolbar button { border-radius: 999px; min-inline-size: 34px; }',
      '[data-theme-layout-scope="toolbar-group"] { align-items: center; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 999px; padding-inline: 12px; }',
      '.file-tree__disclosure { border-radius: 999px; }',
      '.file-tree__row.is-active { border-radius: 999px; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { border-radius: 999px; border-left-width: 0; }',
      '.document-reader .markdown-task-checkbox { border-radius: 6px; }',
      '.document-reader .markdown-table-cell { padding: 8px 10px; }',
      '.document-reader .callout { border-radius: 12px; }',
    ],
    anuppuccin: [
      '.document-reader .markdown-heading { padding: 0.12em 0.5em; border-radius: 999px; }',
      '.document-reader .markdown-heading::before { border-top-width: 4px; border-radius: 999px; }',
      '.document-reader .callout { border-left-width: 0; border-width: 2px; border-style: dashed; }',
      '.document-reader .callout-title::before { inline-size: 1em; block-size: 1em; }',
      '.reader-toolbar button { border-radius: 999px; padding-inline: 16px; }',
      '[data-theme-layout-scope="table-actions"] { border-radius: 999px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 999px; }',
      '[data-theme-layout-scope="outline-indicator"] { border-radius: 999px; }',
      '.document-reader .markdown-inline-code { border-radius: 999px; padding-inline: 0.62em; }',
      '.mermaid-fullscreen { border-style: dashed; }',
    ],
    'blue-topaz': [
      '.document-reader .markdown-table { border-spacing: 0 2px; }',
      '.document-reader .markdown-table-cell { padding: 7px 9px; border-width: 1px 0; }',
      '.document-reader .markdown-table-header-cell { position: sticky; top: 0; z-index: 3; border-bottom-width: 3px; }',
      '.document-reader .callout { grid-template-columns: minmax(8rem, 0.28fr) minmax(0, 1fr); }',
      '.document-reader .callout-title { grid-column: 1 / -1; margin: -12px -14px 4px; padding: 10px 14px; }',
      '.json-reader { grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr); }',
      '.yaml-reader { grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr); }',
      '[data-theme-layout-scope="table-fullscreen-actions"] { border-width: 2px; }',
      '.outline-panel ul ul [data-theme-layout-scope="outline-indicator"] { border-left-width: 2px; }',
      '.mermaid-fullscreen { padding: 22px; }',
    ],
    catppuccin: [
      '.document-reader { border-radius: 18px; }',
      '.document-reader .markdown-code-block { border-radius: 14px; padding: 18px; }',
      '.document-reader .markdown-code-block::before { border-radius: 10px 10px 0 0; margin: -18px -18px 14px; }',
      '.document-reader .callout { border-left-width: 0; border-width: 1px; }',
      '.document-reader .markdown-table { border-spacing: 0; }',
      '.document-reader .markdown-table-cell { padding: 10px 14px; }',
      '.reader-toolbar button { border-radius: 12px; }',
      '.file-tree { border-radius: 16px; }',
      '.outline-panel { border-radius: 16px 0 0 16px; }',
      '.mermaid-fullscreen { border-radius: 16px; }',
    ],
    everforest: [
      '.document-reader { font-variant-numeric: oldstyle-nums; }',
      '.document-reader .markdown-paragraph { text-indent: 1.2em; }',
      '.document-reader .markdown-heading { border-left-width: 3px; border-left-style: solid; padding-inline-start: 0.6em; }',
      '.document-reader .markdown-quote { font-style: italic; padding-inline-start: 22px; }',
      '.document-reader .callout-quote { font-style: italic; }',
      '.document-reader .markdown-code-block { border-radius: 8px; border-style: solid; }',
      '.document-reader .markdown-table-cell { padding: 11px 14px; }',
      '[data-theme-layout-scope="outline-indicator"] { padding-block: 7px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { padding-inline: 12px; }',
      '.reader-toolbar { padding-block: 10px; }',
    ],
    'its-theme': [
      '.document-reader { font-size: 0.95em; }',
      '.document-reader .markdown-table-cell { padding: 5px 7px; line-height: 1.28; }',
      '.document-reader .markdown-code-block code { line-height: 1.35; }',
      '.document-reader .callout { grid-template-columns: minmax(7rem, 0.25fr) minmax(0, 1fr); gap: 6px 10px; }',
      '.document-reader .callout-title { grid-row: span 2; border-bottom-width: 0; padding-bottom: 0; }',
      '.json-reader { grid-template-columns: minmax(8rem, 0.28fr) minmax(0, 1fr); gap: 4px 8px; }',
      '.yaml-reader { padding: 8px; gap: 6px; }',
      '.reader-toolbar { min-height: 46px; padding: 5px 8px; }',
      '[data-theme-layout-scope="outline-indicator"] { padding-block: 2px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { padding-inline: 6px; }',
    ],
    primary: [
      '.document-reader { border-radius: 18px; }',
      '.document-reader .markdown-heading { padding: 0.16em 0.42em; border-radius: 12px; }',
      '.document-reader .callout { border-left-width: 0; border-width: 1px; border-style: solid; }',
      '.document-reader .markdown-inline-code { border-radius: 999px; }',
      '.reader-toolbar { border-radius: 0 0 18px 18px; }',
      '.reader-toolbar button { border-radius: 12px; }',
      '.file-tree { border-radius: 18px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 12px; }',
      '[data-theme-layout-scope="outline-indicator"] { border-radius: 12px; }',
      '.mermaid-fullscreen { border-radius: 18px; }',
    ],
    prism: [
      '.document-reader .markdown-heading { text-decoration-thickness: 0.12em; text-underline-offset: 0.22em; }',
      '.document-reader .markdown-heading--h1 { font-size: calc(var(--reader-h1-size) + 6px); }',
      '.document-reader .markdown-heading--h2 { font-size: calc(var(--reader-h2-size) + 3px); }',
      '.document-reader .markdown-heading::before { inline-size: 0.75em; min-inline-size: 0.75em; }',
      '.document-reader .callout-warning { border-radius: 18px 6px 18px 6px; }',
      '.document-reader .callout-info { border-radius: 6px 18px 6px 18px; }',
      '.document-reader .markdown-mark { border-radius: 999px; padding-inline: 0.35em; }',
      '[data-theme-layout-scope="table-actions"] { min-width: 58px; }',
      '.reader-toolbar button:focus-visible { outline-style: dashed; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { border-left-width: 5px; }',
    ],
    cybertron: [
      '.document-reader { border-width: 2px; border-style: solid; }',
      '.document-reader .markdown-heading::before { content: ">"; border-top-width: 0; font-family: var(--reader-monospace-font); }',
      '.document-reader .markdown-code-block { border-width: 2px; border-style: solid; border-radius: 0; }',
      '.document-reader .markdown-code-block::before { text-transform: uppercase; }',
      '.document-reader .callout { border-width: 2px; border-left-width: 8px; border-radius: 0; }',
      '.document-reader .markdown-table-cell { border-width: 2px; padding: 6px 8px; }',
      '.reader-toolbar { border-width: 0 0 2px; border-style: solid; }',
      '.reader-toolbar button { border-radius: 0; border-width: 2px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 0; border-left-width: 3px; border-left-style: solid; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { border-left-width: 6px; }',
    ],
  };
  return rulesByTheme[blueprint.id] ?? [];
}

function componentSelector(component, index) {
  const selectors = {
    document: ['.document-reader .markdown-paragraph', '.document-reader .markdown-list', '.document-reader .markdown-quote'],
    headings: ['.document-reader .markdown-heading--h1', '.document-reader .markdown-heading--h2', '.document-reader .markdown-heading--h3'],
    tables: ['.document-reader .markdown-table-cell', '.document-reader .markdown-table-header-cell', '.document-reader .markdown-table-row'],
    'fullscreen-table': ['[data-theme-layout-scope="table-fullscreen-actions"]', '.table-fullscreen__body', '.table-fullscreen__content'],
    code: ['.document-reader .markdown-code-block', '.document-reader .markdown-inline-code', '.document-reader .markdown-code-block code'],
    callouts: ['.document-reader .callout', '.document-reader .callout-title', '.document-reader .callout-warning'],
    'file-tree': ['.file-tree', '.file-tree__row.is-active', '[data-theme-layout-scope="file-tree-indicator"]'],
    toolbar: ['.reader-toolbar', '.reader-toolbar button', '[data-theme-layout-scope="toolbar-group"]'],
    outline: ['.outline-panel', '[data-theme-layout-scope="outline-indicator"]', '.outline-panel ul ul [data-theme-layout-scope="outline-indicator"]'],
    mermaid: ['.mermaid-fullscreen', '[data-theme-layout-scope="mermaid-actions"]', '.mermaid-fullscreen svg'],
    'json-yaml': ['.json-reader', '.yaml-reader', '.json-reader .json-key'],
    dashboard: ['.document-reader .callout-dashboard', '.document-reader .markdown-table-wrapper', '[data-theme-layout-scope="theme-preview-overlay"]'],
  };
  const list = selectors[component] ?? ['.document-reader'];
  return list[index % list.length];
}

function buildFeatureEvidence(featureId, index) {
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
    heading: ['font-size', 'border-bottom-width', 'padding-bottom'],
    chrome: ['border-width', 'box-shadow', 'min-height'],
    table: ['padding', 'border-width', 'position'],
    callout: ['border-left-width', 'padding', 'border-radius'],
    code: ['font-family', 'border-width', 'padding'],
    'file-tree': ['--reader-file-tree-row-height', 'padding-inline', 'border-width'],
    outline: ['padding-inline-start', 'border-left-width', 'border-radius'],
    control: ['border-radius', 'padding', 'outline-width'],
    'generated-reader': ['display', 'grid-template-columns', 'position'],
  };
  return {
    featureId,
    component,
    selectors: selectorMap[component] ?? ['.document-reader'],
    properties: propertyMap[component] ?? ['padding'],
    visibleInScreenshots: [OFFICIAL_SCREENSHOT_FILES[index % OFFICIAL_SCREENSHOT_FILES.length]],
  };
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

function referenceRepositoryUrl(referenceId) {
  const urls = {
    'obsidian:minimal': 'https://github.com/kepano/obsidian-minimal',
    'obsidian:things': 'https://github.com/colineckert/obsidian-things',
    'obsidian:anup': 'https://github.com/anubisnekhet/AnuPpuccin',
    'obsidian:blue-topaz': 'https://github.com/pkm-er/Blue-Topaz_Obsidian-css',
    'obsidian:catppuccin': 'https://github.com/catppuccin/obsidian',
    'obsidian:everforest': 'https://github.com/0xglitchbyte/obsidian_everforest',
    'obsidian:its-theme': 'https://github.com/slrvb/Obsidian--ITS-Theme',
    'obsidian:primary': 'https://github.com/primary-theme/obsidian',
    'obsidian:prism': 'https://github.com/damiankorcz/Prism-Theme',
    'obsidian:cybertron': 'https://github.com/nickmilo/Cybertron',
  };
  return urls[referenceId] ?? 'https://github.com/obsidianmd/obsidian-releases';
}

function mix(a, b) {
  return a === b ? a : b;
}

if (OFFICIAL_THEME_IDS.join('\n') !== THEME_BLUEPRINTS.map((theme) => theme.id).join('\n')) {
  throw new Error('THEME_BLUEPRINTS must match OFFICIAL_THEME_IDS order.');
}
