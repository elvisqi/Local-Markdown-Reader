import { describe, expect, it } from 'vitest';

import {
  NON_COLOR_FEATURE_DICTIONARY,
  NON_COLOR_FEATURE_IDS_BY_CATEGORY,
  NON_COLOR_FEATURE_MINIMUMS,
  NON_COLOR_FEATURES,
} from './nonColorFeatureDictionary.mjs';

describe('non color feature dictionary', () => {
  it('defines the required category map and feature evidence metadata', () => {
    expect(NON_COLOR_FEATURE_MINIMUMS.minFeatureIds).toBe(18);
    expect(Object.keys(NON_COLOR_FEATURE_IDS_BY_CATEGORY)).toEqual([
      'typography',
      'heading',
      'chrome',
      'table',
      'callout',
      'code',
      'file-tree',
      'outline',
      'control',
      'generated-reader',
    ]);

    const categoryIds = Object.values(NON_COLOR_FEATURE_IDS_BY_CATEGORY).flat().sort((a, b) => a.localeCompare(b));
    const featureIds = NON_COLOR_FEATURES.map((feature) => feature.id).sort((a, b) => a.localeCompare(b));
    expect(featureIds).toEqual(categoryIds);

    for (const feature of NON_COLOR_FEATURES) {
      expect(feature.description).toBeTruthy();
      expect(feature.evidenceSelectors.length).toBeGreaterThan(0);
      expect(feature.evidenceProperties.length).toBeGreaterThan(0);
      expect(typeof feature.requiresScreenshotEvidence).toBe('boolean');
      expect(NON_COLOR_FEATURE_DICTIONARY[feature.id]).toEqual(feature);
    }
  });
});
