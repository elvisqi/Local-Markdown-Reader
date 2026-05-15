import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/reader/App.css'), 'utf8');

function getRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]+)\\}`).exec(css);
  return match?.groups?.body ?? '';
}

describe('table layout styles', () => {
  it('keeps one horizontal scroll container around rendered markdown tables', () => {
    expect(getRule('.table-fullscreen__table')).toMatch(/overflow-x:\s*auto/);
    expect(getRule('.document-reader table')).not.toMatch(/display:\s*block/);
    expect(getRule('.document-reader table')).not.toMatch(/overflow-x:\s*auto/);
  });

  it('makes disabled reader toolbar buttons visually unavailable', () => {
    const rule = getRule('.reader-toolbar button:disabled');

    expect(rule).toMatch(/cursor:\s*not-allowed/);
    expect(rule).toMatch(/opacity:\s*0\.48/);
  });

  it('keeps long code lines from widening the reader grid', () => {
    expect(getRule('.document-reader')).toMatch(/min-width:\s*0/);
    expect(getRule('.document-reader > div')).toMatch(/min-width:\s*0/);
    expect(getRule('.document-reader pre')).toMatch(/max-width:\s*100%/);
    expect(getRule('.document-reader pre')).toMatch(/overflow-x:\s*auto/);
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
});
