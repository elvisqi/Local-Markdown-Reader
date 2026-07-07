import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildThemePreviews } from './build-theme-previews.mjs';

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
  it('renders an empty preview gallery while Obsidian themes are being redesigned', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-theme-previews-'));
    generatedRoots.push(root);
    await cp(resolve(process.cwd(), 'themes', 'packages'), join(root, 'themes', 'packages'), { recursive: true });

    const themes = await buildThemePreviews({ rootDir: root });

    const gallery = await readFile(join(root, 'themes', 'previews', 'index.html'), 'utf8');
    const showcase = await readFile(join(root, 'themes', 'previews', 'theme-showcase-2.3.1.svg'), 'utf8');
    expect(themes).toEqual([]);
    expect(gallery).toContain('Generated previews for 0 Obsidian-inspired original remote theme packages.');
    expect(showcase).toContain('0 Obsidian-inspired original theme previews');
    for (const themeId of REMOVED_THEME_IDS) {
      expect(gallery).not.toContain(themeId);
      expect(showcase).not.toContain(themeId);
    }
  });
});
