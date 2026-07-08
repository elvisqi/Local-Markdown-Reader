import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OFFICIAL_THEME_SOURCES } from './sourceRegistry.mjs';
import { buildSourceFingerprint, sha256 } from './sourceFingerprinting.mjs';

const ROOT = resolve(process.cwd());

export async function updateThemeSourceLock({ rootDir = ROOT, themeId = null } = {}) {
  const sources = themeId ? OFFICIAL_THEME_SOURCES.filter((source) => source.id === themeId) : OFFICIAL_THEME_SOURCES;
  if (themeId && sources.length === 0) {
    throw new Error(`Unknown official theme source: ${themeId}`);
  }

  const sourceDir = resolve(rootDir, 'themes/official/sources');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  const manifestSources = sources.map((source) => {
    const cssHash = sha256(source.sourceCss);
    return {
      id: source.id,
      referenceId: source.referenceId,
      repositoryUrl: source.repositoryUrl,
      cssPath: source.cssPath,
      upstream: {
        branch: source.branch,
        commit: source.commit,
      },
      license: {
        ...source.license,
        sha256: sha256(JSON.stringify(source.license)),
      },
      cssSha256: cssHash,
      usage: source.usage,
      nameUsage: source.nameUsage,
    };
  });

  const fingerprints = Object.fromEntries(sources.map((source) => [
    source.id,
    buildSourceFingerprint({ id: source.id, css: source.sourceCss }),
  ]));

  const licenseReport = {
    generatedAt: '2026-07-08T00:00:00.000Z',
    sources: manifestSources.map((source) => ({
      id: source.id,
      license: source.license,
      usage: source.usage,
      nameUsage: source.nameUsage,
    })),
  };

  const analysisReport = {
    generatedAt: '2026-07-08T00:00:00.000Z',
    sources: Object.values(fingerprints).map((fingerprint) => ({
      id: fingerprint.id,
      bytes: fingerprint.bytes,
      normalizedBytes: fingerprint.normalizedBytes,
      declarationBlocks: fingerprint.declarationBlockHashes.length,
      selectorTrigrams: fingerprint.selectorTrigrams.length,
      textWindows: fingerprint.textWindowHashes.length,
    })),
  };

  await writeJson(resolve(sourceDir, 'source-manifest.json'), {
    version: 1,
    updatedAt: '2026-07-08T00:00:00.000Z',
    sources: manifestSources,
  });
  await writeJson(resolve(sourceDir, 'source-fingerprints.json'), {
    version: 1,
    updatedAt: '2026-07-08T00:00:00.000Z',
    sources: fingerprints,
  });
  await writeJson(resolve(reportsDir, 'license-audit-report.json'), licenseReport);
  await writeJson(resolve(reportsDir, 'source-analysis-report.json'), analysisReport);

  return {
    updated: manifestSources.length,
    sources: manifestSources.map((source) => ({
      id: source.id,
      oldCommit: null,
      newCommit: source.upstream.commit,
      updated: true,
    })),
  };
}

function parseArgs(argv) {
  const options = { themeId: null, all: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--theme') {
      options.themeId = argv[index + 1];
      index += 1;
    } else if (arg === '--all') {
      options.all = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

if (isCliEntrypoint()) {
  const options = parseArgs(process.argv.slice(2));
  updateThemeSourceLock({ themeId: options.themeId }).then((result) => {
    console.log(`theme source lock updated: ${result.updated}`);
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
