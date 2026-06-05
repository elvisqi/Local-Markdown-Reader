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
    expect(getRule('.file-tree__disclosure')).toMatch(/flex:\s*0 0 0\.9rem/);
    expect(getRule('.file-tree__disclosure')).toMatch(/text-align:\s*center/);
  });

  it('styles virtualized Arborist file tree rows without resizing content', () => {
    expect(getRule('.file-tree')).toMatch(/overflow-x:\s*hidden/);
    expect(getRule('.file-tree--arborist')).toMatch(/flex:\s*1 1 auto/);
    expect(getRule('.file-tree__row')).toMatch(/height:\s*24px/);
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
    expect(getRule('.mermaid-fullscreen__body .mermaid-fullscreen')).toMatch(/min-height:\s*0/);
    expect(getRule('.mermaid-fullscreen__body .mermaid-diagram')).toMatch(/height:\s*100%/);
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

  it('uses balanced fullscreen table columns without assuming the first column is an id column', () => {
    expect(getRule('.table-fullscreen__body table')).toMatch(/width:\s*100%/);
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
