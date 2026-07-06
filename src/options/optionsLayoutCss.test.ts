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
    expect(previewRule).toContain('--reader-font-family: Inter');
    expect(previewRule).toContain('--reader-h1-size: 22px');
    expect(previewRule).toContain('--reader-paragraph-spacing: 12px');
    expect(previewRule).toContain('--reader-table-cell-padding: 6px 8px');
    expect(previewRule).toContain('--reader-code-radius: 6px');
    expect(previewRule).toContain('--reader-callout-bg: #f6f9fc');
    expect(previewRule).toContain('--reader-checkbox-checked-bg: #175ddc');
    expect(previewRule).toContain('--reader-mark-bg: #fff4b8');
    expect(previewRule).toContain('--reader-tag-radius: 999px');
    expect(previewRule).toContain('--reader-base-00: #ffffff');
    expect(previewRule).toContain('--reader-color-blue: #175ddc');
    expect(documentRule).toContain('border-radius: var(--reader-radius, 8px)');
    expect(documentRule).toContain('font-family: var(--reader-font-family, inherit)');
    expect(headingRule).toContain('color: var(--reader-h1-color, var(--reader-heading-text))');
    expect(headingRule).toContain('font-family: var(--reader-heading-font, inherit)');
    expect(headingRule).toContain('border-bottom: 1px solid var(--reader-heading-border)');
    expect(headingRule).toContain('font-size: var(--reader-h1-size, 22px)');
    expect(getRule(themeCss, '.theme-preview__document p')).toContain('margin: 0 0 var(--reader-paragraph-spacing, 12px)');
    expect(getRule(themeCss, '.theme-preview__document code')).toContain('background: var(--reader-inline-code-bg)');
    expect(getRule(themeCss, '.theme-preview__document code')).toContain('font-family: var(--reader-monospace-font)');
    expect(getRule(themeCss, '.theme-preview__document blockquote')).toContain('padding: var(--reader-quote-padding, 8px 12px)');
    expect(getRule(themeCss, '.theme-preview__document blockquote')).toContain('border-radius: var(--reader-quote-radius, 0)');
    expect(getRule(themeCss, '.theme-preview__document input[type="checkbox"]')).toContain('border: 1px solid var(--reader-checkbox-border)');
    expect(getRule(themeCss, '.theme-preview__document input[type="checkbox"]:checked')).toContain('background: var(--reader-checkbox-checked-bg)');
    expect(getRule(themeCss, '.theme-preview__document mark')).toContain('background: var(--reader-mark-bg)');
    expect(getRule(themeCss, '.theme-preview__document th,\n.theme-preview__document td')).toContain('padding: var(--reader-table-cell-padding, 6px 8px)');
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
