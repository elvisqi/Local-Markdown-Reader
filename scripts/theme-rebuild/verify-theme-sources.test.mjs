import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { updateThemeSourceLock } from './update-theme-source-lock.mjs';
import { refreshThemeSources } from './refresh-theme-sources.mjs';
import { verifyThemeSources } from './verify-theme-sources.mjs';

describe('theme source lock pipeline', () => {
  let root;

  beforeEach(async () => {
    root = join(tmpdir(), `local-markdown-reader-theme-sources-${process.pid}-${Date.now()}`);
    await mkdir(join(root, 'themes', 'official'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes source lock artifacts and verifies them offline', async () => {
    await updateThemeSourceLock({ rootDir: root });

    await expect(verifyThemeSources({ rootDir: root })).resolves.toEqual({
      sources: 10,
      fingerprints: 10,
    });
    await expect(refreshThemeSources({ rootDir: root })).resolves.toMatchObject({
      refreshed: 10,
    });
  });

  it('fails refresh before a source manifest exists', async () => {
    await expect(refreshThemeSources({ rootDir: root })).rejects.toThrow('source-manifest.json is missing');
  });
});
