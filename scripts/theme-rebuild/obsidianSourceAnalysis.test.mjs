import { describe, expect, it } from 'vitest';

import { analyzeObsidianSourceCss, chooseThemeCssFiles } from './obsidianSourceAnalysis.mjs';

describe('Obsidian source analysis', () => {
  it('extracts component and non-color structure without retaining source CSS', () => {
    const analysis = analyzeObsidianSourceCss(`
      .markdown-preview-view h1 { font-family: serif; margin-block: 2rem 1rem; border-bottom: 1px solid; }
      .markdown-preview-view table { border-collapse: separate; border-spacing: 0; }
      .callout-title { display: flex; gap: 0.5rem; }
      .nav-file-title { min-height: 28px; padding-inline: 8px; border-radius: 6px; }
      pre code { line-height: 1.5; tab-size: 2; }
    `);

    expect(analysis.ruleCount).toBe(5);
    expect(analysis.componentRules.headings).toBeGreaterThan(0);
    expect(analysis.componentRules.tables).toBeGreaterThan(0);
    expect(analysis.componentRules.callouts).toBeGreaterThan(0);
    expect(analysis.componentRules.navigation).toBeGreaterThan(0);
    expect(analysis.componentRules.code).toBeGreaterThan(0);
    expect(analysis.propertyFamilies.typography).toBeGreaterThan(0);
    expect(analysis.propertyFamilies.spacing).toBeGreaterThan(0);
    expect(analysis.sourceCss).toBeUndefined();
  });

  it('prefers distributable theme files over build sources and snippets', () => {
    const files = chooseThemeCssFiles([
      { path: 'src/theme.scss.css', bytes: 50000 },
      { path: 'snippets/cards.css', bytes: 90000 },
      { path: 'theme.css', bytes: 24000 },
      { path: 'obsidian.css', bytes: 18000 },
    ]);

    expect(files.map((file) => file.path)).toEqual(['theme.css']);
  });
});
