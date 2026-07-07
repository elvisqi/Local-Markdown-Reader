import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeAndScopeThemeCss } from '../src/shared/themeCss.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';

export async function verifyOfficialThemes({ rootDir = ROOT } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const contractsDir = resolve(rootDir, 'themes/official/contracts');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const packages = await readThemePackages(packagesDir);
  const errors = [];

  if (packages.length !== 10) {
    errors.push(`Expected 10 official theme packages, found ${packages.length}.`);
  }

  for (const theme of packages) {
    const contract = await readJson(resolve(contractsDir, `${theme.id}.json`));
    if (contract.id !== theme.id) {
      errors.push(`${theme.id}: contract id mismatch.`);
    }
    if (theme.colorScheme !== 'system') {
      errors.push(`${theme.id}: official themes must use colorScheme=system.`);
    }
    if (!isPlainObject(theme.lightTokens) || Object.keys(theme.lightTokens).length < 20) {
      errors.push(`${theme.id}: lightTokens must be present and complete.`);
    }
    if (!isPlainObject(theme.darkTokens) || Object.keys(theme.darkTokens).length < 20) {
      errors.push(`${theme.id}: darkTokens must be present and complete.`);
    }
    if (!Array.isArray(contract.nonColorDifferentiators) || contract.nonColorDifferentiators.length < 3) {
      errors.push(`${theme.id}: contract needs at least 3 non-color differentiators.`);
    }
    if (!Array.isArray(contract.requiredComponentCoverage) || contract.requiredComponentCoverage.length < 6) {
      errors.push(`${theme.id}: contract needs at least 6 covered components.`);
    }

    try {
      sanitizeAndScopeThemeCss(theme.css ?? '', `[data-reader-theme-id="installed:${theme.id}"][data-reader-theme-id]`, { themeId: theme.id });
    } catch (error) {
      errors.push(`${theme.id}: sanitizer rejected CSS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const similarity = await readJson(resolve(reportsDir, 'theme-similarity-report.json'));
  if (similarity.passed !== true) {
    errors.push('Similarity report did not pass.');
  }

  const visual = await readJson(resolve(reportsDir, 'theme-visual-report.json'));
  if (visual.passed !== true || !Array.isArray(visual.themes) || visual.themes.length !== 10) {
    errors.push('Visual report is missing or did not pass.');
  }

  for (const entry of visual.themes ?? []) {
    if (!entry.sourceCssHash || !entry.scopedCssHash || !entry.resolvedTokensHash) {
      errors.push(`${entry.id}: visual report missing CSS/token hashes.`);
    }
    if (entry.manualAcceptance !== true) {
      errors.push(`${entry.id}: visual report manualAcceptance must be true.`);
    }
    if (!entry.domAssertions?.document || !entry.domAssertions?.headings || !entry.domAssertions?.table) {
      errors.push(`${entry.id}: visual report missing required DOM assertions.`);
    }
  }

  const validation = await readJson(resolve(reportsDir, 'official-theme-validation-report.json'));
  if (validation.passed !== true || validation.themeCount !== 10) {
    errors.push('Official validation report did not pass.');
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  return {
    themeCount: packages.length,
    similarity: similarity.summary,
  };
}

async function readThemePackages(packagesDir) {
  const packages = [];
  for (const file of (await readdir(packagesDir)).sort((a, b) => a.localeCompare(b))) {
    if (!file.endsWith(THEME_PACKAGE_SUFFIX)) {
      continue;
    }
    packages.push(await readJson(resolve(packagesDir, file)));
  }
  return packages;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyOfficialThemes().then((result) => {
    console.log(`official themes verified: ${result.themeCount}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
