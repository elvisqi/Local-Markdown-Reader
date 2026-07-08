import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { writeThemeIndexFile } from '../build-theme-index.mjs';
import {
  buildThemeMetadata,
  getThemeBlueprints,
  OFFICIAL_CATALOG_VERSION,
} from './officialThemeData.mjs';
import { OFFICIAL_THEME_IDS } from './officialThemeIds.mjs';
import { buildThemeArtifacts } from './themePackageBuilder.mjs';

const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';

export async function buildOfficialThemes({ rootDir = process.cwd(), themeId = null, allowPartial = false } = {}) {
  const blueprints = getThemeBlueprints(themeId);
  const themeIds = blueprints.map((blueprint) => blueprint.id);
  const themesDir = resolve(rootDir, 'themes');
  const packagesDir = resolve(themesDir, 'packages');
  const officialDir = resolve(themesDir, 'official');
  const contractsDir = resolve(officialDir, 'contracts');
  const definitionsDir = resolve(officialDir, 'definitions');
  const reportsDir = resolve(officialDir, 'reports');

  await resetGeneratedDirs([packagesDir, contractsDir, definitionsDir]);
  await mkdir(packagesDir, { recursive: true });
  await mkdir(contractsDir, { recursive: true });
  await mkdir(definitionsDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  const buildReports = [];
  for (const blueprint of blueprints) {
    const artifacts = buildThemeArtifacts(blueprint, { allowPartial });
    await writeJson(resolve(packagesDir, `${artifacts.theme.id}${THEME_PACKAGE_SUFFIX}`), artifacts.theme);
    await writeJson(resolve(contractsDir, `${artifacts.theme.id}.json`), artifacts.contract);
    await writeDefinitionDir(definitionsDir, artifacts);
    buildReports.push({
      id: artifacts.theme.id,
      ...artifacts.reports,
    });
  }

  await writeJson(resolve(themesDir, 'metadata.json'), filterMetadata(buildThemeMetadata(), themeIds));
  await writeJson(resolve(reportsDir, 'official-theme-build-report.json'), {
    generatedAt: '2026-07-08T00:00:00.000Z',
    catalogVersion: OFFICIAL_CATALOG_VERSION,
    allowPartial,
    themeCount: themeIds.length,
    themeIds,
    reports: buildReports,
  });

  let index = null;
  if (!allowPartial && !themeId) {
    index = await writeThemeIndexFile({ rootDir });
  }

  return {
    themeIds,
    indexThemeCount: index?.themes?.length ?? null,
  };
}

export function parseBuildOfficialThemesArgs(argv) {
  const options = {
    themeId: null,
    allowPartial: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--theme') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--theme requires a theme id.');
      }
      options.themeId = value;
      index += 1;
    } else if (arg === '--allow-partial') {
      options.allowPartial = true;
    } else {
      throw new Error(`Unknown argument: ${arg}.`);
    }
  }

  if (options.themeId && !options.allowPartial) {
    throw new Error('--theme requires --allow-partial for iterative single-theme builds.');
  }
  if (!options.themeId && options.allowPartial) {
    throw new Error('--allow-partial requires --theme.');
  }

  return options;
}

async function resetGeneratedDirs(dirs) {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
}

async function writeDefinitionDir(definitionsDir, artifacts) {
  const definitionDir = resolve(definitionsDir, artifacts.theme.id);
  await mkdir(definitionDir, { recursive: true });
  await writeFile(resolve(definitionDir, 'theme.mjs'), `export default ${JSON.stringify(artifacts.definition, null, 2)};\n`, 'utf8');
  await writeJson(resolve(definitionDir, 'tokens.light.json'), artifacts.theme.lightTokens ?? {});
  await writeJson(resolve(definitionDir, 'tokens.dark.json'), artifacts.theme.darkTokens ?? {});
  await writeFile(resolve(definitionDir, 'theme.css'), `${artifacts.theme.css.trim()}\n`, 'utf8');
  await writeJson(resolve(definitionDir, 'contract.json'), artifacts.contract);
}

function filterMetadata(metadata, themeIds) {
  const selected = new Set(themeIds);
  return {
    ...metadata,
    themes: Object.fromEntries(
      OFFICIAL_THEME_IDS
        .filter((themeId) => selected.has(themeId))
        .map((themeId) => [themeId, metadata.themes[themeId]]),
    ),
  };
}

async function writeJson(path, value) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
