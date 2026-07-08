import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

import { analyzeCssMetrics } from './cssMetrics.mjs';
import { buildRealPreviewFixtureHtml } from './realPreviewFixture.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';
const MIN_REACHABLE_RATIO = 0.8;

export async function runSelectorReachability({ rootDir = process.cwd(), themeId = null, allowPartial = false } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const themes = await readPackages(packagesDir, themeId);
  if (themeId && themes.length !== 1) {
    throw new Error(`Expected one theme package for ${themeId}.`);
  }
  if (!allowPartial && !themeId && themes.map((theme) => theme.id).join('\n') !== OFFICIAL_THEME_IDS.join('\n')) {
    throw new Error('selector reachability requires all official themes unless --allow-partial is used.');
  }

  const dom = new JSDOM(buildRealPreviewFixtureHtml());
  const document = dom.window.document;
  const themeReports = themes.map((theme) => analyzeThemeReachability(theme, document));
  const report = {
    generatedAt: '2026-07-08T00:00:00.000Z',
    fixture: 'stable-reader-dom-hooks',
    minReachableRatio: MIN_REACHABLE_RATIO,
    passed: themeReports.every((entry) => entry.passed),
    themes: themeReports,
  };
  await writeFile(resolve(reportsDir, 'theme-selector-reachability-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (!report.passed) {
    throw new Error(`selector reachability failed for: ${themeReports.filter((entry) => !entry.passed).map((entry) => entry.id).join(', ')}`);
  }
  return {
    themeCount: themes.length,
  };
}

export function analyzeThemeReachability(theme, document) {
  const metrics = analyzeCssMetrics(theme.css ?? '');
  const selectorEntries = metrics.selectors.map((selector) => {
    const query = normalizeSelectorForReachability(selector);
    let reachable = false;
    let error = null;
    try {
      reachable = Boolean(query && document.querySelector(query));
    } catch (queryError) {
      error = queryError instanceof Error ? queryError.message : String(queryError);
    }
    return {
      selector,
      query,
      reachable,
      error,
    };
  });
  const reachableCount = selectorEntries.filter((entry) => entry.reachable).length;
  const reachableRatio = selectorEntries.length ? reachableCount / selectorEntries.length : 1;
  return {
    id: theme.id,
    selectorCount: selectorEntries.length,
    reachableCount,
    reachableRatio: Math.round(reachableRatio * 10000) / 10000,
    passed: reachableRatio >= MIN_REACHABLE_RATIO,
    unreachableSelectors: selectorEntries.filter((entry) => !entry.reachable).slice(0, 30),
  };
}

export function normalizeSelectorForReachability(selector) {
  return String(selector ?? '')
    .replace(/::(?:before|after|selection|marker)/g, '')
    .replace(/:(?:hover|focus-visible|focus|active)/g, '')
    .trim();
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

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function parseArgs(argv) {
  const options = { themeId: null, allowPartial: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--theme') {
      options.themeId = argv[index + 1];
      index += 1;
    } else if (arg === '--allow-partial') {
      options.allowPartial = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSelectorReachability(parseArgs(process.argv.slice(2))).then((result) => {
    console.log(`theme selector reachability generated: ${result.themeCount}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
