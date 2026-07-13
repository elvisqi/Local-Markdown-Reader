import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['chrome-quiet-flat', 'heading-quiet-scale', 'tree-low-noise'];

export default defineThemeProfile({
  id: 'quiet-focus',
  name: 'Quiet Focus',
  description: 'A restrained, low-noise reading theme informed by Minimal, Shimmering Focus, and Notation.',
  tags: ['minimal', 'focus', 'technical', 'light-dark'],
  references: COMMON_REFERENCES.quiet,
  identity: 'Borderless reading surface, quiet heading scale, and navigation that recedes until used.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-body-sans', 'type-paragraph-air', 'callout-low-noise', 'table-cell-borderless',
    'code-soft-panel', 'outline-quiet-hover', 'control-sharp-buttons', 'chrome-scrollbar-themed',
    'fullscreen-table-corner-actions', 'selection-themed',
  ),
  typography: {
    body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: 'Inter, ui-sans-serif, system-ui, sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    lineHeight: '1.76', radius: '4px', paragraph: '15px', row: '24px', toolbar: '46px',
  },
  tokens: {
    '--reader-document-padding': '30px 36px 52px', '--reader-h1-size': '29px', '--reader-h2-size': '22px',
    '--reader-h3-size': '18px', '--reader-code-radius': '4px', '--reader-table-radius': '2px',
    '--reader-callout-radius': '2px', '--reader-panel-padding': '8px', '--reader-code-padding': '15px 17px',
    '--reader-callout-padding': '10px 14px', '--reader-table-cell-padding': '9px 10px',
    '--reader-shadow': 'none', '--reader-control-shadow': 'none', '--reader-control-radius': '3px',
  },
  light: palette({ page: '#f5f6f7', surface: '#ffffff', panel: '#f8f9fa', border: '#dfe3e7', text: '#24272b', muted: '#6b727a', accent: '#365f91', accentSoft: '#e9f0f7', code: '#f4f5f6' }),
  dark: palette({ page: '#17191c', surface: '#1d2024', panel: '#1a1d20', border: '#34383e', text: '#e4e7eb', muted: '#9aa1a9', accent: '#8eb6de', accentSoft: '#263746', code: '#16181b', mark: '#5f5423' }),
  css: `
.document-reader { border: 0; box-shadow: none; }
.document-reader .markdown-heading { max-inline-size: 34ch; }
.document-reader .markdown-heading--h1 { margin-block-start: 1.2rem; }
.document-reader .markdown-heading--h2 { padding-block-end: 0.35rem; border-block-end: 1px solid var(--reader-heading-border); }
.document-reader .markdown-heading--h3 { font-weight: 650; }
.document-reader .markdown-quote { border-inline-start-width: 2px; background: transparent; }
.document-reader .markdown-code-block { border-color: transparent; box-shadow: inset 0 0 0 1px var(--reader-code-border); }
.document-reader .markdown-table-cell { border-inline: 0; }
.document-reader .markdown-table-row:last-child .markdown-table-cell { border-block-end: 0; }
.document-reader .callout { border-width: 0 0 0 3px; background: transparent; }
.document-reader .callout-title::before { inline-size: 0.42rem; block-size: 0.42rem; }
.reader-toolbar { border-block-end-color: transparent; box-shadow: inset 0 -1px var(--reader-border); }
.reader-toolbar button { border: 0; background: transparent; }
.file-tree__indent-guide { border-inline-start-color: transparent; }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { box-shadow: inset 2px 0 var(--reader-accent); }
.outline-panel { box-shadow: none; }
[data-theme-layout-scope="outline-indicator"].is-active { background: transparent; box-shadow: inset 2px 0 var(--reader-accent); }
.yaml-reader, .json-reader { border-color: transparent; box-shadow: inset 0 0 0 1px var(--reader-border); }
.mermaid-fullscreen { border-color: transparent; box-shadow: inset 0 0 0 1px var(--reader-border); }
`,
});
