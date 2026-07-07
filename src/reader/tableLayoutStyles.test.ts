import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/reader/App.css'), 'utf8');

function getRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]+)\\}`).exec(css);
  return match?.groups?.body ?? '';
}

function getRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(css.matchAll(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]+)\\}`, 'g')))
    .map((match) => match.groups?.body ?? '');
}

describe('table layout styles', () => {
  it('exposes expanded reader theme tokens on the root reader app', () => {
    const rule = getRule('.reader-app');

    expect(rule).toMatch(/--reader-radius:\s*8px/);
    expect(rule).toMatch(/--reader-panel-bg:\s*#ffffff/);
    expect(rule).toMatch(/--reader-panel-border:\s*#dfe4ea/);
    expect(rule).toMatch(/--reader-accent:\s*#175ddc/);
    expect(rule).toMatch(/--reader-accent-muted:\s*#e8f0ff/);
    expect(rule).toMatch(/--reader-selection-bg:\s*#dbeafe/);
    expect(rule).toMatch(/--reader-heading-text:\s*#18202a/);
    expect(rule).toMatch(/--reader-heading-font:\s*inherit/);
    expect(rule).toMatch(/--reader-heading-border:\s*#d1d9e2/);
    expect(rule).toMatch(/--reader-font-family:\s*Inter/);
    expect(rule).toMatch(/--reader-monospace-font:\s*"SFMono-Regular"/);
    expect(rule).toMatch(/--reader-font-weight:\s*400/);
    expect(rule).toMatch(/--reader-h1-size:\s*30px/);
    expect(rule).toMatch(/--reader-h6-weight:\s*700/);
    expect(rule).toMatch(/--reader-paragraph-spacing:\s*14px/);
    expect(rule).toMatch(/--reader-list-indent:\s*24px/);
    expect(rule).toMatch(/--reader-inline-code-bg:\s*#eef2f5/);
    expect(rule).toMatch(/--reader-inline-code-text:\s*#243141/);
    expect(rule).toMatch(/--reader-code-radius:\s*6px/);
    expect(rule).toMatch(/--reader-code-border:\s*#dfe4ea/);
    expect(rule).toMatch(/--reader-code-font-size:\s*0\.88em/);
    expect(rule).toMatch(/--reader-table-border:\s*#dfe4ea/);
    expect(rule).toMatch(/--reader-table-cell-padding:\s*9px 12px/);
    expect(rule).toMatch(/--reader-table-row-hover:\s*#eef4ff/);
    expect(rule).toMatch(/--reader-callout-bg:\s*#f6f9fc/);
    expect(rule).toMatch(/--reader-callout-radius:\s*8px/);
    expect(rule).toMatch(/--reader-checkbox-bg:\s*#ffffff/);
    expect(rule).toMatch(/--reader-checkbox-checked-bg:\s*#175ddc/);
    expect(rule).toMatch(/--reader-mark-bg:\s*#fff4b8/);
    expect(rule).toMatch(/--reader-tag-bg:\s*#e8f0ff/);
    expect(rule).toMatch(/--reader-tag-radius:\s*999px/);
    expect(rule).toMatch(/--reader-tag-padding:\s*0\.04em 0\.45em/);
    expect(rule).toMatch(/--reader-base-00:\s*#ffffff/);
    expect(rule).toMatch(/--reader-color-blue:\s*#175ddc/);
    expect(rule).toMatch(/--reader-toolbar-bg:\s*#ffffff/);
    expect(rule).toMatch(/--reader-tree-row-hover:\s*#f0f4f8/);
    expect(rule).toMatch(/--reader-syntax-keyword:\s*#7c3aed/);
  });

  it('applies expanded reader theme tokens to the markdown document surface', () => {
    expect(getRule('.document-reader')).toMatch(/border-radius:\s*var\(--reader-radius,\s*8px\)/);
    expect(getRule('.document-reader > div')).toMatch(/color:\s*var\(--reader-text\)/);
    expect(getRule('.document-reader > div')).toMatch(/font-family:\s*var\(--reader-font-family,\s*inherit\)/);
    expect(getRule('.document-reader > div')).toMatch(/font-weight:\s*var\(--reader-font-weight,\s*400\)/);
    expect(getRule('.document-reader ::selection')).toMatch(/background:\s*var\(--reader-selection-bg\)/);

    const headingRule = getRule('.document-reader h1,\n.document-reader h2,\n.document-reader h3,\n.document-reader h4,\n.document-reader h5,\n.document-reader h6');
    expect(headingRule).toMatch(/color:\s*var\(--reader-heading-text\)/);
    expect(headingRule).toMatch(/font-family:\s*var\(--reader-heading-font,\s*inherit\)/);

    expect(getRule('.document-reader h1')).toMatch(/border-bottom:\s*1px solid var\(--reader-heading-border\)/);
    expect(getRule('.document-reader h1')).toMatch(/font-size:\s*var\(--reader-h1-size,\s*30px\)/);
    expect(getRule('.document-reader h1')).toMatch(/font-weight:\s*var\(--reader-h1-weight,\s*750\)/);
    expect(getRule('.document-reader h2')).toMatch(/border-bottom:\s*1px solid var\(--reader-heading-border\)/);
    expect(getRule('.document-reader h2')).toMatch(/font-size:\s*var\(--reader-h2-size,\s*23px\)/);
    expect(getRule('.document-reader h3')).toMatch(/font-size:\s*var\(--reader-h3-size,\s*19px\)/);
    expect(getRule('.document-reader p')).toMatch(/margin:\s*0 0 var\(--reader-paragraph-spacing,\s*14px\)/);
    expect(getRule('.document-reader ul,\n.document-reader ol')).toMatch(/padding-left:\s*var\(--reader-list-indent,\s*24px\)/);
    expect(getRule('.document-reader code')).toMatch(/background:\s*var\(--reader-inline-code-bg\)/);
    expect(getRule('.document-reader code')).toMatch(/color:\s*var\(--reader-inline-code-text\)/);
    expect(getRule('.document-reader code')).toMatch(/font-family:\s*var\(--reader-monospace-font\)/);
    expect(getRule('.document-reader code')).toMatch(/font-size:\s*var\(--reader-code-font-size,\s*0\.88em\)/);
    expect(getRule('.document-reader code')).toMatch(/border-radius:\s*var\(--reader-code-radius,\s*6px\)/);
    expect(getRule('.document-reader pre')).toMatch(/border:\s*1px solid var\(--reader-code-border\)/);
    expect(getRule('.document-reader pre')).toMatch(/border-radius:\s*var\(--reader-code-radius,\s*6px\)/);
    expect(getRule('.document-reader pre')).toMatch(/background:\s*var\(--reader-code-bg\)/);
    expect(getRule('.document-reader th,\n.document-reader td,\n.table-fullscreen__body th,\n.table-fullscreen__body td')).toMatch(/padding:\s*var\(--reader-table-cell-padding,\s*9px 12px\)/);
    expect(getRule('.document-reader th,\n.document-reader td,\n.table-fullscreen__body th,\n.table-fullscreen__body td')).toMatch(/border:\s*1px solid var\(--reader-table-border\)/);
    expect(getRule('.document-reader tr:hover td,\n.table-fullscreen__body tr:hover td')).toMatch(/background:\s*var\(--reader-table-row-hover\)/);
    expect(getRule('.document-reader blockquote')).toMatch(/padding:\s*var\(--reader-quote-padding,\s*2px 0 2px 16px\)/);
    expect(getRule('.document-reader blockquote')).toMatch(/border-radius:\s*var\(--reader-quote-radius,\s*0\)/);
    expect(getRule('.document-reader .callout')).toMatch(/background:\s*var\(--reader-callout-bg\)/);
    expect(getRule('.document-reader .callout')).toMatch(/border:\s*1px solid var\(--reader-callout-border\)/);
    expect(getRule('.document-reader .callout-title')).toMatch(/color:\s*var\(--reader-callout-title\)/);
    expect(getRule('.document-reader mark')).toMatch(/background:\s*var\(--reader-mark-bg\)/);
    expect(getRule('.document-reader mark')).toMatch(/color:\s*var\(--reader-mark-text\)/);
    expect(getRule('.document-reader input[type="checkbox"]')).toMatch(/accent-color:\s*var\(--reader-accent\)/);
    expect(getRule('.document-reader input[type="checkbox"]')).toMatch(/border:\s*1px solid var\(--reader-checkbox-border\)/);
    expect(getRule('.document-reader input[type="checkbox"]:checked')).toMatch(/background:\s*var\(--reader-checkbox-checked-bg\)/);
    expect(getRule('.document-reader li:has(> input[type="checkbox"]:checked)')).toMatch(/color:\s*var\(--reader-task-done\)/);
    expect(getRule('.document-reader .tag,\n.document-reader a[data-tag]')).toMatch(/border-radius:\s*var\(--reader-tag-radius,\s*999px\)/);
    expect(getRule('.document-reader .tag,\n.document-reader a[data-tag]')).toMatch(/padding:\s*var\(--reader-tag-padding,\s*0\.04em 0\.45em\)/);
  });

  it('applies expanded UI chrome tokens to reader controls and navigation', () => {
    expect(getRule('.reader-toolbar')).toMatch(/background:\s*color-mix\(in srgb,\s*var\(--reader-toolbar-bg\) 94%,\s*transparent\)/);
    expect(getRule('button,\nselect')).toMatch(/border-radius:\s*var\(--reader-control-radius,\s*6px\)/);
    expect(getRule('button,\nselect')).toMatch(/background:\s*var\(--reader-control-bg\)/);
    expect(getRule('.file-tree__row:hover')).toMatch(/background:\s*var\(--reader-tree-row-hover\)/);
    expect(getRule('.file-tree__row.is-active,\n.file-tree__row[aria-current="page"]')).toMatch(/background:\s*var\(--reader-tree-row-active\)/);
    expect(getRule('.outline-panel button.is-active')).toMatch(/background:\s*var\(--reader-outline-active-bg\)/);
  });

  it('keeps one horizontal scroll container around rendered markdown tables', () => {
    expect(getRule('.table-fullscreen__table')).toMatch(/overflow-x:\s*auto/);
    expect(getRule('.document-reader table')).not.toMatch(/display:\s*block/);
    expect(getRule('.document-reader table')).not.toMatch(/overflow-x:\s*auto/);
  });

  it('shows edge shadows for horizontally scrollable markdown tables', () => {
    expect(getRule('.table-fullscreen')).toMatch(/--table-scroll-shadow-size:\s*24px/);
    expect(getRule('.table-fullscreen::before')).toMatch(/linear-gradient\(to right/);
    expect(getRule('.table-fullscreen::after')).toMatch(/linear-gradient\(to left/);
    expect(getRule('.table-fullscreen.can-scroll-left::before')).toMatch(/opacity:\s*1/);
    expect(getRule('.table-fullscreen.can-scroll-right::after')).toMatch(/opacity:\s*1/);
  });

  it('shows markdown table row counts in a persistent side summary without taking table height', () => {
    expect(getRule('.table-fullscreen__actions')).toMatch(/gap:\s*6px/);
    expect(getRule('.table-fullscreen__actions')).toMatch(/justify-items:\s*center/);
    expect(getRule('.table-fullscreen__row-count')).toMatch(/position:\s*absolute/);
    expect(getRule('.table-fullscreen__row-count')).toMatch(/z-index:\s*3/);
    expect(getRule('.table-fullscreen__row-count')).toMatch(/right:\s*0/);
    expect(getRule('.table-fullscreen__row-count')).toMatch(/top:\s*0/);
    expect(getRule('.table-fullscreen__row-count')).not.toMatch(/bottom:\s*42px/);
    expect(getRule('.table-fullscreen__row-count')).toMatch(/display:\s*grid/);
    expect(getRule('.table-fullscreen__row-count')).toMatch(/justify-items:\s*center/);
    expect(getRule('.table-fullscreen__row-count')).not.toMatch(/grid-column/);
    expect(getRule('.table-fullscreen__row-count')).not.toMatch(/justify-self/);
    expect(getRule('.table-fullscreen__row-count')).not.toMatch(/visibility:\s*hidden/);
    expect(getRule('.table-fullscreen__row-count')).not.toMatch(/opacity:\s*0/);
    expect(getRule('.table-fullscreen__stat-line')).toMatch(/white-space:\s*nowrap/);
    expect(css).not.toMatch(/\.table-fullscreen:hover \.table-fullscreen__row-count/);
  });

  it('keeps markdown table actions aligned beside the table after moving stats to the top', () => {
    expect(getRule('.table-fullscreen__actions')).not.toMatch(/position:\s*sticky/);
    expect(getRule('.table-fullscreen__actions')).not.toMatch(/bottom:\s*12px/);
    expect(getRule('.table-fullscreen__actions')).toMatch(/align-self:\s*end/);
    expect(getRule('.table-fullscreen__actions')).toMatch(/z-index:\s*4/);
  });

  it('makes disabled reader toolbar buttons visually unavailable', () => {
    const rule = getRule('.reader-toolbar button:disabled');

    expect(rule).toMatch(/cursor:\s*not-allowed/);
    expect(rule).toMatch(/opacity:\s*0\.48/);
  });

  it('shows pressed feedback for reader action buttons', () => {
    expect(css).toMatch(/\.file-drawer__panel-actions button:active:not\(:disabled\)/);
    expect(css).toMatch(/transform:\s*translateY\(1px\)/);
    expect(css).toMatch(/box-shadow:\s*inset 0 1px 2px rgba\(18,\s*26,\s*36,\s*0\.16\)/);
  });

  it('shows disclosure affordances for Arborist file tree directories', () => {
    expect(getRule('.file-tree__disclosure')).toMatch(/flex:\s*0 0 var\(--reader-file-tree-disclosure-size,\s*16px\)/);
    expect(getRule('.file-tree__disclosure::before')).toMatch(/border-right:\s*2px solid currentColor/);
    expect(getRule('.file-tree__disclosure::before')).toMatch(/border-bottom:\s*2px solid currentColor/);
    expect(getRule('.file-tree__disclosure::before')).toMatch(/transform:\s*rotate\(-45deg\)/);
    expect(getRule('.file-tree__row\[aria-expanded="true"\] \.file-tree__disclosure::before')).toMatch(/transform:\s*rotate\(45deg\)/);
    expect(getRule('.file-tree__disclosure')).toMatch(/text-align:\s*center/);
    expect(getRule('.file-tree__row--directory .file-tree__name')).toBe('');
    expect(getRule('.file-tree__disclosure.is-placeholder')).toBe('');
  });

  it('uses VS Code style icons and hover indentation guides for the file tree', () => {
    expect(getRule('.file-tree__icon')).toMatch(/width:\s*var\(--reader-file-tree-icon-size,\s*16px\)/);
    expect(getRule('.file-tree__icon')).toMatch(/height:\s*var\(--reader-file-tree-icon-size,\s*16px\)/);
    expect(getRule('.file-tree__icon--folder')).toBe('');
    expect(getRule('.file-tree__icon--markdown')).toMatch(/--file-tree-icon-color:\s*#519aba/);
    expect(getRule('.file-tree__icon--html')).toMatch(/--file-tree-icon-color:\s*#e37933/);
    expect(getRule('.file-tree__icon--json')).toMatch(/--file-tree-icon-color:\s*#f2c94c/);
    expect(getRule('.file-tree__icon--python')).toMatch(/--file-tree-icon-color:\s*#519aba/);
    expect(getRule('.file-tree__icon--javascript')).toMatch(/--file-tree-icon-color:\s*#b5b531/);
    expect(getRule('.file-tree__icon--word')).toMatch(/--file-tree-icon-color:\s*#4b9cc2/);
    expect(getRule('.file-tree__indent-guides')).toMatch(/width:\s*calc\(var\(--file-tree-depth\) \* var\(--file-tree-indent-size\)\)/);
    expect(getRule('.file-tree__indent-guide')).toMatch(/left:\s*calc\(var\(--file-tree-guide-index\) \* var\(--file-tree-indent-size\) \+ 8px\)/);
    expect(css).toMatch(/\.file-tree--arborist:hover \.file-tree__indent-guide\s*\{[^}]*opacity:\s*1/s);
  });

  it('styles virtualized Arborist file tree rows without resizing content', () => {
    expect(getRule('.file-drawer__panel')).toMatch(/flex:\s*1 1 0/);
    expect(getRule('.file-drawer__panel')).toMatch(/height:\s*auto/);
    expect(getRule('.file-tree')).toMatch(/overflow-x:\s*hidden/);
    expect(getRule('.file-tree')).toMatch(/flex:\s*1 1 0/);
    expect(getRule('.file-tree')).toMatch(/height:\s*auto/);
    expect(getRule('.file-tree--arborist')).toMatch(/flex:\s*1 1 0/);
    expect(getRule('.file-tree--arborist')).toMatch(/height:\s*auto/);
    expect(css).toMatch(/\.file-tree--arborist \[role="tree"\] > div\s*\{[^}]*overflow-x:\s*hidden/s);
    expect(getRule('.file-tree__row')).toMatch(/height:\s*var\(--reader-file-tree-row-height,\s*24px\)/);
    expect(getRule('.file-tree__row')).toMatch(/display:\s*flex/);
    expect(getRule('.file-tree__row:active')).not.toMatch(/transform:\s*translateY/);
    expect(css).toMatch(/\.file-tree__row\.is-active,\n\.file-tree__row\[aria-current="page"\]\s*\{[^}]*background:/s);
    expect(getRule('.file-tree__name')).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('keeps long code lines from widening the reader grid', () => {
    expect(getRule('.document-reader')).toMatch(/min-width:\s*0/);
    expect(getRule('.document-reader > div')).toMatch(/min-width:\s*0/);
    expect(getRule('.document-reader pre')).toMatch(/max-width:\s*100%/);
    expect(getRule('.document-reader pre')).toMatch(/overflow-x:\s*auto/);
  });

  it('keeps Mermaid diagrams scrollable for fullscreen zooming', () => {
    expect(getRule('.mermaid-diagram')).toMatch(/overflow-x:\s*auto/);
    expect(getRule('.mermaid-diagram svg')).toMatch(/max-width:\s*100%/);
    expect(getRule('.mermaid-fullscreen__actions')).toMatch(/gap:\s*6px/);
  });

  it('lets fullscreen Mermaid diagrams fill the available overlay height', () => {
    expect(getRule('.mermaid-fullscreen__panel')).toMatch(/height:\s*100%/);
    expect(getRule('.mermaid-fullscreen__body')).toMatch(/height:\s*100%/);
    expect(getRule('.mermaid-fullscreen__body')).toMatch(/box-sizing:\s*border-box/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen')).toMatch(/position:\s*relative/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen')).toMatch(/display:\s*block/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen')).not.toMatch(/grid-template-columns/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen')).toMatch(/min-height:\s*0/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram')).toMatch(/height:\s*100%/);
  });

  it('places fullscreen Mermaid controls inside the diagram area', () => {
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen__actions')).toMatch(/position:\s*absolute/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen__actions')).toMatch(/right:\s*16px/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen__actions')).toMatch(/bottom:\s*16px/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen__actions')).toMatch(/z-index:\s*4/);
  });

  it('centers fullscreen Mermaid diagrams in the available space', () => {
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram')).toMatch(/display:\s*grid/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram')).toMatch(/place-items:\s*center/);
  });

  it('marks fullscreen Mermaid SVGs as draggable', () => {
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram svg')).toMatch(/cursor:\s*grab/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram svg')).toMatch(/touch-action:\s*none/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram svg.is-dragging')).toMatch(/cursor:\s*grabbing/);
  });

  it('keeps long code lines from widening large-file preview and raw views', () => {
    expect(getRule('.large-document-reader')).toMatch(/min-width:\s*0/);
    expect(getRule('.chunked-markdown-document')).toMatch(/min-width:\s*0/);
    expect(getRule('.chunked-markdown-document > div')).toMatch(/min-width:\s*0/);
    expect(getRule('.raw-source')).toMatch(/min-width:\s*0/);
    expect(getRule('.large-document-reader__virtual-source')).toMatch(/min-width:\s*0/);
    expect(getRule('.large-document-reader__virtual-row code')).toMatch(/min-width:\s*0/);
  });

  it('keeps large markdown table previews readable in the reader grid', () => {
    expect(getRule('.large-markdown-table-preview')).toMatch(/overflow-x:\s*auto/);
    expect(getRule('.large-markdown-table-preview table')).toMatch(/table-layout:\s*fixed/);
    expect(getRule('.large-markdown-table-preview th')).toMatch(/overflow-wrap:\s*anywhere/);
    expect(getRule('.large-markdown-table-preview td')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('keeps markdown table headers visible while scrolling table content', () => {
    expect(css).toMatch(/\.document-reader thead th,[\s\S]*\.table-fullscreen__body thead th,[\s\S]*\.large-markdown-table-preview thead th\s*\{[\s\S]*position:\s*sticky[\s\S]*top:\s*0[\s\S]*z-index:\s*3/s);
    expect(css).toMatch(/\.document-reader thead th,[\s\S]*\.table-fullscreen__body thead th,[\s\S]*\.large-markdown-table-preview thead th\s*\{[\s\S]*background:\s*var\(--reader-table-head\)[\s\S]*box-shadow:\s*0 1px 0 var\(--reader-border\)/s);
    expect(css).toMatch(/@media print[\s\S]*\.document-reader thead th,[\s\S]*\.table-fullscreen__body thead th,[\s\S]*\.large-markdown-table-preview thead th\s*\{[\s\S]*position:\s*static/s);
  });

  it('prints rendered tables inside the printable page instead of clipping wide content', () => {
    expect(css).toMatch(/@media print/);
    expect(css).toMatch(/\.reader-toolbar,[\s\S]*\.file-drawer,[\s\S]*\.outline-panel[\s\S]*display:\s*none !important/);
    expect(css).toMatch(/\.document-reader\s*\{[\s\S]*width:\s*100%[\s\S]*overflow:\s*visible/s);
    expect(css).toMatch(/\.table-fullscreen__table,[\s\S]*\.large-markdown-table-preview\s*\{[\s\S]*max-width:\s*100%[\s\S]*overflow:\s*visible/s);
    expect(css).toMatch(/\.document-reader table,[\s\S]*\.large-markdown-table-preview table\s*\{[\s\S]*width:\s*100%[\s\S]*table-layout:\s*fixed/s);
    expect(css).toMatch(/\.document-reader th,[\s\S]*\.document-reader td,[\s\S]*\.large-markdown-table-preview th,[\s\S]*\.large-markdown-table-preview td\s*\{[\s\S]*overflow-wrap:\s*anywhere[\s\S]*white-space:\s*normal/s);
  });

  it('uses balanced fullscreen table columns without assuming the first column is an id column', () => {
    expect(getRule('.table-fullscreen__body')).not.toMatch(/padding:\s*14px/);
    expect(getRule('.table-fullscreen__body table')).toMatch(/margin:\s*14px/);
    expect(getRule('.table-fullscreen__body table')).toMatch(/width:\s*calc\(100% - 28px\)/);
    expect(getRule('.table-fullscreen__body table')).toMatch(/table-layout:\s*auto/);
    expect(getRule('.table-fullscreen__body :is(th, td):first-child')).toBe('');
    expect(getRules('.table-fullscreen__body th').some((rule) => /max-width:\s*42ch/.test(rule))).toBe(true);
    expect(getRules('.table-fullscreen__body td').some((rule) => /max-width:\s*42ch/.test(rule))).toBe(true);
    expect(getRules('.table-fullscreen__body th').some((rule) => /overflow-wrap:\s*anywhere/.test(rule))).toBe(true);
    expect(getRules('.table-fullscreen__body td').some((rule) => /overflow-wrap:\s*anywhere/.test(rule))).toBe(true);
  });

  it('keeps JSON reader panels inside the reading column', () => {
    expect(getRule('.json-reader')).toMatch(/min-width:\s*0/);
    expect(css).toMatch(/\.json-editor-viewer,\n\.json-reader__editor-loading\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.json-editor-viewer,\n\.json-reader__editor-loading\s*\{[^}]*overflow:\s*hidden/s);
  });
});
