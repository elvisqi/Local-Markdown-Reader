import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildThemePreviews } from '../build-theme-previews.mjs';
import { captureThemePreviewScreenshots } from '../capture-theme-preview-screenshots.mjs';
import { buildOfficialThemes } from './buildOfficialThemes.mjs';
import { acceptThemeVisualReport, writeThemeVisualReviewTemplate } from './accept-theme-visual-report.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

const generatedRoots = [];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('accept theme visual report', () => {
  it('writes a template and accepts reviewed screenshot-backed features', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-visual-'));
    generatedRoots.push(root);
    await buildOfficialThemes({ rootDir: root });
    await buildThemePreviews({ rootDir: root });
    await captureThemePreviewScreenshots({ rootDir: root, skipCapture: true });

    const decisionsPath = join(root, 'themes', 'official', 'reports', 'visual-review-decisions.json');
    const template = await writeThemeVisualReviewTemplate({ rootDir: root, outputPath: decisionsPath, force: true });
    expect(Object.keys(template)).toEqual(OFFICIAL_THEME_IDS);

    for (const decision of Object.values(template)) {
      decision.acceptedFeatureIds = decision.candidateFeatureIds.slice(0, 10);
    }

    const result = await acceptThemeVisualReport({
      rootDir: root,
      acceptedBy: 'qiyu',
      reviewedScreenshotsPattern: 'themes/official/reports/screenshots/**/*.png',
      reviewDecisionsPath: decisionsPath,
      decisions: template,
    });
    expect(result.themeCount).toBe(10);
    expect(result.passed).toBe(true);
  });

  it('requires explicit reviewer arguments', async () => {
    await expect(acceptThemeVisualReport({ rootDir: process.cwd() })).rejects.toThrow(/accepted-by/);
  });
});
