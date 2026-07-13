import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['code-editor-frame', 'code-language-badge', 'type-heading-mono'];

export default defineThemeProfile({
  id: 'palette-code',
  name: 'Palette Code',
  description: 'A syntax-led technical theme built from the structural lessons of popular editor palettes.',
  tags: ['code', 'syntax', 'technical', 'palette'],
  references: COMMON_REFERENCES.palette,
  identity: 'Editor-style code frames, compact technical tables, monospaced labels, and semantic status chips.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-body-sans', 'code-dense-line-height', 'code-inline-pill', 'table-dense-grid', 'callout-icon-chip',
    'heading-hierarchy-colorless', 'tree-compact-rows', 'outline-active-rail', 'control-sharp-buttons', 'yaml-summary-panel',
  ),
  typography: {
    body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
    mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace', lineHeight: '1.64', radius: '6px', paragraph: '13px', row: '25px', toolbar: '48px',
  },
  tokens: {
    '--reader-document-padding': '26px 32px 46px', '--reader-h1-size': '30px', '--reader-h2-size': '22px', '--reader-h3-size': '18px',
    '--reader-code-radius': '6px', '--reader-table-radius': '6px', '--reader-callout-radius': '6px', '--reader-panel-padding': '10px',
    '--reader-code-padding': '36px 16px 16px', '--reader-callout-padding': '11px 13px', '--reader-table-cell-padding': '7px 10px',
    '--reader-control-radius': '5px', '--reader-shadow': 'none', '--reader-control-shadow': '0 2px 8px rgba(31, 35, 48, 0.16)',
  },
  light: palette({ page: '#e9eaf0', surface: '#f7f7fb', panel: '#e5e6ee', border: '#c5c8d6', text: '#303343', muted: '#6f7285', accent: '#7653c6', accentSoft: '#e5ddf8', code: '#242634', extra: { tableHead: '#dddfea', stripe: '#f0f1f6', quote: '#ece8f5' } }),
  dark: palette({ page: '#171821', surface: '#20222d', panel: '#1b1d27', border: '#3b3e50', text: '#e7e8f2', muted: '#a5a8bb', accent: '#c6a7ff', accentSoft: '#3a3152', code: '#11131a', mark: '#665526', extra: { tableHead: '#2a2d3c', stripe: '#1d1f29', quote: '#29253a' } }),
  css: `
.document-reader .markdown-heading { font-family: var(--reader-heading-font); }
.document-reader .markdown-heading--h1::before { content: "#"; margin-inline-end: 0.55rem; color: var(--reader-accent); }
.document-reader .markdown-heading--h2::before { content: "##"; margin-inline-end: 0.5rem; color: var(--reader-muted); font-size: 0.72em; }
.document-reader .markdown-heading--h3::before { content: "###"; margin-inline-end: 0.45rem; color: var(--reader-muted); font-size: 0.65em; }
.document-reader .markdown-code-block { border: 0; box-shadow: inset 0 0 0 1px var(--reader-code-border); }
.document-reader .markdown-code-block::before { content: "CODE"; display: block; margin: -1.7rem -0.75rem 1rem; padding: 7px 12px; border-block-end: 1px solid var(--reader-code-border); font-family: var(--reader-heading-font); font-size: 0.7rem; }
.document-reader .markdown-code-block[data-language]::after { content: attr(data-language); display: block; inline-size: max-content; margin: 0.8rem 0 0 auto; padding: 2px 7px; border-radius: 999px; background: var(--reader-accent-muted); color: var(--reader-accent); font-size: 0.68rem; }
.document-reader .markdown-inline-code { border: 1px solid var(--reader-code-border); }
.document-reader .markdown-table { font-family: var(--reader-monospace-font); }
.document-reader .markdown-table-cell--head { font-size: 0.76rem; text-transform: uppercase; }
.document-reader .markdown-table-row:hover .markdown-table-cell { box-shadow: inset 3px 0 var(--reader-accent); }
.document-reader .callout-title::before { border-radius: 2px; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
.document-reader .callout { border-inline-start-width: 4px; }
.reader-toolbar { font-family: var(--reader-monospace-font); }
.reader-toolbar button { border: 1px solid var(--reader-border); }
.file-tree { font-family: var(--reader-monospace-font); font-size: 0.8rem; }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { box-shadow: inset 3px 0 var(--reader-accent); }
.outline-panel { font-family: var(--reader-monospace-font); }
[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: inset 3px 0 var(--reader-accent); }
.yaml-reader, .json-reader { font-family: var(--reader-monospace-font); }
.mermaid-fullscreen { background-image: linear-gradient(var(--reader-border) 1px, transparent 1px), linear-gradient(90deg, var(--reader-border) 1px, transparent 1px); background-size: 24px 24px; }
`,
});
