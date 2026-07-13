import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildThemePreviews } from './build-theme-previews.mjs';
import { buildOfficialThemes } from './theme-rebuild/buildOfficialThemes.mjs';
import { OFFICIAL_THEME_IDS } from './theme-rebuild/officialThemeIds.mjs';

const generatedRoots = [];
const REMOVED_THEME_IDS = [
  'minimal-focus',
  'things-flow',
  'pastel-puccin',
  'topaz-blue',
  'nord-notes',
  'atom-one-reader',
  'obsidianite-dark',
  'wasp-highlight',
  'typewriter-desk',
  'its-readable',
];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('theme preview generation', () => {
  it('renders preview assets for the ten replacement themes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-theme-previews-'));
    generatedRoots.push(root);
    await buildOfficialThemes({ rootDir: root });

    const themes = await buildThemePreviews({ rootDir: root });

    const gallery = await readFile(join(root, 'themes', 'previews', 'index.html'), 'utf8');
    const showcase = await readFile(join(root, 'themes', 'previews', 'theme-showcase-2.4.0.svg'), 'utf8');
    expect(themes.map((theme) => theme.id).sort((a, b) => a.localeCompare(b))).toEqual(OFFICIAL_THEME_IDS.slice().sort((a, b) => a.localeCompare(b)));
    expect(gallery).toContain('Generated previews for 10 Obsidian-inspired original remote theme packages.');
    expect(showcase).toContain('10 Obsidian-inspired original theme previews');
    expect(gallery).toContain('Quiet Focus');
    expect(gallery).toContain('Terminal Grid');
    for (const themeId of REMOVED_THEME_IDS) {
      expect(gallery).not.toContain(themeId);
      expect(showcase).not.toContain(themeId);
    }
  });
});
