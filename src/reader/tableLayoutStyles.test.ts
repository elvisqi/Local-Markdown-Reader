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
});
