import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildOfficialThemes } from './buildOfficialThemes.mjs';
import { buildThemePreviews } from '../build-theme-previews.mjs';
import { captureThemePreviewScreenshots } from '../capture-theme-preview-screenshots.mjs';
import { acceptThemeVisualReport, writeThemeVisualReviewTemplate } from './accept-theme-visual-report.mjs';
import { verifyOfficialThemes } from './officialThemeVerifier.mjs';
import { runThemeSimilarity } from './run-theme-similarity.mjs';
import { runSelectorReachability } from './selectorReachability.mjs';
import { updateThemeSourceLock } from './update-theme-source-lock.mjs';

const generatedRoots = [];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('officialThemeVerifier', () => {
  it('rejects partial validation for removed official themes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-theme-verifier-'));
    generatedRoots.push(root);
    await updateThemeSourceLock({ rootDir: root });

    await expect(buildOfficialThemes({ rootDir: root, themeId: 'minimal', allowPartial: true }))
      .rejects
      .toThrow('Unknown official theme id: minimal');
  });

  it('passes the official release gate after all reports are reviewed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-theme-verifier-full-'));
    generatedRoots.push(root);
    await updateThemeSourceLock({ rootDir: root });
    await buildOfficialThemes({ rootDir: root });
    await buildThemePreviews({ rootDir: root });
    await runSelectorReachability({ rootDir: root });
    await runThemeSimilarity({ rootDir: root });
    await captureThemePreviewScreenshots({ rootDir: root, skipCapture: true });
    const decisionsPath = join(root, 'themes', 'official', 'reports', 'visual-review-decisions.json');
    const decisions = await writeThemeVisualReviewTemplate({ rootDir: root, outputPath: decisionsPath, force: true });
    for (const decision of Object.values(decisions)) {
      decision.acceptedFeatureIds = decision.candidateFeatureIds.slice(0, 10);
    }
    await acceptThemeVisualReport({
      rootDir: root,
      acceptedBy: 'qiyu',
      reviewedScreenshotsPattern: 'themes/official/reports/screenshots/**/*.png',
      reviewDecisionsPath: decisionsPath,
      decisions,
    });

    const result = await verifyOfficialThemes({ rootDir: root });
    expect(result.themeCount).toBe(10);
    expect(result.passed).toBe(true);
  }, 40000);
});
