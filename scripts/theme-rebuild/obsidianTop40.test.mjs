import { describe, expect, it } from 'vitest';

import { OBSIDIAN_TOP_40, OFFICIAL_THEME_DIRECTIONS } from './obsidianTop40.mjs';

describe('Obsidian top 40 source set', () => {
  it('pins forty unique ranked themes with repositories and both-mode metadata', () => {
    expect(OBSIDIAN_TOP_40).toHaveLength(40);
    expect(new Set(OBSIDIAN_TOP_40.map((theme) => theme.name)).size).toBe(40);
    expect(new Set(OBSIDIAN_TOP_40.map((theme) => theme.repo)).size).toBe(40);
    expect(OBSIDIAN_TOP_40.map((theme) => theme.rank)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    expect(OBSIDIAN_TOP_40.every((theme) => theme.downloads > 0)).toBe(true);
    expect(OBSIDIAN_TOP_40.every((theme) => theme.modes.length > 0)).toBe(true);
  });

  it('maps every official direction to multiple upstream references', () => {
    expect(OFFICIAL_THEME_DIRECTIONS).toHaveLength(10);
    expect(new Set(OFFICIAL_THEME_DIRECTIONS.map((direction) => direction.id)).size).toBe(10);

    const sourceNames = new Set(OBSIDIAN_TOP_40.map((theme) => theme.name));
    for (const direction of OFFICIAL_THEME_DIRECTIONS) {
      expect(direction.references.length).toBeGreaterThanOrEqual(2);
      expect(direction.references.every((name) => sourceNames.has(name))).toBe(true);
      expect(direction.nonColorIdentity.length).toBeGreaterThanOrEqual(5);
    }
  });
});
