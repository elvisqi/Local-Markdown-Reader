import { describe, expect, it } from 'vitest';

import { calculateSelectorSimilarity, compareThemePair } from './themeSimilarity.mjs';

describe('themeSimilarity', () => {
  it('calculates selector similarity using set equality', () => {
    expect(calculateSelectorSimilarity(['.a', '.b'], ['.b', '.a'])).toBe(1);
  });

  it('keeps identical CSS above the release threshold', () => {
    const pair = compareThemePair({
      id: 'a',
      css: '.document-reader .markdown-heading--h1 { padding: 8px; border-width: 1px; }',
      tokens: {},
      lightTokens: {},
      darkTokens: {},
    }, {
      id: 'b',
      css: '.document-reader .markdown-heading--h1 { padding: 8px; border-width: 1px; }',
      tokens: {},
      lightTokens: {},
      darkTokens: {},
    });

    expect(pair.overallSimilarity).toBeGreaterThanOrEqual(0.95);
  });
});
