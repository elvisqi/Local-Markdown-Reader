import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['chrome-glow-frame', 'callout-glow-border', 'control-glow-focus'];

export default defineThemeProfile({
  id: 'neon-vault',
  name: 'Neon Vault',
  description: 'A restrained cyber workspace with luminous focus, floating diagram controls, and dark console surfaces.',
  tags: ['cyber', 'neon', 'glow', 'dark-light'],
  references: COMMON_REFERENCES.neon,
  identity: 'Luminous focus treatment, neon edge emphasis, floating controls, and high-contrast active rails.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-heading-display', 'heading-left-rail', 'code-terminal-block', 'table-sticky-header-frame', 'chrome-floating-actions',
    'tree-active-left-bar', 'outline-active-rail', 'mermaid-framed-surface', 'mermaid-floating-controls', 'selection-themed',
  ),
  typography: {
    body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Rajdhani, Inter, ui-sans-serif, system-ui, sans-serif',
    mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.62', radius: '3px', paragraph: '13px', row: '26px', toolbar: '50px',
  },
  tokens: {
    '--reader-document-padding': '28px 34px 48px', '--reader-h1-size': '34px', '--reader-h2-size': '24px', '--reader-h3-size': '19px',
    '--reader-code-radius': '3px', '--reader-table-radius': '3px', '--reader-callout-radius': '3px', '--reader-panel-padding': '10px',
    '--reader-code-padding': '16px 18px', '--reader-callout-padding': '12px 14px', '--reader-table-cell-padding': '8px 10px',
    '--reader-control-radius': '3px', '--reader-shadow': '0 0 28px rgba(0, 213, 201, 0.12)', '--reader-control-shadow': '0 0 14px rgba(0, 213, 201, 0.18)',
  },
  light: palette({ page: '#e8edef', surface: '#f8fbfc', panel: '#e3ebee', border: '#9db3ba', text: '#172b32', muted: '#566f78', accent: '#007f83', accentSoft: '#ccebed', code: '#dfe8eb', extra: { tableHead: '#cfe2e6', stripe: '#eff5f6', quote: '#d9ecec' } }),
  dark: palette({ page: '#05090f', surface: '#0a121b', panel: '#071019', border: '#173c49', text: '#d8f4f3', muted: '#7ba3aa', accent: '#33f0dc', accentSoft: '#0d3a3b', code: '#02060a', mark: '#5c4f10', extra: { tableHead: '#0d2932', stripe: '#07131a', quote: '#0a272b' } }),
  css: `
.reader-layout { box-shadow: inset 0 0 0 1px var(--reader-border), var(--reader-shadow); }
.document-reader { text-shadow: 0 0 12px color-mix(in srgb, var(--reader-accent) 8%, transparent); }
.document-reader .markdown-heading { text-shadow: 0 0 14px color-mix(in srgb, var(--reader-accent) 36%, transparent); }
.document-reader .markdown-heading--h1 { padding-inline-start: 0.7rem; border-inline-start: 4px solid var(--reader-accent); }
.document-reader .markdown-heading--h2 { display: flex; align-items: center; gap: 0.65rem; }
.document-reader .markdown-heading--h2::after { content: ""; flex: 1; border-block-start: 1px solid var(--reader-accent); box-shadow: 0 0 8px var(--reader-accent); }
.document-reader .markdown-link { text-shadow: 0 0 8px color-mix(in srgb, var(--reader-accent) 55%, transparent); }
.document-reader .markdown-code-block { border-color: var(--reader-accent); box-shadow: inset 0 0 18px color-mix(in srgb, var(--reader-accent) 9%, transparent), 0 0 12px color-mix(in srgb, var(--reader-accent) 22%, transparent); }
.document-reader .markdown-table-wrapper { border: 1px solid var(--reader-accent); box-shadow: 0 0 12px color-mix(in srgb, var(--reader-accent) 18%, transparent); }
.document-reader .markdown-table-cell--head { box-shadow: inset 0 -2px var(--reader-accent); }
.document-reader .callout { border-color: var(--reader-accent); box-shadow: inset 0 0 16px color-mix(in srgb, var(--reader-accent) 8%, transparent), 0 0 10px color-mix(in srgb, var(--reader-accent) 20%, transparent); }
.document-reader .callout-title::before { border-radius: 1px; box-shadow: 0 0 9px var(--reader-accent); }
.reader-toolbar { border-color: var(--reader-accent); box-shadow: 0 0 14px color-mix(in srgb, var(--reader-accent) 18%, transparent); }
.reader-toolbar button:focus-visible { box-shadow: 0 0 12px var(--reader-accent); }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { box-shadow: inset 3px 0 var(--reader-accent), 0 0 10px color-mix(in srgb, var(--reader-accent) 18%, transparent); }
[data-theme-layout-scope="outline-indicator"].is-active { box-shadow: inset 3px 0 var(--reader-accent); }
.mermaid-fullscreen { border-color: var(--reader-accent); box-shadow: inset 0 0 20px color-mix(in srgb, var(--reader-accent) 8%, transparent); }
[data-theme-layout-scope="mermaid-actions"] { border: 1px solid var(--reader-accent); box-shadow: 0 0 14px color-mix(in srgb, var(--reader-accent) 28%, transparent); }
[data-theme-layout-scope="table-actions"], [data-theme-layout-scope="table-fullscreen-actions"] { border: 1px solid var(--reader-accent); box-shadow: 0 0 14px color-mix(in srgb, var(--reader-accent) 28%, transparent); }
.yaml-reader, .json-reader { box-shadow: inset 0 0 0 1px var(--reader-accent); }
`,
});
