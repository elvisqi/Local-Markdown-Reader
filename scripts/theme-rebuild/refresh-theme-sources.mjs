import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { updateThemeSourceLock } from './update-theme-source-lock.mjs';

const ROOT = resolve(process.cwd());

export async function refreshThemeSources({ rootDir = ROOT } = {}) {
  const manifestPath = resolve(rootDir, 'themes/official/sources/source-manifest.json');
  try {
    await access(manifestPath);
  } catch {
    throw new Error('source-manifest.json is missing. Run npm run themes:sources:update-lock -- --all first.');
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const result = await updateThemeSourceLock({ rootDir });
  return {
    refreshed: result.updated,
    pinnedCommits: manifest.sources?.map((source) => source.upstream?.commit).filter(Boolean) ?? [],
  };
}

if (isCliEntrypoint()) {
  refreshThemeSources().then((result) => {
    console.log(`theme sources refreshed: ${result.refreshed}`);
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
