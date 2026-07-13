import { describe, expect, it } from 'vitest';

import {
  LEGACY_OFFICIAL_THEME_IDS,
  OFFICIAL_THEME_IDS,
  assertOnlyOfficialThemeIds,
} from './officialThemeIds.mjs';

describe('officialThemeIds', () => {
  it('ships the ten source-clustered replacement themes', () => {
    expect(OFFICIAL_THEME_IDS).toEqual([
      'quiet-focus',
      'typewriter-studio',
      'topaz-workbench',
      'atlas-reference',
      'soft-canvas',
      'palette-code',
      'desktop-notes',
      'terminal-grid',
      'neon-vault',
      'editorial-contrast',
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
    expect(() => assertOnlyOfficialThemeIds(['minimal'])).toThrow(/Unexpected official theme id: minimal/);
    expect(() => assertOnlyOfficialThemeIds(['topaz-lab'])).toThrow(/Unexpected official theme id: topaz-lab/);
  });
});
