import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NON_COLOR_FEATURE_MINIMUMS } from './nonColorFeatureDictionary.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

export async function writeThemeVisualReviewTemplate({
  rootDir = process.cwd(),
  outputPath = 'themes/official/reports/visual-review-decisions.json',
  force = false,
} = {}) {
  const absoluteOutputPath = resolve(rootDir, outputPath);
  if (!force && await exists(absoluteOutputPath)) {
    throw new Error(`${outputPath} already exists. Use --force-template to overwrite.`);
  }

  const visualReport = await readJson(resolve(rootDir, 'themes/official/reports/theme-visual-report.json'));
  const decisions = {};
  for (const themeId of OFFICIAL_THEME_IDS) {
    const entry = visualReport.themes?.find((theme) => theme.id === themeId);
    if (!entry) {
      throw new Error(`visual report is missing ${themeId}.`);
    }
    const candidateFeatureIds = [...new Set((entry.visibleFeatureEvidence ?? []).map((feature) => feature.featureId))];
    const screenshotFiles = [...new Set((entry.visibleFeatureEvidence ?? []).map((feature) => feature.screenshotPath))];
    decisions[themeId] = {
      candidateFeatureIds,
      screenshotFiles,
      acceptedFeatureIds: [],
      rejectedFeatureIds: [],
      notes: '',
    };
  }

  await mkdir(resolve(absoluteOutputPath, '..'), { recursive: true });
  await writeFile(absoluteOutputPath, `${JSON.stringify(decisions, null, 2)}\n`, 'utf8');
  return decisions;
}

export async function acceptThemeVisualReport({
  rootDir = process.cwd(),
  acceptedBy,
  reviewedScreenshotsPattern,
  reviewDecisionsPath,
  decisions = null,
} = {}) {
  if (!acceptedBy) {
    throw new Error('--accepted-by is required.');
  }
  if (!reviewedScreenshotsPattern) {
    throw new Error('--reviewed-screenshots is required.');
  }
  if (!reviewDecisionsPath) {
    throw new Error('--review-decisions is required.');
  }

  const visualReportPath = resolve(rootDir, 'themes/official/reports/theme-visual-report.json');
  const visualReport = await readJson(visualReportPath);
  const reviewDecisions = decisions ?? await readJson(resolve(rootDir, reviewDecisionsPath));
  const reviewedScreenshots = await expandReviewedScreenshots(rootDir, reviewedScreenshotsPattern);
  const reviewedScreenshotSet = new Set(reviewedScreenshots);
  const errors = [];

  if (Object.keys(reviewDecisions).join('\n') !== OFFICIAL_THEME_IDS.join('\n')) {
    errors.push('review decisions must contain the 10 official themes in official order.');
  }

  for (const themeId of OFFICIAL_THEME_IDS) {
    const reportEntry = visualReport.themes?.find((theme) => theme.id === themeId);
    const decision = reviewDecisions[themeId];
    if (!reportEntry || !decision) {
      errors.push(`${themeId}: missing visual report entry or review decision.`);
      continue;
    }

    const candidateSet = new Set(decision.candidateFeatureIds ?? []);
    const acceptedFeatureIds = decision.acceptedFeatureIds ?? [];
    const rejectedFeatureIds = decision.rejectedFeatureIds ?? [];
    const decisionScreenshotSet = new Set(decision.screenshotFiles ?? []);

    if (acceptedFeatureIds.length < NON_COLOR_FEATURE_MINIMUMS.minScreenshotVisibleFeatureIds) {
      errors.push(`${themeId}: acceptedFeatureIds must include at least ${NON_COLOR_FEATURE_MINIMUMS.minScreenshotVisibleFeatureIds} features.`);
    }
    for (const featureId of [...acceptedFeatureIds, ...rejectedFeatureIds]) {
      if (!candidateSet.has(featureId)) {
        errors.push(`${themeId}: ${featureId} is not a candidate visual feature.`);
      }
    }
    for (const featureId of acceptedFeatureIds) {
      const featureEvidence = (reportEntry.visibleFeatureEvidence ?? []).filter((entry) => entry.featureId === featureId);
      if (!featureEvidence.length) {
        errors.push(`${themeId}: accepted feature ${featureId} lacks visible evidence.`);
        continue;
      }
      if (!featureEvidence.some((entry) => decisionScreenshotSet.has(entry.screenshotPath) && reviewedScreenshotSet.has(entry.screenshotPath))) {
        errors.push(`${themeId}: accepted feature ${featureId} must trace to a reviewed screenshot.`);
      }
    }
    for (const screenshotPath of decisionScreenshotSet) {
      if (!reviewedScreenshotSet.has(screenshotPath)) {
        errors.push(`${themeId}: screenshot ${screenshotPath} was not included in --reviewed-screenshots.`);
      }
    }

    reportEntry.acceptedFeatureIds = acceptedFeatureIds;
    reportEntry.rejectedFeatureIds = rejectedFeatureIds;
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  visualReport.manualAcceptance = true;
  visualReport.passed = true;
  visualReport.acceptedAt = '2026-07-08T00:00:00.000Z';
  visualReport.acceptedBy = acceptedBy;
  visualReport.acceptedCommand = 'themes:visual:accept';
  visualReport.reviewedScreenshots = reviewedScreenshots;
  await writeFile(visualReportPath, `${JSON.stringify(visualReport, null, 2)}\n`, 'utf8');

  return {
    passed: true,
    themeCount: visualReport.themes.length,
  };
}

function parseArgs(argv) {
  const options = {
    writeTemplate: null,
    forceTemplate: false,
    acceptedBy: null,
    reviewedScreenshotsPattern: null,
    reviewDecisionsPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write-template') {
      options.writeTemplate = argv[index + 1];
      index += 1;
    } else if (arg === '--force-template') {
      options.forceTemplate = true;
    } else if (arg === '--accepted-by') {
      options.acceptedBy = argv[index + 1];
      index += 1;
    } else if (arg === '--reviewed-screenshots') {
      options.reviewedScreenshotsPattern = argv[index + 1];
      index += 1;
    } else if (arg === '--review-decisions') {
      options.reviewDecisionsPath = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function expandReviewedScreenshots(rootDir, pattern) {
  if (!pattern.includes('**/*.png')) {
    const path = resolve(rootDir, pattern);
    await access(path);
    return [normalizeRelative(rootDir, path)];
  }
  const base = pattern.slice(0, pattern.indexOf('**/*.png')).replace(/\/$/, '');
  const baseDir = resolve(rootDir, base);
  const files = [];
  await walkPng(baseDir, files);
  return files.map((file) => normalizeRelative(rootDir, file)).sort((a, b) => a.localeCompare(b));
}

async function walkPng(dir, output) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walkPng(path, output);
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      output.push(path);
    }
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function normalizeRelative(rootDir, path) {
  return path.startsWith(rootDir)
    ? path.slice(rootDir.length + 1)
    : path;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const run = options.writeTemplate
    ? writeThemeVisualReviewTemplate({ outputPath: options.writeTemplate, force: options.forceTemplate })
    : acceptThemeVisualReport({
      acceptedBy: options.acceptedBy,
      reviewedScreenshotsPattern: options.reviewedScreenshotsPattern,
      reviewDecisionsPath: options.reviewDecisionsPath,
    });

  run.then((result) => {
    const count = result.themeCount ?? Object.keys(result).length;
    console.log(`theme visual review processed: ${count}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
