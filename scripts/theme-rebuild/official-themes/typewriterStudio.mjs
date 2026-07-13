import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['type-body-serif', 'type-first-line-indent', 'callout-quote-style'];

export default defineThemeProfile({
  id: 'typewriter-studio',
  name: 'Typewriter Studio',
  description: 'A manuscript-oriented theme with print rhythm, pull quotes, and a quiet typewriter desk.',
  tags: ['serif', 'writing', 'paper', 'editorial'],
  references: COMMON_REFERENCES.typewriter,
  identity: 'Serif manuscript body, deliberate paragraph rhythm, pull quotes, and book-style tables.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-heading-mono', 'type-editorial-line-height', 'type-link-underline-thick', 'heading-editorial-scale',
    'heading-kicker-spacing', 'table-spacious-grid', 'code-editor-frame', 'outline-editorial-list',
    'chrome-roomy-sidebar', 'selection-themed',
  ),
  typography: {
    body: 'Georgia, "Times New Roman", Times, serif', heading: '"Courier New", Courier, monospace',
    mono: '"Courier New", Courier, monospace', lineHeight: '1.88', radius: '2px', paragraph: '18px', row: '28px', toolbar: '50px',
  },
  tokens: {
    '--reader-document-padding': '38px 44px 60px', '--reader-h1-size': '34px', '--reader-h2-size': '24px',
    '--reader-h3-size': '19px', '--reader-list-indent': '30px', '--reader-quote-padding': '18px 26px',
    '--reader-code-radius': '1px', '--reader-table-radius': '0', '--reader-callout-radius': '1px',
    '--reader-panel-padding': '14px', '--reader-code-padding': '18px 20px', '--reader-callout-padding': '16px 20px',
    '--reader-table-cell-padding': '11px 14px', '--reader-control-radius': '2px',
    '--reader-shadow': '0 10px 28px rgba(54, 43, 29, 0.12)', '--reader-control-shadow': '0 1px 0 rgba(54, 43, 29, 0.16)',
  },
  light: palette({ page: '#e9e4da', surface: '#fffdf7', panel: '#f3efe6', border: '#cfc5b5', text: '#302c26', muted: '#756d62', accent: '#8a3f34', accentSoft: '#efe0d8', code: '#f3efe7', mark: '#f3dda3' }),
  dark: palette({ page: '#1d1a17', surface: '#28231e', panel: '#211d19', border: '#51483e', text: '#eee6d8', muted: '#b0a596', accent: '#e09a85', accentSoft: '#49312b', code: '#191714', mark: '#6a572c' }),
  css: `
.document-reader { border: 1px solid var(--reader-border); box-shadow: var(--reader-shadow); }
.document-reader .markdown-paragraph + .markdown-paragraph { text-indent: 1.7em; }
.document-reader .markdown-heading { font-weight: 700; }
.document-reader .markdown-heading--h1 { text-align: center; text-transform: uppercase; }
.document-reader .markdown-heading--h1::after { content: ""; display: block; inline-size: 5rem; margin: 0.75rem auto 0; border-block-start: 2px solid currentColor; }
.document-reader .markdown-heading--h2 { display: flex; align-items: center; gap: 0.7rem; }
.document-reader .markdown-heading--h2::after { content: ""; flex: 1; border-block-start: 1px solid var(--reader-heading-border); }
.document-reader .markdown-heading--h3 { font-family: var(--reader-font-family); font-style: italic; }
.document-reader .markdown-link { text-decoration-thickness: 2px; }
.document-reader .markdown-quote { position: relative; border: 0; font-size: 1.08em; font-style: italic; text-align: center; }
.document-reader .markdown-quote::before { content: open-quote; display: block; block-size: 1.6rem; font-size: 3.5rem; line-height: 1; opacity: 0.25; }
.document-reader .markdown-table { border-block: 2px solid var(--reader-table-border); }
.document-reader .markdown-table-cell { border-inline: 0; }
.document-reader .markdown-table-cell--head { font-family: var(--reader-heading-font); text-transform: uppercase; }
.document-reader .markdown-code-block { border-inline: 0; border-block-style: dashed; }
.document-reader .markdown-inline-code { border-block-end: 1px dotted var(--reader-code-border); }
.document-reader .callout { border-inline: 0; border-block: 1px solid var(--reader-callout-border); }
.reader-toolbar { border-block-end-style: double; border-block-end-width: 3px; }
.reader-toolbar button { font-family: var(--reader-heading-font); }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { text-decoration: underline; text-underline-offset: 0.22em; }
.outline-panel h2 { font-family: var(--reader-heading-font); text-transform: uppercase; }
[data-theme-layout-scope="outline-indicator"].is-active { font-style: italic; }
.yaml-reader, .json-reader { border-style: dashed; }
`,
});
