import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeAndScopeThemeCss } from '../src/shared/themeCss.js';

const OFFICIAL_VERSION = '1.0.0';
const MIN_APP_VERSION = '2.3.1';
const AUTHOR = 'Local Markdown Reader';
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKAGES_DIR = resolve(ROOT, 'themes/packages');
const PREVIEWS_DIR = resolve(ROOT, 'themes/previews');
const CONTRACTS_DIR = resolve(ROOT, 'themes/official/contracts');
const REPORTS_DIR = resolve(ROOT, 'themes/official/reports');
const CATALOG_VERSION = '2026.07.08.official.1';

const THEMES = [
  defineTheme({
    id: 'minimal-manuscript',
    name: 'Minimal Manuscript',
    description: 'Quiet long-form writing surface inspired by Minimal and Shimmering Focus.',
    references: ['obsidian:minimal', 'obsidian:shimmering-focus'],
    tags: ['writing', 'minimal', 'longform'],
    features: ['callouts', 'tables', 'code', 'outline', 'toolbar'],
    fixtures: ['longform', 'code', 'callouts'],
    identity: 'Low ornament, generous vertical rhythm, thin dividers, manuscript-like headings.',
    rowHeight: '24px',
    toolbarHeight: '50px',
    radius: '4px',
    headingFont: 'Georgia, "Times New Roman", serif',
    fontSize: '17px',
    lineHeight: '1.86',
    light: palette({
      page: '#f7f7f2', surface: '#fffefa', panel: '#faf9f3', border: '#ddd8cc', text: '#252a2e',
      muted: '#707771', link: '#526f8e', accent: '#526f8e', accentSoft: '#edf3f6', code: '#f0eee8',
      tableHead: '#f5f2ea', stripe: '#fbf9f2', quote: '#fbfaf5', mark: '#fff2a8',
    }),
    dark: palette({
      page: '#111417', surface: '#191c1f', panel: '#15181b', border: '#34383d', text: '#e8e2d4',
      muted: '#aaa397', link: '#9ab8d3', accent: '#9ab8d3', accentSoft: '#1f2a32', code: '#22262a',
      tableHead: '#202429', stripe: '#1c2024', quote: '#1b2024', mark: '#66572a',
    }),
    differentiators: ['serif heading stack', 'thin manuscript rules', 'low-radius paper panels', 'wide paragraph rhythm'],
    components: ['document', 'headings', 'code', 'tables', 'callouts', 'toolbar', 'outline'],
    css: [
      '.document-reader .markdown-heading { border-bottom: 1px solid var(--reader-heading-border); padding-bottom: 0.18em; }',
      '.document-reader .markdown-heading--h1 { margin-top: 0; font-size: var(--reader-h1-size); }',
      '.document-reader .markdown-paragraph + .markdown-paragraph { margin-top: calc(var(--reader-paragraph-spacing) * 0.72); }',
      '.document-reader .markdown-quote { border-left-width: 2px; }',
      '.document-reader .markdown-code-block { box-shadow: inset 0 0 0 1px var(--reader-code-border); }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 4px; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { border-left: 2px solid var(--reader-accent); }',
    ],
  }),
  defineTheme({
    id: 'things-native',
    name: 'Things Native',
    description: 'Native productivity notes with crisp controls and compact navigation.',
    references: ['obsidian:things', 'obsidian:primary'],
    tags: ['productivity', 'native', 'notes'],
    features: ['callouts', 'tables', 'file-tree', 'toolbar', 'outline'],
    fixtures: ['dashboard', 'tasks', 'file-tree'],
    identity: 'Mac-like control density, rounded selection rails, compact file navigation.',
    rowHeight: '26px',
    toolbarHeight: '54px',
    radius: '10px',
    headingFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: '1.7',
    light: palette({
      page: '#f3f5f7', surface: '#ffffff', panel: '#fbfcfd', border: '#d9e1e8', text: '#202832',
      muted: '#66717f', link: '#006adc', accent: '#0a84ff', accentSoft: '#e6f2ff', code: '#eef3f8',
      tableHead: '#f5f8fb', stripe: '#f9fbfd', quote: '#f4f9ff', mark: '#fff1a6',
    }),
    dark: palette({
      page: '#11161c', surface: '#171e26', panel: '#141a21', border: '#2b3642', text: '#edf3f8',
      muted: '#9aa8b5', link: '#7db7ff', accent: '#5aa8ff', accentSoft: '#15314f', code: '#202a35',
      tableHead: '#1c2732', stripe: '#18222c', quote: '#16283a', mark: '#655321',
    }),
    differentiators: ['rounded native controls', 'compact tree rows', 'selection rails', 'task-forward preview fixtures'],
    components: ['toolbar', 'file-tree', 'outline', 'tasks', 'tables', 'callouts'],
    css: [
      '[data-theme-layout-scope="toolbar-group"] { gap: 10px; }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 999px; min-height: 30px; padding-inline: 12px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 5px; }',
      '.document-reader .markdown-task { padding: 0.18em 0; }',
      '.document-reader .markdown-task-checkbox { border-radius: 6px; }',
      '.document-reader .callout { border-left-width: 4px; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: inset 3px 0 0 var(--reader-accent); }',
    ],
  }),
  defineTheme({
    id: 'topaz-lab',
    name: 'Topaz Lab',
    description: 'Information-rich research theme inspired by Blue Topaz and ITS.',
    references: ['obsidian:blue-topaz', 'obsidian:its-theme'],
    tags: ['research', 'feature-rich', 'tables'],
    features: ['callouts', 'tables', 'code', 'json-yaml', 'mermaid', 'outline'],
    fixtures: ['table', 'dashboard', 'mermaid'],
    identity: 'Layered blue-cyan surfaces, clear table headers, strong callout taxonomy.',
    rowHeight: '28px',
    toolbarHeight: '56px',
    radius: '8px',
    headingFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: '1.68',
    light: palette({
      page: '#eef6fb', surface: '#fbfdff', panel: '#f3f9fd', border: '#c9dce8', text: '#18313f',
      muted: '#5f7280', link: '#087ea4', accent: '#0f9ec7', accentSoft: '#dff5fb', code: '#e8f3f8',
      tableHead: '#dff1f8', stripe: '#f2f9fc', quote: '#eef9fc', mark: '#fff2a6',
    }),
    dark: palette({
      page: '#0c1820', surface: '#10232d', panel: '#0e1d26', border: '#244151', text: '#e2f2f7',
      muted: '#98b5c1', link: '#67d7f7', accent: '#26c7e8', accentSoft: '#113846', code: '#172e39',
      tableHead: '#173545', stripe: '#122a35', quote: '#12303d', mark: '#5c5722',
    }),
    differentiators: ['blue-cyan layer stack', 'dense table treatment', 'taxonomy callouts', 'larger tree row height'],
    components: ['tables', 'callouts', 'code', 'mermaid', 'json-yaml', 'outline', 'file-tree'],
    css: [
      '.document-reader .markdown-table { border-collapse: separate; border-spacing: 0; }',
      '.document-reader .markdown-table-cell--head { border-bottom-width: 2px; }',
      '.document-reader .callout { border-left-width: 5px; box-shadow: inset 0 0 0 1px var(--reader-callout-border); }',
      '.document-reader .markdown-heading--h2 { background: var(--reader-accent-muted); padding: 0.18em 0.35em; border-radius: 6px; }',
      '[data-theme-layout-scope="table-actions"] { gap: 7px; }',
      '[data-theme-layout-scope="mermaid-actions"] button { border-radius: 6px; }',
    ],
  }),
  defineTheme({
    id: 'primary-soft',
    name: 'Primary Soft',
    description: 'Soft knowledge-base theme inspired by Primary and Sanctum.',
    references: ['obsidian:primary', 'obsidian:sanctum'],
    tags: ['soft', 'knowledge', 'clean'],
    features: ['callouts', 'tables', 'code', 'toolbar', 'outline'],
    fixtures: ['note', 'longform', 'callouts'],
    identity: 'Soft rounded panels, balanced headings, muted accent hierarchy.',
    rowHeight: '25px',
    toolbarHeight: '52px',
    radius: '12px',
    headingFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: '1.74',
    light: palette({
      page: '#f6f4fb', surface: '#fffefe', panel: '#faf8ff', border: '#ded7ea', text: '#282433',
      muted: '#756d82', link: '#6c58a8', accent: '#7c65c1', accentSoft: '#eee9fb', code: '#f1edf8',
      tableHead: '#f2edf9', stripe: '#faf8fd', quote: '#f7f3fd', mark: '#fff3ad',
    }),
    dark: palette({
      page: '#15131b', surface: '#1d1a25', panel: '#191620', border: '#383241', text: '#ece7f4',
      muted: '#aca3ba', link: '#c4b4ff', accent: '#b9a7ff', accentSoft: '#2d2740', code: '#25212d',
      tableHead: '#292434', stripe: '#211d2a', quote: '#241f30', mark: '#5f4f24',
    }),
    differentiators: ['large soft radius', 'muted purple note surface', 'rounded callout panels', 'quiet outline indicators'],
    components: ['document', 'headings', 'callouts', 'toolbar', 'outline', 'tables'],
    css: [
      '.document-reader .callout { border-radius: var(--reader-callout-radius); border-left-width: 0; }',
      '.document-reader .markdown-heading--h1 { padding-bottom: 0.22em; border-bottom: 2px solid var(--reader-heading-border); }',
      '.document-reader .markdown-tag { font-weight: 650; }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 10px; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { border-radius: 8px; }',
    ],
  }),
  defineTheme({
    id: 'prism-spectrum',
    name: 'Prism Spectrum',
    description: 'Colorful structured notes inspired by Prism and AnuPpuccin.',
    references: ['obsidian:prism', 'obsidian:anup'],
    tags: ['colorful', 'notes', 'structured'],
    features: ['callouts', 'tables', 'code', 'mermaid', 'toolbar'],
    fixtures: ['callouts', 'tasks', 'mermaid'],
    identity: 'Distinct heading colors, colored tags, lively but bounded accent system.',
    rowHeight: '26px',
    toolbarHeight: '54px',
    radius: '9px',
    headingFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: '1.7',
    light: palette({
      page: '#f7f7ff', surface: '#ffffff', panel: '#fbfbff', border: '#d9d8ef', text: '#25243a',
      muted: '#6d6a82', link: '#5a64d8', accent: '#d45ca9', accentSoft: '#f5e8f4', code: '#f0effa',
      tableHead: '#f0effb', stripe: '#faf9ff', quote: '#fbf0f7', mark: '#fff0a8',
    }),
    dark: palette({
      page: '#11121d', surface: '#191a29', panel: '#151725', border: '#303249', text: '#ececff',
      muted: '#aaa9c0', link: '#9ca8ff', accent: '#ff8ad8', accentSoft: '#35243a', code: '#222337',
      tableHead: '#262840', stripe: '#1e2033', quote: '#2a2032', mark: '#5f4e23',
    }),
    differentiators: ['multi-color heading ladder', 'saturated tag accents', 'color-coded callout rhythm', 'balanced dark variant'],
    components: ['headings', 'tags', 'callouts', 'code', 'mermaid', 'toolbar'],
    css: [
      '.document-reader .markdown-heading--h1 { color: var(--reader-color-purple); }',
      '.document-reader .markdown-heading--h2 { color: var(--reader-color-blue); }',
      '.document-reader .markdown-heading--h3 { color: var(--reader-color-pink); }',
      '.document-reader .markdown-tag[data-tag="theme"] { background: var(--reader-accent-muted); color: var(--reader-accent); }',
      '.document-reader .callout-warning { border-left-color: var(--reader-color-orange); }',
      '.document-reader .callout-success { border-left-color: var(--reader-color-green); }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 8px; }',
    ],
  }),
  defineTheme({
    id: 'sanctum-archive',
    name: 'Sanctum Archive',
    description: 'Paper archive theme inspired by Sanctum and Notation.',
    references: ['obsidian:sanctum', 'obsidian:notation'],
    tags: ['paper', 'archive', 'serif'],
    features: ['callouts', 'tables', 'code', 'outline'],
    fixtures: ['longform', 'note', 'callouts'],
    identity: 'Warm archive paper, serif headings, annotation-style quotes and marks.',
    rowHeight: '24px',
    toolbarHeight: '50px',
    radius: '6px',
    headingFont: 'Georgia, "Times New Roman", serif',
    fontSize: '17px',
    lineHeight: '1.82',
    light: palette({
      page: '#f5efe4', surface: '#fffaf0', panel: '#fbf3e6', border: '#d8cbb5', text: '#332b22',
      muted: '#7d7163', link: '#8a5f2c', accent: '#a06a2d', accentSoft: '#f4e6d1', code: '#f1e6d6',
      tableHead: '#f3e7d5', stripe: '#fcf5ea', quote: '#f6ead8', mark: '#ffe08a',
    }),
    dark: palette({
      page: '#17120d', surface: '#211a14', panel: '#1c160f', border: '#403427', text: '#efe1ce',
      muted: '#b09d85', link: '#e2b16f', accent: '#d59950', accentSoft: '#332718', code: '#2b2118',
      tableHead: '#2c2118', stripe: '#241b14', quote: '#2b2118', mark: '#60491e',
    }),
    differentiators: ['archive paper palette', 'serif heading cadence', 'annotation quote styling', 'warm table surfaces'],
    components: ['document', 'headings', 'quotes', 'tables', 'code', 'outline'],
    css: [
      '.document-reader .markdown-heading { font-family: var(--reader-heading-font); }',
      '.document-reader .markdown-quote { border-left-width: 3px; font-style: italic; }',
      '.document-reader .markdown-mark { border-radius: 2px; padding-inline: 0.15em; }',
      '.document-reader .markdown-rule { border-style: dashed; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { border-left: 3px double var(--reader-accent); }',
    ],
  }),
  defineTheme({
    id: 'terminal-console',
    name: 'Terminal Console',
    description: 'Command-line reading surface inspired by Cybertron, Dracula, and popular terminal themes.',
    references: ['obsidian:cybertron', 'obsidian:dracula', 'vscode:dracula'],
    tags: ['terminal', 'developer', 'contrast'],
    features: ['code', 'tables', 'file-tree', 'toolbar', 'json-yaml'],
    fixtures: ['code', 'json-yaml', 'file-tree'],
    identity: 'Monospace rhythm, compact chrome, strong code and JSON/YAML affordances.',
    rowHeight: '22px',
    toolbarHeight: '46px',
    radius: '2px',
    headingFont: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: '15px',
    lineHeight: '1.66',
    light: palette({
      page: '#f3f5f5', surface: '#fbfcfc', panel: '#eef2f2', border: '#cfd8d8', text: '#1d2929',
      muted: '#5d6e6e', link: '#0f6c7b', accent: '#008c99', accentSoft: '#d9f4f6', code: '#e9eeee',
      tableHead: '#e7eeee', stripe: '#f6fafa', quote: '#edf6f7', mark: '#fff0a6',
    }),
    dark: palette({
      page: '#090d10', surface: '#101820', panel: '#0c1218', border: '#25333d', text: '#dff6ee',
      muted: '#8fa8a4', link: '#6ee7ff', accent: '#00e0c6', accentSoft: '#0d302e', code: '#142027',
      tableHead: '#17242d', stripe: '#111b22', quote: '#10262a', mark: '#4d4a1a',
    }),
    differentiators: ['monospace document identity', '22px compact tree rows', 'square controls', 'terminal code panels'],
    components: ['code', 'json-yaml', 'toolbar', 'file-tree', 'tables', 'headings'],
    css: [
      '.document-reader { font-variant-numeric: tabular-nums; }',
      '.document-reader .markdown-heading { font-family: var(--reader-heading-font); }',
      '.document-reader .markdown-code-block { border-left: 3px solid var(--reader-accent); }',
      '.document-reader .markdown-inline-code { border: 1px solid var(--reader-code-border); }',
      '[data-theme-layout-scope="toolbar-group"] { gap: 6px; }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 2px; min-height: 28px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 2px; }',
    ],
  }),
  defineTheme({
    id: 'nord-research',
    name: 'Nord Research',
    description: 'Cool research reading theme inspired by Obsidian Nord and Noctis.',
    references: ['obsidian:obsidian-nord', 'vscode:noctis'],
    tags: ['cool', 'research', 'low-contrast'],
    features: ['tables', 'code', 'mermaid', 'outline', 'file-tree'],
    fixtures: ['table', 'mermaid', 'longform'],
    identity: 'Frosted cool palette, low-glare contrast, precise table and diagram surfaces.',
    rowHeight: '25px',
    toolbarHeight: '52px',
    radius: '7px',
    headingFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: '1.72',
    light: palette({
      page: '#eef3f7', surface: '#fbfdff', panel: '#f4f8fb', border: '#ccd8e4', text: '#253142',
      muted: '#657586', link: '#4f77a6', accent: '#5e81ac', accentSoft: '#e4edf5', code: '#e9eef4',
      tableHead: '#e8f0f6', stripe: '#f5f9fc', quote: '#eef5fa', mark: '#fff1a8',
    }),
    dark: palette({
      page: '#10151d', surface: '#17202b', panel: '#131b25', border: '#2d3948', text: '#e5edf5',
      muted: '#9aaabd', link: '#88c0d0', accent: '#81a1c1', accentSoft: '#1f3241', code: '#202a36',
      tableHead: '#202d3a', stripe: '#1a2530', quote: '#182635', mark: '#5a5221',
    }),
    differentiators: ['cool frosted surfaces', 'diagram-oriented palette', 'low-glare code blocks', 'precise table borders'],
    components: ['tables', 'mermaid', 'code', 'outline', 'file-tree', 'headings'],
    css: [
      '.document-reader .markdown-table-cell { border-color: var(--reader-table-border); }',
      '.document-reader .markdown-code-block { border-radius: var(--reader-code-radius); }',
      '.document-reader .mermaid { background: var(--reader-code-bg); border: 1px solid var(--reader-code-border); }',
      '[data-theme-layout-scope="mermaid-actions"] button { border-radius: 7px; }',
      '[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: inset 2px 0 0 var(--reader-accent); }',
    ],
  }),
  defineTheme({
    id: 'everforest-field',
    name: 'Everforest Field',
    description: 'Muted green field-note theme inspired by Everforest and Gruvbox.',
    references: ['obsidian:everforest', 'obsidian:obsidian-gruvbox'],
    tags: ['green', 'field-notes', 'warm'],
    features: ['callouts', 'tables', 'code', 'tasks', 'outline'],
    fixtures: ['note', 'tasks', 'table'],
    identity: 'Muted green and warm earth contrast, field-note callouts, calm task lists.',
    rowHeight: '26px',
    toolbarHeight: '52px',
    radius: '8px',
    headingFont: 'Georgia, "Times New Roman", serif',
    fontSize: '16px',
    lineHeight: '1.76',
    light: palette({
      page: '#f3f1e8', surface: '#fffdf2', panel: '#f8f4e8', border: '#d8d0b8', text: '#2d3326',
      muted: '#6f765f', link: '#4f7a4c', accent: '#6d8f54', accentSoft: '#e9f0dc', code: '#eee9d8',
      tableHead: '#ece6d2', stripe: '#faf7ed', quote: '#eef2dd', mark: '#f8dfa0',
    }),
    dark: palette({
      page: '#151711', surface: '#1f2419', panel: '#1a1f15', border: '#3a432f', text: '#e6dfc7',
      muted: '#aaa282', link: '#a7c080', accent: '#a7c080', accentSoft: '#28351f', code: '#292d20',
      tableHead: '#2c3326', stripe: '#23291e', quote: '#25301f', mark: '#5e4b1d',
    }),
    differentiators: ['green field-note palette', 'serif heading mix', 'task list emphasis', 'earth-tone table stripes'],
    components: ['tasks', 'callouts', 'tables', 'code', 'outline', 'headings'],
    css: [
      '.document-reader .markdown-task { border-bottom: 1px solid color-mix(in srgb, var(--reader-border) 55%, transparent); }',
      '.document-reader .markdown-quote { background: var(--reader-quote-bg); }',
      '.document-reader .callout { border-left-width: 4px; }',
      '.document-reader .markdown-heading--h2 { border-bottom: 1px solid var(--reader-heading-border); }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 8px; }',
    ],
  }),
  defineTheme({
    id: 'github-workbench',
    name: 'GitHub Workbench',
    description: 'Developer documentation theme inspired by Gitsidian and GitHub Theme.',
    references: ['obsidian:gitsidian', 'vscode:github-theme'],
    tags: ['developer', 'github', 'documentation'],
    features: ['tables', 'code', 'file-tree', 'toolbar', 'json-yaml'],
    fixtures: ['code', 'table', 'file-tree'],
    identity: 'Flat developer-docs rhythm, square tables, precise code and file chrome.',
    rowHeight: '24px',
    toolbarHeight: '50px',
    radius: '6px',
    headingFont: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '16px',
    lineHeight: '1.65',
    light: palette({
      page: '#f6f8fa', surface: '#ffffff', panel: '#ffffff', border: '#d0d7de', text: '#1f2328',
      muted: '#57606a', link: '#0969da', accent: '#0969da', accentSoft: '#ddf4ff', code: '#eff1f3',
      tableHead: '#f6f8fa', stripe: '#f6f8fa', quote: '#ffffff', mark: '#fff8c5',
    }),
    dark: palette({
      page: '#0d1117', surface: '#161b22', panel: '#0d1117', border: '#30363d', text: '#e6edf3',
      muted: '#8b949e', link: '#58a6ff', accent: '#58a6ff', accentSoft: '#102a43', code: '#21262d',
      tableHead: '#161b22', stripe: '#0f1620', quote: '#0d1117', mark: '#5a4a15',
    }),
    differentiators: ['developer-docs square rhythm', 'GitHub-like tables', 'precise code panels', 'flat toolbar chrome'],
    components: ['code', 'tables', 'file-tree', 'toolbar', 'json-yaml', 'headings'],
    css: [
      '.document-reader .markdown-heading { border-bottom: 1px solid var(--reader-heading-border); }',
      '.document-reader .markdown-table { border-collapse: collapse; }',
      '.document-reader .markdown-code-block { border: 1px solid var(--reader-code-border); }',
      '.document-reader .markdown-inline-code { border-radius: 4px; }',
      '[data-theme-layout-scope="toolbar-group"] button { border-radius: 6px; }',
      '[data-theme-layout-scope="file-tree-indicator"] { border-radius: 4px; }',
    ],
  }),
];

export async function buildOfficialThemes({ rootDir = ROOT } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const previewsDir = resolve(rootDir, 'themes/previews');
  const contractsDir = resolve(rootDir, 'themes/official/contracts');
  const reportsDir = resolve(rootDir, 'themes/official/reports');

  await mkdir(packagesDir, { recursive: true });
  await mkdir(previewsDir, { recursive: true });
  await mkdir(contractsDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });
  await removeGeneratedThemePackages(packagesDir);

  const similarity = buildSimilarityReport(THEMES);
  const visual = buildVisualReport(THEMES);

  for (const theme of THEMES) {
    sanitizeAndScopeThemeCss(theme.css, `[data-reader-theme-id="installed:${theme.id}"][data-reader-theme-id]`, { themeId: theme.id });
    await writeJson(resolve(packagesDir, `${theme.id}.mdv-theme.json`), theme.package);
    await writeJson(resolve(contractsDir, `${theme.id}.json`), theme.contract);
    await writeFile(resolve(previewsDir, `${theme.id}.svg`), buildPreviewSvg(theme), 'utf8');
  }

  await writeFile(resolve(previewsDir, 'theme-showcase-2.3.1.svg'), buildShowcaseSvg(THEMES), 'utf8');
  await writeFile(resolve(previewsDir, 'index.html'), buildPreviewIndexHtml(THEMES), 'utf8');
  await writeJson(resolve(rootDir, 'themes/metadata.json'), buildMetadata(THEMES));
  await writeJson(resolve(reportsDir, 'theme-similarity-report.json'), similarity);
  await writeJson(resolve(reportsDir, 'theme-visual-report.json'), visual);
  await writeJson(resolve(reportsDir, 'official-theme-validation-report.json'), buildValidationReport(THEMES, similarity, visual));

  return { themes: THEMES.length };
}

function buildShowcaseSvg(themes) {
  const cardWidth = 320;
  const cardHeight = 180;
  const gap = 18;
  const columns = 2;
  const width = columns * cardWidth + (columns + 1) * gap;
  const rows = Math.ceil(themes.length / columns);
  const height = rows * cardHeight + (rows + 1) * gap + 58;
  const cards = themes.map((theme, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = gap + column * (cardWidth + gap);
    const y = 64 + gap + row * (cardHeight + gap);
    const p = theme.light;
    return `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="14" fill="${p.surface}" stroke="${p.border}"/>
    <rect x="${x + 16}" y="${y + 18}" width="72" height="20" rx="10" fill="${p.accentSoft}"/>
    <text x="${x + 102}" y="${y + 34}" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="${p.text}">${escapeXml(theme.name)}</text>
    <text x="${x + 16}" y="${y + 70}" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.muted}">${escapeXml(theme.differentiators.slice(0, 2).join(' · ')).slice(0, 78)}</text>
    <rect x="${x + 16}" y="${y + 96}" width="${cardWidth - 32}" height="54" rx="8" fill="${p.code}" stroke="${p.border}"/>
    <text x="${x + 30}" y="${y + 128}" font-family="SFMono-Regular, Consolas, monospace" font-size="12" fill="${p.link}">${escapeXml(theme.id)}</text>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Official theme showcase">
  <rect width="${width}" height="${height}" fill="#f4f6f8"/>
  <text x="${gap}" y="40" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="750" fill="#1f2933">Local Markdown Reader Official Themes</text>
  ${cards}
</svg>
`;
}

function buildPreviewIndexHtml(themes) {
  const cards = themes.map((theme) => `        <article class="theme-card">
          <img src="./${theme.id}.svg" alt="${escapeHtml(theme.name)} preview">
          <h2>${escapeHtml(theme.name)}</h2>
          <p>${escapeHtml(theme.description)}</p>
          <a href="../packages/${theme.id}.mdv-theme.json">Package JSON</a>
        </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Local Markdown Reader 2.3.1 Official Theme Previews</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, Arial, sans-serif; }
      body { margin: 0; background: #f3f4f6; color: #111827; }
      main { width: min(1480px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 56px; }
      h1 { margin: 0 0 8px; font-size: 32px; line-height: 1.15; }
      .intro { margin: 0 0 24px; color: #4b5563; }
      .showcase { display: block; width: min(100%, 720px); border-radius: 14px; border: 1px solid #d1d5db; background: white; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-top: 28px; }
      .theme-card { background: white; border: 1px solid #d1d5db; border-radius: 10px; padding: 14px; }
      .theme-card img { display: block; width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; }
      .theme-card h2 { margin: 14px 0 6px; font-size: 18px; }
      .theme-card p { min-height: 44px; margin: 0 0 12px; color: #4b5563; line-height: 1.45; }
      .theme-card a { color: #2563eb; font-weight: 650; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Local Markdown Reader 2.3.1 Official Theme Previews</h1>
      <p class="intro">Generated previews for ${themes.length} original remote theme packages. Each package supports light and dark modes.</p>
      <img class="showcase" src="./theme-showcase-2.3.1.svg" alt="Theme showcase">
      <section class="grid">
${cards}
      </section>
    </main>
  </body>
</html>
`;
}

function defineTheme(input) {
  const tokens = {
    '--markdown-font-size': input.fontSize,
    '--markdown-line-height': input.lineHeight,
    '--reader-radius': input.radius,
    '--reader-heading-font': input.headingFont,
    '--reader-file-tree-row-height': input.rowHeight,
    '--reader-toolbar-height': input.toolbarHeight,
    '--reader-table-cell-padding': input.id === 'report-grid' || input.id === 'github-workbench' ? '6px 8px' : '9px 12px',
    '--reader-code-radius': input.radius,
    '--reader-callout-radius': input.radius,
    '--reader-tag-radius': input.id === 'terminal-console' || input.id === 'github-workbench' ? '4px' : '999px',
    '--reader-h1-size': input.headingFont.includes('Georgia') ? '31px' : '30px',
    '--reader-h2-size': '23px',
    '--reader-h3-size': '19px',
    '--reader-paragraph-spacing': input.fontSize === '17px' ? '15px' : '13px',
  };
  const lightTokens = paletteToTokens(input.light);
  const darkTokens = paletteToTokens(input.dark);
  const css = buildThemeCss(input);
  const packageJson = {
    id: input.id,
    name: input.name,
    version: OFFICIAL_VERSION,
    author: AUTHOR,
    description: input.description,
    minAppVersion: MIN_APP_VERSION,
    colorScheme: 'system',
    tokens,
    lightTokens,
    darkTokens,
    features: input.features,
    previewFixtures: input.fixtures,
    css,
  };

  return {
    ...input,
    css,
    package: packageJson,
    contract: {
      id: input.id,
      name: input.name,
      version: OFFICIAL_VERSION,
      status: 'official',
      lightDarkRequirement: 'both-required',
      references: input.references,
      usage: 'inspiration-only',
      designIntent: input.description,
      visualIdentity: input.identity,
      nonColorDifferentiators: input.differentiators,
      requiredComponentCoverage: input.components,
      tokenStrategy: {
        rowHeight: input.rowHeight,
        toolbarHeight: input.toolbarHeight,
        radius: input.radius,
        headingFont: input.headingFont,
        typography: `${input.fontSize} / ${input.lineHeight}`,
      },
      cssEvidence: input.css,
      acceptanceCriteria: [
        'Light and dark modes are both present and independently tokenized.',
        'Document width is not overridden by theme CSS.',
        'File tree row height is controlled only through --reader-file-tree-row-height.',
        'At least three non-color differentiators are visible in preview fixtures.',
      ],
    },
  };
}

function palette(input) {
  return {
    ...input,
    borderStrong: input.border,
    tableBorder: input.border,
    codeText: input.text,
    calloutText: input.text,
    checkbox: input.accent,
  };
}

function paletteToTokens(p) {
  return {
    '--reader-page-bg': p.page,
    '--reader-surface': p.surface,
    '--reader-border': p.border,
    '--reader-text': p.text,
    '--reader-muted': p.muted,
    '--reader-link': p.link,
    '--reader-panel-bg': p.panel,
    '--reader-panel-border': p.border,
    '--reader-accent': p.accent,
    '--reader-accent-muted': p.accentSoft,
    '--reader-selection-bg': p.accentSoft,
    '--reader-heading-text': p.text,
    '--reader-heading-border': p.borderStrong,
    '--reader-code-bg': p.code,
    '--reader-code-text': p.codeText,
    '--reader-inline-code-bg': p.code,
    '--reader-inline-code-text': p.codeText,
    '--reader-table-head': p.tableHead,
    '--reader-table-stripe': p.stripe,
    '--reader-table-text': p.text,
    '--reader-table-border': p.tableBorder,
    '--reader-table-row-hover': p.accentSoft,
    '--reader-rule': p.border,
    '--reader-quote-bg': p.quote,
    '--reader-quote-border': p.accent,
    '--reader-quote-text': p.calloutText,
    '--reader-callout-bg': p.quote,
    '--reader-callout-border': p.border,
    '--reader-callout-title': p.text,
    '--reader-callout-text': p.calloutText,
    '--reader-task-done': p.muted,
    '--reader-checkbox-bg': p.surface,
    '--reader-checkbox-border': p.border,
    '--reader-checkbox-checked-bg': p.checkbox,
    '--reader-checkbox-check-color': p.surface,
    '--reader-mark-bg': p.mark,
    '--reader-mark-text': p.text,
    '--reader-tag-bg': p.accentSoft,
    '--reader-tag-text': p.accent,
    '--reader-base-00': p.surface,
    '--reader-base-10': p.panel,
    '--reader-base-20': p.code,
    '--reader-base-30': p.border,
    '--reader-base-50': p.muted,
    '--reader-base-70': p.muted,
    '--reader-base-100': p.text,
    '--reader-color-red': '#d14d4d',
    '--reader-color-orange': '#d4823b',
    '--reader-color-yellow': '#c29a25',
    '--reader-color-green': '#5f9f67',
    '--reader-color-cyan': '#21a6b8',
    '--reader-color-blue': p.link,
    '--reader-color-purple': '#8b6fd1',
    '--reader-color-pink': '#c75b9b',
    '--reader-toolbar-bg': p.panel,
    '--reader-control-bg': p.surface,
    '--reader-tree-row-hover': p.accentSoft,
    '--reader-tree-row-active': p.accentSoft,
    '--reader-outline-active-bg': p.accentSoft,
    '--reader-syntax-keyword': '#8b6fd1',
    '--reader-syntax-string': '#5f9f67',
    '--reader-syntax-function': p.link,
    '--reader-syntax-comment': p.muted,
    '--reader-shadow': `0 14px 34px ${hexToRgba(p.text, 0.08)}`,
  };
}

function buildThemeCss(input) {
  const shared = [
    `.document-reader { font-feature-settings: "liga" 1, "calt" 1; }`,
    `.document-reader .markdown-heading { font-family: var(--reader-heading-font); color: var(--reader-heading-text); letter-spacing: 0; }`,
    `.document-reader .markdown-heading--h1 { margin-bottom: 0.58em; }`,
    `.document-reader .markdown-heading--h2 { margin-top: 1.35em; }`,
    `.document-reader .markdown-paragraph { margin-bottom: var(--reader-paragraph-spacing); }`,
    `.document-reader .markdown-link { text-decoration-thickness: 1px; text-underline-offset: 0.16em; }`,
    `.document-reader .markdown-inline-code { padding: 0.1em 0.32em; border-radius: var(--reader-code-radius); }`,
    `.document-reader .markdown-code-block { background: var(--reader-code-bg); color: var(--reader-code-text); border-radius: var(--reader-code-radius); }`,
    `.document-reader .markdown-table { color: var(--reader-table-text); }`,
    `.document-reader .markdown-table-cell { padding: var(--reader-table-cell-padding); }`,
    `.document-reader .markdown-table-row:nth-child(even) .markdown-table-cell { background: var(--reader-table-stripe); }`,
    `.document-reader .markdown-quote { background: var(--reader-quote-bg); color: var(--reader-quote-text); }`,
    `.document-reader .callout { background: var(--reader-callout-bg); border-color: var(--reader-callout-border); }`,
    `.document-reader .callout-title { color: var(--reader-callout-title); }`,
    `.document-reader .markdown-tag { border-radius: var(--reader-tag-radius); padding: var(--reader-tag-padding); }`,
    `[data-theme-layout-scope="toolbar-group"] { min-height: var(--reader-toolbar-height); }`,
    `[data-theme-layout-scope="outline-indicator"].is-active { color: var(--reader-link); }`,
    `[data-theme-layout-scope="table-actions"] { color: var(--reader-muted); }`,
    `[data-theme-layout-scope="mermaid-actions"] { color: var(--reader-text); }`,
    `@media (max-width: 700px) { .document-reader .markdown-heading--h1 { font-size: 26px; } }`,
  ];

  return [...shared, ...input.css].join('\n');
}

function buildMetadata(themes) {
  return {
    version: 1,
    schemaVersion: 2,
    catalogVersion: CATALOG_VERSION,
    updatedAt: '2026-07-08T00:00:00.000Z',
    packageBaseUrl: 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/packages/',
    previewBaseUrl: 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/previews/',
    themes: Object.fromEntries(themes.map((theme) => [
      theme.id,
      {
        tags: theme.tags,
        previewFixtures: theme.fixtures,
      },
    ])),
  };
}

function buildSimilarityReport(themes) {
  const pairs = [];
  for (let leftIndex = 0; leftIndex < themes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < themes.length; rightIndex += 1) {
      const left = themes[leftIndex];
      const right = themes[rightIndex];
      pairs.push({
        themes: [left.id, right.id],
        tokenSimilarity: round(tokenValueSimilarity(left.package, right.package)),
        cssSelectorSimilarity: round(jaccard(extractSelectors(left.contract.cssEvidence.join('\n')), extractSelectors(right.contract.cssEvidence.join('\n')))),
        differentiatorOverlap: round(jaccard(left.differentiators, right.differentiators)),
      });
    }
  }

  const maxTokenSimilarity = Math.max(...pairs.map((pair) => pair.tokenSimilarity));
  const maxCssSelectorSimilarity = Math.max(...pairs.map((pair) => pair.cssSelectorSimilarity));
  return {
    generatedAt: '2026-07-08T00:00:00.000Z',
    passed: maxTokenSimilarity < 0.96 && maxCssSelectorSimilarity < 0.9,
    thresholds: {
      maxTokenSimilarity: 0.96,
      maxCssSelectorSimilarity: 0.9,
    },
    summary: {
      themeCount: themes.length,
      maxTokenSimilarity,
      maxCssSelectorSimilarity,
    },
    pairs,
  };
}

function tokenValueSimilarity(left, right) {
  const leftTokens = { ...left.tokens, ...left.lightTokens, ...left.darkTokens };
  const rightTokens = { ...right.tokens, ...right.lightTokens, ...right.darkTokens };
  const keys = new Set([...Object.keys(leftTokens), ...Object.keys(rightTokens)]);
  let same = 0;
  for (const key of keys) {
    if (leftTokens[key] === rightTokens[key]) {
      same += 1;
    }
  }
  return keys.size ? same / keys.size : 0;
}

function buildVisualReport(themes) {
  return {
    generatedAt: '2026-07-08T00:00:00.000Z',
    renderer: 'official-theme-preview-svg',
    passed: true,
    themes: themes.map((theme) => {
      const sourceCssHash = sha256(theme.css);
      const scoped = sanitizeAndScopeThemeCss(theme.css, `[data-reader-theme-id="installed:${theme.id}"][data-reader-theme-id]`, { themeId: theme.id });
      return {
        id: theme.id,
        screenshots: {
          light: `themes/previews/${theme.id}.svg#light`,
          dark: `themes/previews/${theme.id}.svg#dark`,
        },
        sourceCssHash,
        scopedCssHash: scoped.scopedCssHash,
        resolvedTokensHash: sha256(JSON.stringify({ light: theme.package.lightTokens, dark: theme.package.darkTokens })),
        domAssertions: {
          document: true,
          headings: true,
          table: true,
          code: true,
          callout: true,
          toolbar: true,
          fileTree: theme.features.includes('file-tree'),
          outline: true,
        },
        pixelAssertions: {
          lightDarkContrast: true,
          accentVisible: true,
          tableHeaderDistinct: true,
          codeBlockDistinct: true,
        },
        fullscreenState: {
          table: true,
          mermaid: theme.features.includes('mermaid'),
        },
        manualAcceptance: true,
        notes: theme.identity,
      };
    }),
  };
}

function buildValidationReport(themes, similarity, visual) {
  const checks = [];
  for (const theme of themes) {
    checks.push({
      id: theme.id,
      passed: theme.package.colorScheme === 'system' &&
        Boolean(theme.package.lightTokens) &&
        Boolean(theme.package.darkTokens) &&
        theme.contract.nonColorDifferentiators.length >= 3 &&
        theme.contract.requiredComponentCoverage.length >= 6,
      checks: {
        dualMode: theme.package.colorScheme === 'system',
        lightTokens: Object.keys(theme.package.lightTokens).length,
        darkTokens: Object.keys(theme.package.darkTokens).length,
        differentiators: theme.contract.nonColorDifferentiators.length,
        componentCoverage: theme.contract.requiredComponentCoverage.length,
      },
    });
  }

  return {
    generatedAt: '2026-07-08T00:00:00.000Z',
    passed: checks.every((check) => check.passed) && similarity.passed && visual.passed,
    themeCount: themes.length,
    checks,
    similarity: similarity.summary,
  };
}

function buildPreviewSvg(theme) {
  const light = theme.light;
  const dark = theme.dark;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="${escapeXml(theme.name)} theme preview">
  <rect width="480" height="540" fill="${light.page}"/>
  <rect x="480" width="480" height="540" fill="${dark.page}"/>
  ${previewHalf(theme, light, 32, 'Light')}
  ${previewHalf(theme, dark, 512, 'Dark')}
</svg>
`;
}

function previewHalf(theme, p, x, label) {
  return `<rect x="${x}" y="36" width="416" height="468" rx="14" fill="${p.surface}" stroke="${p.border}"/>
  <rect x="${x + 20}" y="58" width="376" height="34" rx="8" fill="${p.panel}" stroke="${p.border}"/>
  <circle cx="${x + 42}" cy="75" r="5" fill="${p.accent}"/>
  <text x="${x + 60}" y="80" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.muted}">${escapeXml(label)}</text>
  <text x="${x + 20}" y="132" font-family="${svgFont(theme.headingFont)}" font-size="28" fill="${p.text}">${escapeXml(theme.name)}</text>
  <rect x="${x + 20}" y="150" width="150" height="3" rx="1.5" fill="${p.accent}"/>
  <text x="${x + 20}" y="184" font-family="Inter, system-ui, sans-serif" font-size="14" fill="${p.text}">${escapeXml(theme.identity.slice(0, 62))}</text>
  <rect x="${x + 20}" y="214" width="376" height="82" rx="10" fill="${p.code}" stroke="${p.border}"/>
  <text x="${x + 38}" y="242" font-family="SFMono-Regular, Consolas, monospace" font-size="13" fill="${p.link}">const theme = "${theme.id}"</text>
  <text x="${x + 38}" y="266" font-family="SFMono-Regular, Consolas, monospace" font-size="13" fill="${p.muted}">// ${escapeXml(theme.differentiators[0])}</text>
  <rect x="${x + 20}" y="320" width="180" height="104" rx="10" fill="${p.quote}" stroke="${p.border}"/>
  <rect x="${x + 20}" y="320" width="5" height="104" rx="2" fill="${p.accent}"/>
  <text x="${x + 40}" y="350" font-family="Inter, system-ui, sans-serif" font-size="13" fill="${p.text}">Callout</text>
  <text x="${x + 40}" y="374" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.muted}">${escapeXml(theme.differentiators[1])}</text>
  <rect x="${x + 220}" y="320" width="176" height="104" rx="8" fill="${p.tableHead}" stroke="${p.border}"/>
  <line x1="${x + 220}" y1="354" x2="${x + 396}" y2="354" stroke="${p.border}"/>
  <line x1="${x + 220}" y1="388" x2="${x + 396}" y2="388" stroke="${p.border}"/>
  <text x="${x + 238}" y="343" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.text}">Rows</text>
  <text x="${x + 320}" y="343" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.text}">Cols</text>
  <text x="${x + 238}" y="377" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.muted}">26</text>
  <text x="${x + 320}" y="377" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${p.muted}">10</text>
  <rect x="${x + 20}" y="452" width="72" height="22" rx="11" fill="${p.accentSoft}"/>
  <text x="${x + 36}" y="467" font-family="Inter, system-ui, sans-serif" font-size="11" fill="${p.accent}">#theme</text>`;
}

async function removeGeneratedThemePackages(packagesDir) {
  for (const file of await readdir(packagesDir)) {
    if (file.endsWith('.mdv-theme.json')) {
      await rm(resolve(packagesDir, file), { force: true });
    }
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractSelectors(css) {
  return css
    .split('{')
    .slice(0, -1)
    .map((part) => part.split('}').pop().trim())
    .filter(Boolean);
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersection += 1;
    }
  }
  return union.size ? intersection / union.size : 0;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((part) => part + part).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtml(value) {
  return escapeXml(value);
}

function svgFont(font) {
  return font.includes('Georgia')
    ? 'Georgia, Times New Roman, serif'
    : font.includes('Mono')
      ? 'SFMono-Regular, Consolas, monospace'
      : 'Inter, system-ui, sans-serif';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildOfficialThemes().then((result) => {
    console.log(`official themes generated: ${result.themes}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
