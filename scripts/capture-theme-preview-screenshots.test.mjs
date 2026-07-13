import { describe, expect, it } from 'vitest';

import { buildCaptureUrl } from './capture-theme-preview-screenshots.mjs';
import { buildVisualEvidence } from './theme-rebuild/officialThemeData.mjs';

describe('theme screenshot capture URLs', () => {
  const base = { realDomUrl: 'file:///preview.html', svgUrl: 'file:///preview.svg' };

  it('isolates light and dark evidence screenshots', () => {
    expect(buildCaptureUrl({ ...base, screenshotFile: 'reader-desktop-light.png' })).toBe('file:///preview.html?mode=light');
    expect(buildCaptureUrl({ ...base, screenshotFile: 'reader-narrow-dark.png' })).toBe('file:///preview.html?mode=dark');
  });

  it('targets table and mermaid evidence regions', () => {
    expect(buildCaptureUrl({ ...base, screenshotFile: 'table-fullscreen.png' })).toBe('file:///preview.html?mode=light&target=table');
    expect(buildCaptureUrl({ ...base, screenshotFile: 'mermaid-fullscreen.png' })).toBe('file:///preview.html?mode=dark&target=mermaid');
    expect(buildCaptureUrl({ ...base, screenshotFile: 'catalog-card.png' })).toBe('file:///preview.svg');
  });

  it('targets light and dark detail evidence regions', () => {
    expect(buildCaptureUrl({ ...base, screenshotFile: 'reader-details-light.png' })).toBe('file:///preview.html?mode=light&target=details');
    expect(buildCaptureUrl({ ...base, screenshotFile: 'reader-details-dark.png' })).toBe('file:///preview.html?mode=dark&target=details');
  });

  it('maps feature evidence to a screenshot where that component is visible', () => {
    const evidence = buildVisualEvidence('fixture', [
      'heading-quiet-scale',
      'code-soft-panel',
      'callout-low-noise',
      'table-sticky-header-frame',
      'fullscreen-table-corner-actions',
      'mermaid-floating-controls',
      'yaml-summary-panel',
    ]);

    expect(evidence.map(({ screenshotPath }) => screenshotPath)).toEqual([
      'themes/official/reports/screenshots/fixture/reader-desktop-light.png',
      'themes/official/reports/screenshots/fixture/reader-details-light.png',
      'themes/official/reports/screenshots/fixture/reader-details-light.png',
      'themes/official/reports/screenshots/fixture/reader-details-light.png',
      'themes/official/reports/screenshots/fixture/table-fullscreen.png',
      'themes/official/reports/screenshots/fixture/mermaid-fullscreen.png',
      'themes/official/reports/screenshots/fixture/reader-details-dark.png',
    ]);
  });
});
