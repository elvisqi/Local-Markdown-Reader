import { parseThemePackageText, buildInstalledThemeStylesheet } from './themes';
import { buildInstalledThemeStylesheetFromPackage } from './themeStylesheet.js';

describe('themeStylesheet', () => {
  it('matches the existing installed theme stylesheet output', () => {
    const theme = parseThemePackageText(JSON.stringify({
      id: 'dual-mode-lab',
      name: 'Dual Mode Lab',
      version: '1.0.0',
      colorScheme: 'system',
      tokens: {
        '--reader-surface': '#ffffff',
      },
      lightTokens: {
        '--reader-page-bg': '#f8fafc',
      },
      darkTokens: {
        '--reader-page-bg': '#0f172a',
      },
      css: '.document-reader .markdown-heading { border-bottom-width: 1px; }',
    }), 123);

    expect(buildInstalledThemeStylesheetFromPackage(theme)).toBe(buildInstalledThemeStylesheet(theme));
  });
});
