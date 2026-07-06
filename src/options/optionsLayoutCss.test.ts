import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('options layout CSS', () => {
  it('lets the options page use the full viewport width', () => {
    const appCss = readCss('src/options/App.css');
    const appRule = getRule(appCss, '.options-app');

    expect(appRule).toContain('width: 100%');
    expect(appRule).toContain('max-width: none');
    expect(appRule).not.toContain('max-width: 900px');
  });

  it('lays out theme catalog items as a responsive preview grid', () => {
    const themeCss = readCss('src/options/ThemeSettings.css');
    const catalogListRule = getRule(themeCss, '.theme-catalog-list');
    const previewRule = getRule(themeCss, '.theme-remote-preview');

    expect(catalogListRule).toContain('grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))');
    expect(previewRule).toContain('aspect-ratio: 16 / 9');
    expect(previewRule).toContain('width: 100%');
  });

  it('uses the expanded reader theme tokens in theme previews', () => {
    const themeCss = readCss('src/options/ThemeSettings.css');
    const previewRule = getRule(themeCss, '.theme-preview');
    const documentRule = getRule(themeCss, '.theme-preview__document');
    const headingRule = getRule(themeCss, '.theme-preview__document h1');

    expect(previewRule).toContain('--reader-radius: 8px');
    expect(previewRule).toContain('--reader-panel-bg: #ffffff');
    expect(previewRule).toContain('--reader-accent: #175ddc');
    expect(previewRule).toContain('--reader-selection-bg: #dbeafe');
    expect(previewRule).toContain('--reader-heading-text: #18202a');
    expect(previewRule).toContain('--reader-heading-font: inherit');
    expect(previewRule).toContain('--reader-inline-code-bg: #eef2f5');
    expect(previewRule).toContain('--reader-mark-bg: #fff4b8');
    expect(documentRule).toContain('border-radius: var(--reader-radius, 8px)');
    expect(headingRule).toContain('color: var(--reader-heading-text)');
    expect(headingRule).toContain('font-family: var(--reader-heading-font, inherit)');
    expect(headingRule).toContain('border-bottom: 1px solid var(--reader-heading-border)');
    expect(getRule(themeCss, '.theme-preview__document code')).toContain('background: var(--reader-inline-code-bg)');
    expect(getRule(themeCss, '.theme-preview__document mark')).toContain('background: var(--reader-mark-bg)');
  });
});

function readCss(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function getRule(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}
