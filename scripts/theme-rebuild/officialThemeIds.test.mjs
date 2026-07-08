import { describe, expect, it } from 'vitest';

import {
  LEGACY_OFFICIAL_THEME_IDS,
  OFFICIAL_THEME_IDS,
  assertOnlyOfficialThemeIds,
} from './officialThemeIds.mjs';

describe('officialThemeIds', () => {
  it('locks the new official theme ids', () => {
    expect(OFFICIAL_THEME_IDS).toEqual([
      'minimal',
      'things',
      'anuppuccin',
      'blue-topaz',
      'catppuccin',
      'everforest',
      'its-theme',
      'primary',
      'prism',
      'cybertron',
    ]);
  });

  it('locks the legacy thin official theme ids', () => {
    expect(LEGACY_OFFICIAL_THEME_IDS).toEqual([
      'everforest-field',
      'github-workbench',
      'minimal-manuscript',
      'nord-research',
      'primary-soft',
      'prism-spectrum',
      'sanctum-archive',
      'terminal-console',
      'things-native',
      'topaz-lab',
    ]);
  });

  it('rejects legacy theme ids in official output', () => {
    expect(() => assertOnlyOfficialThemeIds(OFFICIAL_THEME_IDS)).not.toThrow();
    expect(() => assertOnlyOfficialThemeIds(['minimal', 'topaz-lab'])).toThrow(
      /Unexpected official theme id: topaz-lab/,
    );
  });
});
