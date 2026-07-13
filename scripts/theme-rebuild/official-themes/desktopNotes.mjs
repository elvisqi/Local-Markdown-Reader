import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['chrome-native-toolbar', 'chrome-resize-handle-themed', 'tree-active-left-bar'];

export default defineThemeProfile({
  id: 'desktop-notes',
  name: 'Desktop Notes',
  description: 'A native desktop document workspace with segmented controls, panel dividers, and compact navigation.',
  tags: ['desktop', 'native', 'productivity', 'clean'],
  references: COMMON_REFERENCES.desktop,
  identity: 'Native application chrome, segmented toolbar controls, sidebar selection rails, and compact outline navigation.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-body-sans', 'chrome-panel-surface', 'chrome-compact-sidebar', 'control-rounded-buttons', 'control-soft-shadow',
    'table-sticky-header-frame', 'callout-left-rail', 'code-editor-frame', 'outline-compact-list', 'table-fullscreen-toolbar',
  ),
  typography: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
    mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.66', radius: '7px', paragraph: '13px', row: '26px', toolbar: '52px',
  },
  tokens: {
    '--reader-document-padding': '28px 34px 48px', '--reader-h1-size': '30px', '--reader-h2-size': '22px', '--reader-h3-size': '18px',
    '--reader-code-radius': '6px', '--reader-table-radius': '7px', '--reader-callout-radius': '7px', '--reader-panel-padding': '10px',
    '--reader-code-padding': '15px 17px', '--reader-callout-padding': '11px 14px', '--reader-table-cell-padding': '8px 11px',
    '--reader-control-radius': '6px', '--reader-shadow': '0 1px 0 rgba(0, 0, 0, 0.08)', '--reader-control-shadow': '0 1px 2px rgba(0, 0, 0, 0.14)',
  },
  light: palette({ page: '#e8e9eb', surface: '#ffffff', panel: '#f1f2f4', border: '#cdd0d5', text: '#25272b', muted: '#6b7078', accent: '#1769d2', accentSoft: '#dceafa', code: '#f4f5f7' }),
  dark: palette({ page: '#17181a', surface: '#242528', panel: '#1e1f22', border: '#3c3e43', text: '#eceef1', muted: '#a7abb2', accent: '#6da8f2', accentSoft: '#263c58', code: '#151619', mark: '#64572b' }),
  css: `
.reader-layout { border-block-start: 1px solid var(--reader-border); }
.document-reader { border-radius: 0; }
.document-reader .markdown-heading--h1 { margin-block-start: 0.8rem; }
.document-reader .markdown-heading--h2 { padding-block-end: 0.3rem; border-block-end: 1px solid var(--reader-heading-border); }
.document-reader .markdown-quote { border-inline-start-width: 4px; }
.document-reader .markdown-code-block { box-shadow: inset 0 1px var(--reader-surface); }
.document-reader .markdown-table-wrapper { border: 1px solid var(--reader-table-border); }
.document-reader .markdown-table-cell { border-inline-end: 1px solid var(--reader-table-border); }
.document-reader .markdown-table-cell:last-child { border-inline-end: 0; }
.document-reader .callout { border-inline-start-width: 4px; }
.reader-toolbar { display: flex; align-items: center; border-block-end-width: 1px; box-shadow: 0 1px 3px rgb(0 0 0 / 10%); }
[data-theme-layout-scope="toolbar-group"] { padding: 2px; border: 1px solid var(--reader-border); border-radius: 8px; background: var(--reader-surface); }
.reader-toolbar button { border: 0; box-shadow: none; }
.reader-toolbar button + button { border-inline-start: 1px solid var(--reader-border); border-radius: 0; }
.file-tree { border-inline-end: 1px solid var(--reader-border); }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { border-radius: 3px; box-shadow: inset 3px 0 var(--reader-accent); }
.file-tree__disclosure { opacity: 0.72; }
.outline-panel { border-inline-start-width: 1px; }
.outline-panel__resize-handle { background: var(--reader-border); }
[data-theme-layout-scope="outline-indicator"].is-active { border-radius: 4px; }
.yaml-reader, .json-reader { border: 1px solid var(--reader-border); }
[data-theme-layout-scope="table-fullscreen-actions"] { border: 1px solid var(--reader-border); }
`,
});
