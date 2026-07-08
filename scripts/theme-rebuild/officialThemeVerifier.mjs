import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { sanitizeAndScopeThemeCss } from '../../src/shared/themeCss.js';
import { analyzeCssMetrics } from './cssMetrics.mjs';
import { assertNoRestrictedSourceCopy } from './licenseCopyGuard.mjs';
import { NON_COLOR_FEATURE_MINIMUMS } from './nonColorFeatureDictionary.mjs';
import { auditNonColorFeatures } from './nonColorFeatureAudit.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';

export async function verifyOfficialThemes({ rootDir = process.cwd(), themeId = null, allowPartial = false } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const contractsDir = resolve(rootDir, 'themes/official/contracts');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const sourcesDir = resolve(rootDir, 'themes/official/sources');
  const themes = await readPackages(packagesDir, themeId);
  const errors = [];

  if (themeId && themes.length !== 1) {
    errors.push(`Expected exactly one theme package for ${themeId}.`);
  }
  if (!themeId && !allowPartial && themes.map((theme) => theme.id).join('\n') !== OFFICIAL_THEME_IDS.join('\n')) {
    errors.push(`Expected official theme ids: ${OFFICIAL_THEME_IDS.join(', ')}`);
  }

  const contracts = await Promise.all(themes.map((theme) => readJson(resolve(contractsDir, `${theme.id}.json`))));
  const reachability = await readOptionalJson(resolve(reportsDir, 'theme-selector-reachability-report.json'));
  const sourceManifest = await readOptionalJson(resolve(sourcesDir, 'source-manifest.json'));
  const sourceFingerprints = await readOptionalJson(resolve(sourcesDir, 'source-fingerprints.json'));
  const visualReport = !allowPartial ? await readOptionalJson(resolve(reportsDir, 'theme-visual-report.json')) : null;

  for (let index = 0; index < themes.length; index += 1) {
    const theme = themes[index];
    const contract = contracts[index];
    errors.push(...verifyBuildGate({
      theme,
      contract,
      reachability,
      sourceManifest,
      sourceFingerprints,
      visualReport,
      allowPartial,
    }));
  }

  if (!allowPartial) {
    errors.push(...await verifyReleaseGate({ rootDir, themes, contracts, visualReport }));
  }

  const report = {
    generatedAt: '2026-07-08T00:00:00.000Z',
    passed: errors.length === 0,
    allowPartial,
    themeCount: themes.length,
    themeIds: themes.map((theme) => theme.id),
    errors,
  };
  await writeFile(resolve(reportsDir, 'official-theme-validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  return {
    passed: true,
    themeCount: themes.length,
  };
}

export function parseOfficialThemeVerifierArgs(argv) {
  const options = { themeId: null, allowPartial: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--theme') {
      options.themeId = argv[index + 1];
      index += 1;
    } else if (arg === '--allow-partial') {
      options.allowPartial = true;
    } else {
      throw new Error(`Unknown argument: ${arg}.`);
    }
  }
  if (options.themeId && !options.allowPartial) {
    throw new Error('--theme requires --allow-partial.');
  }
  return options;
}

function verifyBuildGate({ theme, contract, reachability, sourceManifest, sourceFingerprints, visualReport, allowPartial }) {
  const errors = [];
  if (contract.id !== theme.id) {
    errors.push(`${theme.id}: contract id mismatch.`);
  }
  if (theme.colorScheme !== 'system') {
    errors.push(`${theme.id}: official themes must support light and dark via colorScheme=system.`);
  }
  if (!isPlainObject(theme.tokens) || Object.keys(theme.tokens).length < 30) {
    errors.push(`${theme.id}: shared tokens are incomplete.`);
  }
  if (!isPlainObject(theme.lightTokens) || Object.keys(theme.lightTokens).length < 30) {
    errors.push(`${theme.id}: lightTokens are incomplete.`);
  }
  if (!isPlainObject(theme.darkTokens) || Object.keys(theme.darkTokens).length < 30) {
    errors.push(`${theme.id}: darkTokens are incomplete.`);
  }

  const metrics = analyzeCssMetrics(theme.css ?? '');
  const minBytes = theme.id === 'minimal' ? 8 * 1024 : 12 * 1024;
  const minRules = theme.id === 'minimal' ? 70 : 90;
  if (metrics.bytes < minBytes) {
    errors.push(`${theme.id}: CSS bytes ${metrics.bytes} below ${minBytes}.`);
  }
  if (metrics.ruleCount < minRules) {
    errors.push(`${theme.id}: CSS rule count ${metrics.ruleCount} below ${minRules}.`);
  }

  try {
    sanitizeAndScopeThemeCss(theme.css ?? '', `[data-reader-theme-id="installed:${theme.id}"][data-reader-theme-id]`, { themeId: theme.id });
  } catch (error) {
    errors.push(`${theme.id}: sanitizer rejected CSS: ${error instanceof Error ? error.message : String(error)}`);
  }

  const visualEntry = visualReport?.themes?.find((entry) => entry.id === theme.id) ?? null;
  const audit = auditNonColorFeatures({ theme, contract, visualEntry, allowPartial });
  if (!audit.passed) {
    errors.push(...audit.errors);
  }

  const reachabilityEntry = reachability?.themes?.find((entry) => entry.id === theme.id);
  if (!reachabilityEntry?.passed) {
    errors.push(`${theme.id}: selector reachability report is missing or failed.`);
  }

  const source = sourceManifest?.sources?.find((entry) => entry.id === theme.id);
  if (!source) {
    errors.push(`${theme.id}: missing source manifest entry.`);
  } else if (source.usage === 'blocked') {
    errors.push(`${theme.id}: source usage is blocked.`);
  }
  if (!sourceFingerprints?.sources?.[theme.id]) {
    errors.push(`${theme.id}: missing source fingerprint entry.`);
  } else {
    const restrictedSourceIds = (sourceManifest?.sources ?? [])
      .filter((entry) => entry.license?.status !== 'permissive' || entry.usage === 'inspiration-only')
      .map((entry) => entry.id);
    try {
      assertNoRestrictedSourceCopy({
        themeId: theme.id,
        css: theme.css ?? '',
        sourceFingerprints,
        restrictedSourceIds,
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return errors;
}

async function verifyReleaseGate({ rootDir, themes, contracts, visualReport }) {
  const errors = [];
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const similarity = await readOptionalJson(resolve(reportsDir, 'theme-similarity-report.json'));
  if (similarity?.passed !== true || similarity.themeCount !== OFFICIAL_THEME_IDS.length) {
    errors.push('Similarity report is missing or failed.');
  }

  if (visualReport?.passed !== true || visualReport.manualAcceptance !== true) {
    errors.push('Visual report must be explicitly accepted before release.');
  }

  for (const theme of themes) {
    const contract = contracts.find((entry) => entry.id === theme.id);
    const visualEntry = visualReport?.themes?.find((entry) => entry.id === theme.id);
    if (!visualEntry) {
      errors.push(`${theme.id}: missing visual report entry.`);
      continue;
    }
    const accepted = visualEntry.acceptedFeatureIds ?? [];
    if (accepted.length < NON_COLOR_FEATURE_MINIMUMS.minScreenshotVisibleFeatureIds) {
      errors.push(`${theme.id}: visual acceptance needs at least ${NON_COLOR_FEATURE_MINIMUMS.minScreenshotVisibleFeatureIds} feature ids.`);
    }
    for (const signatureFeatureId of contract.signatureFeatureIds ?? []) {
      if (!accepted.includes(signatureFeatureId)) {
        errors.push(`${theme.id}: signature feature ${signatureFeatureId} must be visually accepted.`);
      }
    }
    if ((visualEntry.rejectedFeatureIds ?? []).length) {
      errors.push(`${theme.id}: rejected visual features block release.`);
    }
  }

  return errors;
}

async function readPackages(packagesDir, themeId) {
  if (themeId) {
    return [await readJson(resolve(packagesDir, `${themeId}${THEME_PACKAGE_SUFFIX}`))];
  }
  const files = (await readdir(packagesDir))
    .filter((file) => file.endsWith(THEME_PACKAGE_SUFFIX))
    .sort((a, b) => (
      OFFICIAL_THEME_IDS.indexOf(a.replace(THEME_PACKAGE_SUFFIX, '')) -
      OFFICIAL_THEME_IDS.indexOf(b.replace(THEME_PACKAGE_SUFFIX, ''))
    ));
  return Promise.all(files.map((file) => readJson(resolve(packagesDir, file))));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
