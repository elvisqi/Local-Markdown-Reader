import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildOfficialThemes } from './buildOfficialThemes.mjs';
import { runThemeSimilarity } from './run-theme-similarity.mjs';

const generatedRoots = [];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('runThemeSimilarity', () => {
  it('writes a release similarity report for the official themes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-similarity-'));
    generatedRoots.push(root);
    await buildOfficialThemes({ rootDir: root });
    const result = await runThemeSimilarity({ rootDir: root });
    const report = JSON.parse(await readFile(join(root, 'themes', 'official', 'reports', 'theme-similarity-report.json'), 'utf8'));

    expect(result.themeCount).toBe(10);
    expect(report.passed).toBe(true);
    expect(report.pairs.length).toBe(45);
  }, 15000);
});
