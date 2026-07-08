import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REMOVED_OBSIDIAN_THEME_IDS = [
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
const LEGACY_THIN_OFFICIAL_THEME_IDS = [
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
];
const DEEP_REPLICA_OFFICIAL_THEME_IDS = [
  'anuppuccin',
  'blue-topaz',
  'catppuccin',
  'cybertron',
  'everforest',
  'its-theme',
  'minimal',
  'primary',
  'prism',
  'things',
];

describe('removed Obsidian draft theme packages', () => {
  it.each(REMOVED_OBSIDIAN_THEME_IDS)('%s no longer ships as a remote theme package', (themeId) => {
    expect(existsSync(resolve(process.cwd(), 'themes', 'packages', `${themeId}.mdv-theme.json`))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'themes', 'previews', `${themeId}.svg`))).toBe(false);
  });

  it('does not list removed themes in metadata or index', () => {
    const metadata = JSON.parse(readFileSync(resolve(process.cwd(), 'themes', 'metadata.json'), 'utf8'));
    const index = JSON.parse(readFileSync(resolve(process.cwd(), 'themes', 'index.json'), 'utf8'));
    const metadataIds = new Set(Object.keys(metadata.themes ?? {}));
    const indexIds = new Set((index.themes ?? []).map((theme) => theme.id));

    for (const themeId of REMOVED_OBSIDIAN_THEME_IDS) {
      expect(metadataIds.has(themeId), `${themeId} should not be in metadata`).toBe(false);
      expect(indexIds.has(themeId), `${themeId} should not be in index`).toBe(false);
    }
    for (const themeId of LEGACY_THIN_OFFICIAL_THEME_IDS) {
      expect(metadataIds.has(themeId), `${themeId} should not be in metadata`).toBe(false);
      expect(indexIds.has(themeId), `${themeId} should not be in index`).toBe(false);
      expect(existsSync(resolve(process.cwd(), 'themes', 'official', 'fixtures', 'legacy-thin-themes', 'packages', `${themeId}.mdv-theme.json`))).toBe(true);
    }
  });

  it('ships the deep replica official remote theme packages', () => {
    const index = JSON.parse(readFileSync(resolve(process.cwd(), 'themes', 'index.json'), 'utf8'));

    expect((index.themes ?? []).map((theme) => theme.id).sort()).toEqual(DEEP_REPLICA_OFFICIAL_THEME_IDS);
  });
});
