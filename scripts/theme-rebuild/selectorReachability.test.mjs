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
  it('writes per-theme selector reachability reports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-reachability-'));
    generatedRoots.push(root);
    await buildOfficialThemes({ rootDir: root, themeId: 'minimal', allowPartial: true });
    const result = await runSelectorReachability({ rootDir: root, themeId: 'minimal', allowPartial: true });
    const report = JSON.parse(await readFile(join(root, 'themes', 'official', 'reports', 'theme-selector-reachability-report.json'), 'utf8'));

    expect(result.themeCount).toBe(1);
    expect(report.themes[0].id).toBe('minimal');
    expect(report.themes[0].reachableRatio).toBeGreaterThanOrEqual(0.8);
  });
});
