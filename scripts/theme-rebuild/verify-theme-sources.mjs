import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';

const ROOT = resolve(process.cwd());
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const SHA_PATTERN = /^[a-f0-9]{64}$/;

export async function verifyThemeSources({ rootDir = ROOT } = {}) {
  const sourceDir = resolve(rootDir, 'themes/official/sources');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const manifest = await readJson(resolve(sourceDir, 'source-manifest.json'));
  const fingerprints = await readJson(resolve(sourceDir, 'source-fingerprints.json'));
  const licenseAudit = await readJson(resolve(reportsDir, 'license-audit-report.json'));
  const sourceAnalysis = await readJson(resolve(reportsDir, 'source-analysis-report.json'));
  const errors = [];

  const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
  const ids = sources.map((source) => source.id);
  if (ids.join('\n') !== OFFICIAL_THEME_IDS.join('\n')) {
    errors.push(`source ids must equal official ids. Got: ${ids.join(', ')}`);
  }

  for (const source of sources) {
    if (!COMMIT_PATTERN.test(source.upstream?.commit ?? '')) {
      errors.push(`${source.id}: upstream commit must be a 40 character hex SHA.`);
    }
    if (!SHA_PATTERN.test(source.cssSha256 ?? '')) {
      errors.push(`${source.id}: cssSha256 must be present.`);
    }
    if (!SHA_PATTERN.test(source.license?.sha256 ?? '')) {
      errors.push(`${source.id}: license sha256 must be present.`);
    }
    if (!source.nameUsage?.displayName || typeof source.nameUsage.allowed !== 'boolean' || !source.nameUsage.rationale) {
      errors.push(`${source.id}: nameUsage must include displayName, allowed, and rationale.`);
    }
    const fingerprint = fingerprints.sources?.[source.id];
    if (!fingerprint) {
      errors.push(`${source.id}: missing source fingerprint.`);
    } else if (fingerprint.sourceCssSha256 !== source.cssSha256) {
      errors.push(`${source.id}: fingerprint sourceCssSha256 does not match manifest cssSha256.`);
    }
    if ((source.license?.status === 'restricted' || source.license?.status === 'unknown') && source.usage !== 'inspiration-only') {
      errors.push(`${source.id}: restricted/unknown license must be inspiration-only.`);
    }
  }

  const auditIds = new Set((licenseAudit.sources ?? []).map((source) => source.id));
  const analysisIds = new Set((sourceAnalysis.sources ?? []).map((source) => source.id));
  for (const themeId of OFFICIAL_THEME_IDS) {
    if (!auditIds.has(themeId)) {
      errors.push(`${themeId}: missing license audit entry.`);
    }
    if (!analysisIds.has(themeId)) {
      errors.push(`${themeId}: missing source analysis entry.`);
    }
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  return {
    sources: sources.length,
    fingerprints: Object.keys(fingerprints.sources ?? {}).length,
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

if (isCliEntrypoint()) {
  verifyThemeSources().then((result) => {
    console.log(`theme sources verified: ${result.sources}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

function isCliEntrypoint() {
  try {
    return process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
  } catch {
    return false;
  }
}
