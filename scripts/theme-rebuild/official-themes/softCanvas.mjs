import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['control-pill-buttons', 'tree-active-pill', 'chrome-soft-shadow'];

export default defineThemeProfile({
  id: 'soft-canvas',
  name: 'Soft Canvas',
  description: 'A friendly, rounded workspace with task-first reading rhythm and gentle raised surfaces.',
  tags: ['soft', 'rounded', 'tasks', 'friendly'],
  references: COMMON_REFERENCES.soft,
  identity: 'Pill controls, soft elevated panels, larger tasks, and roomy navigation targets.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'control-rounded-buttons', 'control-soft-shadow', 'callout-card', 'code-inline-pill', 'table-spacious-grid',
    'tree-roomy-rows', 'outline-active-pill', 'chrome-panel-surface', 'mermaid-framed-surface', 'theme-preview-overlay',
  ),
  typography: {
    body: 'Avenir Next, Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Avenir Next, Inter, ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace', lineHeight: '1.72', radius: '14px', paragraph: '15px', row: '32px', toolbar: '60px',
  },
  tokens: {
    '--reader-document-padding': '32px 38px 54px', '--reader-h1-size': '32px', '--reader-h2-size': '24px', '--reader-h3-size': '19px',
    '--reader-code-radius': '10px', '--reader-table-radius': '12px', '--reader-callout-radius': '14px', '--reader-panel-padding': '14px',
    '--reader-code-padding': '17px 19px', '--reader-callout-padding': '15px 17px', '--reader-table-cell-padding': '11px 14px',
    '--reader-control-radius': '999px', '--reader-shadow': '0 16px 38px rgba(53, 62, 68, 0.13)',
    '--reader-control-shadow': '0 5px 14px rgba(53, 62, 68, 0.14)',
  },
  light: palette({ page: '#eef1f0', surface: '#fffefd', panel: '#edf3f1', border: '#cad5d1', text: '#293331', muted: '#687572', accent: '#b34e62', accentSoft: '#f7e4e7', code: '#f3f1f2', extra: { tableHead: '#e5efeb', stripe: '#faf6f7', quote: '#f5e9eb' } }),
  dark: palette({ page: '#181d1c', surface: '#222927', panel: '#1d2523', border: '#3e4d49', text: '#e8efed', muted: '#a5b2ae', accent: '#f08ca0', accentSoft: '#4b3038', code: '#171c1b', mark: '#685a2d', extra: { tableHead: '#2b3a36', stripe: '#202725', quote: '#392c31' } }),
  css: `
.document-reader { border: 1px solid color-mix(in srgb, var(--reader-border) 70%, transparent); box-shadow: var(--reader-shadow); }
.document-reader .markdown-heading--h1 { display: inline-block; padding-block-end: 0.35rem; border-block-end: 6px solid var(--reader-accent-muted); }
.document-reader .markdown-heading--h2::before { content: ""; display: inline-block; inline-size: 0.75rem; block-size: 0.75rem; margin-inline-end: 0.55rem; border-radius: 50%; background: var(--reader-accent); }
.document-reader .task-list-item { align-items: center; padding: 0.35rem 0.55rem; border-radius: 10px; background: var(--reader-panel-bg); }
.document-reader .task-list-item input[type="checkbox"] { inline-size: 1.15rem; block-size: 1.15rem; border-radius: 6px; }
.document-reader .markdown-inline-code { border-radius: 999px; }
.document-reader .markdown-table { border-spacing: 0 5px; }
.document-reader .markdown-table-cell { border: 0; }
.document-reader .markdown-table-row .markdown-table-cell:first-child { border-radius: 9px 0 0 9px; }
.document-reader .markdown-table-row .markdown-table-cell:last-child { border-radius: 0 9px 9px 0; }
.document-reader .callout { border-color: transparent; box-shadow: var(--reader-control-shadow); }
.document-reader .callout-title::before { inline-size: 1rem; block-size: 1rem; }
.document-reader .markdown-code-block { border-color: transparent; box-shadow: inset 0 0 0 1px var(--reader-code-border), var(--reader-control-shadow); }
.reader-toolbar { margin: 8px 12px; border: 1px solid var(--reader-border); border-radius: 18px; }
.reader-toolbar button { border: 0; }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { box-shadow: var(--reader-control-shadow); }
.file-tree__indent-guide { border-inline-start-style: dashed; }
.outline-panel { border: 0; border-radius: 14px 0 0 14px; box-shadow: inset 1px 0 var(--reader-border); }
[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: var(--reader-control-shadow); }
.yaml-reader, .json-reader, .mermaid-fullscreen { border-color: transparent; box-shadow: var(--reader-control-shadow); }
[data-theme-layout-scope="theme-preview-overlay"] { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--reader-accent) 28%, transparent); }
`,
});
