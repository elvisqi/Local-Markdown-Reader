import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildThemeIndex } from '../build-theme-index.mjs';
import { buildOfficialThemes } from './buildOfficialThemes.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

const generatedRoots = [];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('buildOfficialThemes', () => {
  it('rejects partial builds for removed official themes', async () => {
    const root = await makeRoot();

    await expect(buildOfficialThemes({ rootDir: root, themeId: 'minimal', allowPartial: true }))
      .rejects
      .toThrow('Unknown official theme id: minimal');
  });

  it('builds the ten source-clustered official themes', async () => {
    const root = await makeRoot();
    const result = await buildOfficialThemes({ rootDir: root });
    const index = await buildThemeIndex({ rootDir: root });

    expect(result.themeIds).toEqual(OFFICIAL_THEME_IDS);
    expect(await listPackageIds(root)).toEqual(OFFICIAL_THEME_IDS.slice().sort((a, b) => a.localeCompare(b)));
    expect(index.themes.map((theme) => theme.id).sort((a, b) => a.localeCompare(b))).toEqual(OFFICIAL_THEME_IDS.slice().sort((a, b) => a.localeCompare(b)));
    expect(index.themes).toHaveLength(10);
    expect(index.themes.every((theme) => theme.version === '1.1.0')).toBe(true);
    expect(index.catalogVersion).toContain('official');
  });
});

async function makeRoot() {
  const root = await mkdtemp(join(tmpdir(), 'md-viewer-official-themes-'));
  generatedRoots.push(root);
  return root;
}

async function listPackageIds(root) {
  return (await readdir(join(root, 'themes', 'packages')))
    .filter((file) => file.endsWith('.mdv-theme.json'))
    .map((file) => file.replace(/\.mdv-theme\.json$/, ''))
    .sort((a, b) => a.localeCompare(b));
}
