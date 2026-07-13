import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['table-dense-grid', 'json-key-value-grid', 'callout-dashboard-block'];

export default defineThemeProfile({
  id: 'atlas-reference',
  name: 'Atlas Reference',
  description: 'A dense reference theme for metadata, ledgers, structured notes, and large technical documents.',
  tags: ['dense', 'reference', 'metadata', 'structured'],
  references: COMMON_REFERENCES.atlas,
  identity: 'Compact ledger tables, sectioned callouts, metadata grids, and strongly organized navigation depth.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-compact-line-height', 'heading-left-rail', 'table-dataview-density', 'callout-compact', 'callout-title-band',
    'code-dense-line-height', 'tree-compact-rows', 'outline-compact-list', 'yaml-summary-panel', 'chrome-compact-sidebar',
  ),
  typography: {
    body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Charter, Georgia, serif',
    mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.56', radius: '4px', paragraph: '10px', row: '22px', toolbar: '44px',
  },
  tokens: {
    '--reader-document-padding': '22px 28px 40px', '--reader-h1-size': '28px', '--reader-h2-size': '21px', '--reader-h3-size': '17px',
    '--reader-code-radius': '3px', '--reader-table-radius': '3px', '--reader-callout-radius': '3px', '--reader-panel-padding': '8px',
    '--reader-code-padding': '12px 14px', '--reader-callout-padding': '9px 11px', '--reader-table-cell-padding': '6px 8px',
    '--reader-control-radius': '3px', '--reader-shadow': 'none', '--reader-control-shadow': '0 1px 2px rgba(20, 35, 45, 0.14)',
  },
  light: palette({ page: '#edf0ec', surface: '#fbfcf9', panel: '#e5ebe5', border: '#bdc8bf', text: '#26342d', muted: '#66756c', accent: '#496f5a', accentSoft: '#d9e5dc', code: '#eef2ed', extra: { tableHead: '#d8e2da', stripe: '#f2f5f1', quote: '#e8eee8' } }),
  dark: palette({ page: '#151a17', surface: '#1c241f', panel: '#18201b', border: '#3b4c41', text: '#dce6df', muted: '#9aab9f', accent: '#8fc3a0', accentSoft: '#294033', code: '#111713', mark: '#5d552e', extra: { tableHead: '#293a30', stripe: '#19221d', quote: '#213029' } }),
  css: `
.document-reader { border-inline: 1px solid var(--reader-border); }
.document-reader .markdown-heading--h1 { padding-block-end: 0.45rem; border-block-end: 3px double var(--reader-heading-border); }
.document-reader .markdown-heading--h2 { padding-inline-start: 0.65rem; border-inline-start: 4px solid var(--reader-accent); }
.document-reader .markdown-heading--h3 { padding-block-end: 0.2rem; border-block-end: 1px dotted var(--reader-heading-border); }
.document-reader .markdown-table { border: 1px solid var(--reader-table-border); }
.document-reader .markdown-table-cell { border-inline-end: 1px solid var(--reader-table-border); }
.document-reader .markdown-table-cell:last-child { border-inline-end: 0; }
.document-reader .markdown-table-cell--head { text-transform: uppercase; font-size: 0.78rem; }
.document-reader .callout { grid-template-columns: minmax(7rem, 0.25fr) minmax(0, 1fr); align-items: start; }
.document-reader .callout-title { align-self: stretch; padding-inline-end: 0.75rem; border-inline-end: 1px solid var(--reader-callout-border); }
.document-reader .callout-content { min-inline-size: 0; }
.document-reader .callout-dashboard { grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); }
.document-reader .markdown-code-block { border-inline-start-width: 4px; }
.reader-toolbar { padding-block: 5px; }
.reader-toolbar button { font-size: 0.8rem; }
.file-tree__name { font-size: 0.82rem; }
.file-tree__indent-guide { border-inline-start-style: dotted; }
.outline-panel h2 { padding-block-end: 0.4rem; border-block-end: 1px solid var(--reader-border); text-transform: uppercase; }
[data-theme-layout-scope="outline-indicator"] { font-size: 0.8rem; }
.yaml-reader { grid-template-columns: minmax(8rem, 0.28fr) minmax(0, 1fr); }
.json-reader { border: 1px solid var(--reader-border); }
.json-reader .json-key { padding-inline-end: 0.6rem; border-inline-end: 1px solid var(--reader-border); }
.mermaid-fullscreen { border-style: double; border-width: 3px; }
`,
});
