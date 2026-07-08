import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildThemeSimilarityReport } from './themeSimilarity.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';

export async function runThemeSimilarity({ rootDir = process.cwd() } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const contractsDir = resolve(rootDir, 'themes/official/contracts');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const themes = await readPackages(packagesDir);
  const contracts = await Promise.all(themes.map((theme) => readJson(resolve(contractsDir, `${theme.id}.json`))));

  const ids = themes.map((theme) => theme.id);
  if (ids.join('\n') !== OFFICIAL_THEME_IDS.join('\n')) {
    throw new Error(`theme similarity requires all official themes in official order. Got: ${ids.join(', ')}`);
  }

  const report = buildThemeSimilarityReport(themes, contracts);
  await writeFile(resolve(reportsDir, 'theme-similarity-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (!report.passed) {
    throw new Error(`theme similarity failed: max=${report.summary.maxOverallSimilarity}`);
  }

  return {
    themeCount: themes.length,
    summary: report.summary,
  };
}

async function readPackages(packagesDir) {
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runThemeSimilarity().then((result) => {
    console.log(`theme similarity generated: ${result.themeCount}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
