import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['callout-title-band', 'table-zebra-structure', 'heading-block-surface'];

export default defineThemeProfile({
  id: 'topaz-workbench',
  name: 'Topaz Workbench',
  description: 'A component-rich knowledge workbench with expressive callouts, tables, and structured readers.',
  tags: ['colorful', 'knowledge-base', 'tables', 'callouts'],
  references: COMMON_REFERENCES.topaz,
  identity: 'Layered knowledge panels, typed callout title bands, and prominent table and diagram controls.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'callout-card', 'callout-icon-chip', 'callout-typed-shape', 'table-spacious-grid', 'table-fullscreen-toolbar',
    'code-header-strip', 'tree-active-pill', 'outline-active-pill', 'chrome-floating-actions', 'yaml-summary-panel',
  ),
  typography: {
    body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Avenir Next, Inter, ui-sans-serif, system-ui, sans-serif',
    mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.68', radius: '10px', paragraph: '14px', row: '28px', toolbar: '56px',
  },
  tokens: {
    '--reader-document-padding': '28px 34px 52px', '--reader-h1-size': '32px', '--reader-h2-size': '24px',
    '--reader-h3-size': '19px', '--reader-code-radius': '8px', '--reader-table-radius': '10px',
    '--reader-callout-radius': '10px', '--reader-panel-padding': '12px', '--reader-code-padding': '20px 18px 16px',
    '--reader-callout-padding': '0 16px 14px', '--reader-table-cell-padding': '10px 12px', '--reader-control-radius': '8px',
    '--reader-shadow': '0 14px 34px rgba(18, 53, 71, 0.14)', '--reader-control-shadow': '0 4px 12px rgba(18, 53, 71, 0.16)',
  },
  light: palette({ page: '#eef7f7', surface: '#ffffff', panel: '#e7f1f4', border: '#b9d4dc', text: '#17323b', muted: '#5c7480', accent: '#087f8c', accentSoft: '#d6f1ef', code: '#edf4f6', extra: { tableHead: '#dceff2', stripe: '#f4fbfa', quote: '#ecf7f4' } }),
  dark: palette({ page: '#111d24', surface: '#172832', panel: '#13232c', border: '#31515d', text: '#e0f0f2', muted: '#9db5bd', accent: '#55d4c7', accentSoft: '#1d474a', code: '#0d1b22', mark: '#66572a', extra: { tableHead: '#20404a', stripe: '#152a33', quote: '#19353a' } }),
  css: `
.document-reader { box-shadow: var(--reader-shadow); }
.document-reader .markdown-heading--h1 { padding: 0.45rem 0.65rem; border-inline-start: 6px solid var(--reader-accent); border-radius: 0 var(--reader-radius) var(--reader-radius) 0; background: var(--reader-accent-muted); }
.document-reader .markdown-heading--h2 { display: inline-flex; padding: 0.25rem 0.7rem; border-radius: 999px; background: var(--reader-accent-muted); }
.document-reader .markdown-heading--h3::before { content: "◆"; margin-inline-end: 0.45rem; font-size: 0.62em; }
.document-reader .markdown-table { border-spacing: 3px; }
.document-reader .markdown-table-cell { border: 0; border-radius: 5px; }
.document-reader .markdown-table-cell--head { box-shadow: inset 0 -2px var(--reader-accent); }
.document-reader .callout { background-clip: padding-box; }
.document-reader .callout-title { margin: 0 -16px; padding: 10px 16px; border-block-end: 1px solid var(--reader-callout-border); background: var(--reader-accent-muted); }
.document-reader .callout-title::before { display: grid; place-items: center; inline-size: 1.25rem; block-size: 1.25rem; border-radius: 6px; }
.document-reader .callout-warning { border-start-start-radius: 2px; }
.document-reader .callout-tip { border-end-end-radius: 2px; }
.document-reader .markdown-code-block { padding-block-start: 2.25rem; box-shadow: inset 0 1.8rem var(--reader-panel-bg); }
.document-reader .markdown-code-block::after { content: ""; display: block; inline-size: 0.55rem; block-size: 0.55rem; margin: -1.65rem 0 1rem; border-radius: 50%; background: var(--reader-color-red); box-shadow: 0.9rem 0 var(--reader-color-yellow), 1.8rem 0 var(--reader-color-green); }
.reader-toolbar { margin: 8px 10px 0; border: 1px solid var(--reader-border); border-radius: var(--reader-radius); }
.reader-toolbar button { border: 1px solid transparent; }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { box-shadow: 0 3px 10px color-mix(in srgb, var(--reader-accent) 20%, transparent); }
.outline-panel { border: 0; }
[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: inset 0 0 0 1px var(--reader-accent); }
.yaml-reader { grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); box-shadow: var(--reader-control-shadow); }
.json-reader { border: 1px solid var(--reader-border); box-shadow: var(--reader-control-shadow); }
[data-theme-layout-scope="table-actions"], [data-theme-layout-scope="table-fullscreen-actions"], [data-theme-layout-scope="mermaid-actions"] { border: 1px solid var(--reader-border); }
`,
});
