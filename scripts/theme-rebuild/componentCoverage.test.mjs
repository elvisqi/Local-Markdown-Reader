import { describe, expect, it } from 'vitest';

import { analyzeComponentCoverage } from './componentCoverage.mjs';

describe('componentCoverage', () => {
  it('maps representative selectors to reader components', () => {
    const coverage = analyzeComponentCoverage([
      '.document-reader .markdown-heading--h1',
      '.document-reader .callout-warning .callout-title',
      '.file-tree__row[data-file-tree-kind="directory"]',
    ]);

    expect(coverage.coveredComponents).toContain('headings');
    expect(coverage.coveredComponents).toContain('callouts');
    expect(coverage.coveredComponents).toContain('file-tree');
  });
});
