import { COMMON_REFERENCES, defineThemeProfile, features, palette } from './shared.mjs';

const signatureFeatureIds = ['heading-editorial-scale', 'heading-caps-transform', 'type-editorial-line-height'];

export default defineThemeProfile({
  id: 'editorial-contrast',
  name: 'Editorial Contrast',
  description: 'A high-contrast editorial reader with magazine headings, archival quotes, and open body rhythm.',
  tags: ['editorial', 'contrast', 'magazine', 'serif'],
  references: COMMON_REFERENCES.editorial,
  identity: 'Magazine heading scale, asymmetric rules, archival pull quotes, and high-contrast section markers.',
  signatureFeatureIds,
  nonColorFeatureIds: features(...signatureFeatureIds,
    'type-heading-serif', 'type-paragraph-air', 'type-link-underline-thick', 'heading-bottom-rule', 'heading-kicker-spacing',
    'callout-quote-style', 'table-cell-borderless', 'code-soft-panel', 'outline-editorial-list', 'chrome-quiet-flat',
  ),
  typography: {
    body: 'Inter, ui-sans-serif, system-ui, sans-serif', heading: 'Iowan Old Style, Baskerville, Georgia, serif',
    mono: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.8', radius: '0', paragraph: '17px', row: '27px', toolbar: '48px',
  },
  tokens: {
    '--reader-document-padding': '36px 42px 60px', '--reader-h1-size': '42px', '--reader-h2-size': '27px', '--reader-h3-size': '20px',
    '--reader-code-radius': '0', '--reader-table-radius': '0', '--reader-callout-radius': '0', '--reader-panel-padding': '12px',
    '--reader-code-padding': '18px 20px', '--reader-callout-padding': '18px 20px', '--reader-table-cell-padding': '10px 12px',
    '--reader-control-radius': '0', '--reader-shadow': 'none', '--reader-control-shadow': 'none',
  },
  light: palette({ page: '#ededeb', surface: '#fffefa', panel: '#f2f1ed', border: '#b9b8b2', text: '#171716', muted: '#64635f', accent: '#a3242d', accentSoft: '#f0dcdd', code: '#f0efeb', mark: '#f2d64b' }),
  dark: palette({ page: '#0f0f10', surface: '#19191a', panel: '#141415', border: '#454547', text: '#f3f1ec', muted: '#aaa7a0', accent: '#ff6c73', accentSoft: '#48272a', code: '#0b0b0c', mark: '#6e5e13' }),
  css: `
.document-reader { border-block: 6px solid var(--reader-text); }
.document-reader .markdown-heading--h1 { max-inline-size: 18ch; padding-block-end: 0.75rem; border-block-end: 8px solid var(--reader-text); line-height: 1.04; }
.document-reader .markdown-heading--h2 { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0.85rem; text-transform: uppercase; }
.document-reader .markdown-heading--h2::after { content: ""; border-block-start: 2px solid var(--reader-text); }
.document-reader .markdown-heading--h3 { padding-inline-start: 0.65rem; border-inline-start: 5px solid var(--reader-accent); font-style: italic; }
.document-reader .markdown-heading--h4, .document-reader .markdown-heading--h5, .document-reader .markdown-heading--h6 { text-transform: uppercase; }
.document-reader .markdown-link { text-decoration-thickness: 2px; text-decoration-color: var(--reader-accent); }
.document-reader .markdown-quote { border: 0; border-block: 1px solid var(--reader-quote-border); font-family: var(--reader-heading-font); font-size: 1.18em; }
.document-reader .markdown-quote::before { content: "QUOTE"; display: block; margin-block-end: 0.55rem; font-family: var(--reader-font-family); font-size: 0.66rem; font-weight: 800; }
.document-reader hr { border-block-start-width: 4px; }
.document-reader .markdown-table { border-block: 2px solid var(--reader-table-text); }
.document-reader .markdown-table-cell { border-inline: 0; }
.document-reader .markdown-table-cell--head { text-transform: uppercase; }
.document-reader .markdown-code-block { border-inline: 0; border-block-width: 2px; }
.document-reader .callout { border-width: 0 0 0 6px; }
.document-reader .callout-title::before { border-radius: 0; }
.reader-toolbar { border-block-end-width: 3px; }
.reader-toolbar button { border: 0; text-transform: uppercase; font-weight: 800; }
.file-tree__row.is-active [data-theme-layout-scope="file-tree-indicator"] { border-block-end: 2px solid var(--reader-text); border-radius: 0; background: transparent; }
.outline-panel h2 { padding-block-end: 0.5rem; border-block-end: 3px solid var(--reader-text); text-transform: uppercase; }
[data-theme-layout-scope="outline-indicator"].is-active { border-inline-start: 5px solid var(--reader-accent); border-radius: 0; background: transparent; }
.yaml-reader, .json-reader { border-width: 0 0 0 5px; border-style: solid; }
.mermaid-fullscreen { border-width: 2px 0; }
`,
});
