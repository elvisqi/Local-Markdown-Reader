import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['type-body-mono', 'heading-command-prefix', 'chrome-terminal-frame'];

export default defineThemeProfile({
  id: 'terminal-grid',
  name: 'Terminal Grid',
  description: 'A monospace technical reader with command headings, console frames, and compact grid tables.',
  tags: ['terminal', 'monospace', 'technical', 'grid'],
  references: COMMON_REFERENCES.terminal,
  identity: 'Monospace information system, command-prefixed headings, square data grids, and sharp focus states.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-heading-mono', 'type-compact-line-height', 'heading-numbered-marker', 'table-dense-grid', 'code-terminal-block',
    'code-grid-border', 'control-sharp-buttons', 'tree-indent-strong', 'outline-active-rail', 'chrome-border-grid',
  ),
  typography: {
    body: 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    heading: 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    mono: 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.56', radius: '0', paragraph: '11px', row: '23px', toolbar: '44px',
  },
  tokens: {
    '--reader-document-padding': '24px 28px 42px', '--reader-h1-size': '28px', '--reader-h2-size': '21px', '--reader-h3-size': '17px',
    '--reader-code-radius': '0', '--reader-table-radius': '0', '--reader-callout-radius': '0', '--reader-panel-padding': '8px',
    '--reader-code-padding': '34px 14px 14px', '--reader-callout-padding': '10px 12px', '--reader-table-cell-padding': '6px 8px',
    '--reader-control-radius': '0', '--reader-shadow': 'none', '--reader-control-shadow': 'none',
  },
  light: palette({ page: '#e5e7e2', surface: '#f8faf5', panel: '#e8ece5', border: '#9aa49a', text: '#1d2a21', muted: '#536359', accent: '#087d46', accentSoft: '#d4eadb', code: '#17221b', extra: { tableHead: '#d6ded5', stripe: '#eef2ec', quote: '#e1e9e1' } }),
  dark: palette({ page: '#080d0a', surface: '#0d1510', panel: '#0a110d', border: '#2f4a38', text: '#c9e5d1', muted: '#7fa18a', accent: '#62e69a', accentSoft: '#163424', code: '#050806', mark: '#4f4b1c', extra: { tableHead: '#14251a', stripe: '#0b130e', quote: '#102018' } }),
  css: `
.reader-layout { border: 1px solid var(--reader-border); }
.document-reader { border-inline: 1px solid var(--reader-border); }
.document-reader .markdown-heading--h1::before { content: ">"; margin-inline-end: 0.65rem; color: var(--reader-accent); }
.document-reader .markdown-heading--h2::before { content: "##"; margin-inline-end: 0.55rem; color: var(--reader-muted); }
.document-reader .markdown-heading--h3::before { content: "::"; margin-inline-end: 0.5rem; color: var(--reader-muted); }
.document-reader .markdown-heading { border-block-end: 1px dashed var(--reader-heading-border); padding-block-end: 0.25rem; }
.document-reader .markdown-link { text-decoration-style: dashed; }
.document-reader .markdown-quote { border: 1px dashed var(--reader-quote-border); }
.document-reader .markdown-code-block { border: 1px solid var(--reader-accent); box-shadow: inset 0 0 0 3px var(--reader-code-bg); }
.document-reader .markdown-code-block::before { content: "$ output"; display: block; margin: -1.6rem -0.55rem 1rem; padding: 7px 10px; border-block-end: 1px solid var(--reader-code-border); }
.document-reader .markdown-inline-code { border: 1px solid var(--reader-code-border); }
.document-reader .markdown-table { border: 1px solid var(--reader-table-border); }
.document-reader .markdown-table-cell { border-inline-end: 1px solid var(--reader-table-border); }
.document-reader .markdown-table-cell:last-child { border-inline-end: 0; }
.document-reader .callout { border-style: dashed; }
.document-reader .callout-title::before { border-radius: 0; }
.reader-toolbar { border-block-end-style: dashed; }
.reader-toolbar button { border: 1px solid var(--reader-border); text-transform: uppercase; }
.file-tree { border-inline-end: 1px dashed var(--reader-border); }
.file-tree__indent-guide { border-inline-start-style: dashed; }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { box-shadow: inset 3px 0 var(--reader-accent); }
.outline-panel { border-inline-start-style: dashed; }
[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: inset 3px 0 var(--reader-accent); }
.yaml-reader, .json-reader, .mermaid-fullscreen { border-style: dashed; }
`,
});
