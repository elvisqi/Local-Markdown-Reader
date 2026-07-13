import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildOfficialThemes } from './buildOfficialThemes.mjs';
import { runSelectorReachability } from './selectorReachability.mjs';

const generatedRoots = [];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('selectorReachability', () => {
  it('rejects selector reachability checks for removed official themes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-reachability-'));
    generatedRoots.push(root);

    await expect(buildOfficialThemes({ rootDir: root, themeId: 'minimal', allowPartial: true }))
      .rejects
      .toThrow('Unknown official theme id: minimal');
  });
});
