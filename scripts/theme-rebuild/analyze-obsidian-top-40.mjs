import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OBSIDIAN_STATS_SNAPSHOT_AT, OBSIDIAN_TOP_40, OFFICIAL_THEME_DIRECTIONS } from './obsidianTop40.mjs';
import { analyzeObsidianSourceCss, chooseThemeCssFiles } from './obsidianSourceAnalysis.mjs';

const ROOT = resolve(process.cwd());

export async function analyzeObsidianTop40({ rootDir = ROOT, refresh = false } = {}) {
  const cacheDir = resolve(rootDir, 'themes/official/.cache/obsidian-top-40');
  const reportPath = resolve(rootDir, 'themes/official/sources/obsidian-top-40-analysis.json');
  await mkdir(cacheDir, { recursive: true });

  const themes = [];
  for (const source of OBSIDIAN_TOP_40) {
    const repoDir = resolve(cacheDir, repoCacheName(source.repo));
    if (refresh) {
      await rm(repoDir, { recursive: true, force: true });
    }
    const cacheMetadataPath = resolve(repoDir, 'source.json');
    if (!await exists(cacheMetadataPath)) {
      process.stdout.write(`[${source.rank}/40] downloading ${source.name}\n`);
      await downloadRepositoryCss(source.repo, repoDir);
    } else {
      process.stdout.write(`[${source.rank}/40] reading ${source.name}\n`);
    }

    const cacheMetadata = JSON.parse(await readFile(cacheMetadataPath, 'utf8'));
    const commit = cacheMetadata.commit;
    const selectedFiles = cacheMetadata.cssFiles;
    if (!selectedFiles.length) {
      throw new Error(`${source.name}: no distributable CSS file found in ${source.repo}.`);
    }

    const fileReports = [];
    const aggregateCss = [];
    for (const file of selectedFiles) {
      const css = await readFile(resolve(repoDir, file.path), 'utf8');
      aggregateCss.push(css);
      fileReports.push({
        path: file.path,
        ...analyzeObsidianSourceCss(css),
      });
    }

    themes.push({
      ...source,
      commit,
      repositoryUrl: `https://github.com/${source.repo}`,
      cssFiles: fileReports,
      aggregate: analyzeObsidianSourceCss(aggregateCss.join('\n')),
    });
  }

  const report = {
    schemaVersion: 1,
    statsSnapshotAt: OBSIDIAN_STATS_SNAPSHOT_AT,
    generatedAt: new Date().toISOString(),
    sourceCount: themes.length,
    selectionMethod: 'Obsidian official all-time theme download ranking; top 40, then non-color feature clustering.',
    themes,
    directions: OFFICIAL_THEME_DIRECTIONS.map((direction) => ({
      ...direction,
      sourceRanks: direction.references.map((name) => themes.find((theme) => theme.name === name)?.rank),
      aggregateComponentRules: sumDirectionMetrics(direction, themes, 'componentRules'),
      aggregatePropertyFamilies: sumDirectionMetrics(direction, themes, 'propertyFamilies'),
    })),
  };
  await mkdir(resolve(reportPath, '..'), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

async function downloadRepositoryCss(repo, destination) {
  const commitInfo = await resolveCommitInfo(repo);
  const commit = commitInfo.sha;
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(`${repo}: unable to resolve HEAD commit.`);
  }

  let selectedFiles = [];
  let downloadedCss = null;
  for (const path of ['theme.css', 'obsidian.css']) {
    try {
      const response = await fetchRaw(repo, commit, path);
      if (response.ok) {
        downloadedCss = await response.text();
        selectedFiles = [{ path, bytes: Buffer.byteLength(downloadedCss, 'utf8') }];
        break;
      }
    } catch {
      // The GitHub API blob endpoint below is the fallback for unreliable raw CDN responses.
    }
  }

  if (!selectedFiles.length) {
    try {
      const treeSha = commitInfo.commit?.tree?.sha ?? commit;
      const tree = await fetchJson(`https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=1`);
      const cssCandidates = (tree.tree ?? [])
        .filter((entry) => entry.type === 'blob' && entry.path?.toLowerCase().endsWith('.css'))
        .map((entry) => ({ path: entry.path, bytes: entry.size ?? 0, sha: entry.sha }));
      selectedFiles = chooseThemeCssFiles(cssCandidates);
    } catch {
      const archive = await downloadArchiveCss(repo, commit, destination);
      selectedFiles = [archive.file];
      downloadedCss = archive.css;
    }
  }
  if (!selectedFiles.length) throw new Error(`${repo}: no distributable CSS file found.`);

  await mkdir(destination, { recursive: true });
  let file = selectedFiles[0];
  if (downloadedCss === null) {
    try {
      const response = await fetchRaw(repo, commit, file.path);
      if (response.ok) downloadedCss = await response.text();
    } catch {
      downloadedCss = null;
    }
    if (downloadedCss === null && file.sha) {
      try {
        const blob = await fetchJson(`https://api.github.com/repos/${repo}/git/blobs/${file.sha}`);
        downloadedCss = Buffer.from(String(blob.content ?? '').replace(/\s+/g, ''), 'base64').toString('utf8');
      } catch {
        const archive = await downloadArchiveCss(repo, commit, destination);
        file = archive.file;
        downloadedCss = archive.css;
      }
    }
    if (downloadedCss === null) throw new Error(`${repo}/${file.path}: CSS download failed.`);
  }
  selectedFiles = [{ ...file, bytes: Buffer.byteLength(downloadedCss, 'utf8') }];
  const outputPath = resolve(destination, file.path);
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, downloadedCss, 'utf8');
  await writeFile(resolve(destination, 'source.json'), `${JSON.stringify({ commit, cssFiles: selectedFiles }, null, 2)}\n`, 'utf8');
}

async function resolveCommitInfo(repo) {
  try {
    return await fetchJson(`https://api.github.com/repos/${repo}/commits/HEAD`);
  } catch {
    const sha = (await retry(async () => execFileSync(
      'git',
      ['ls-remote', `https://github.com/${repo}.git`, 'HEAD'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45_000 },
    ))).trim().split(/\s+/)[0];
    return { sha };
  }
}

async function downloadArchiveCss(repo, commit, destination) {
  const archiveRoot = resolve(destination, '.archive');
  const archivePath = resolve(destination, 'source.tar.gz');
  await rm(archiveRoot, { recursive: true, force: true });
  await mkdir(archiveRoot, { recursive: true });
  const response = await retry(() => fetch(
    `https://codeload.github.com/${repo}/tar.gz/${commit}`,
    { signal: AbortSignal.timeout(90_000) },
  ));
  if (!response.ok) throw new Error(`${repo}: codeload archive failed (${response.status}).`);
  await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
  execFileSync('tar', ['-xzf', archivePath, '-C', archiveRoot, '--strip-components=1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000,
  });
  const selected = chooseThemeCssFiles(await listCssFiles(archiveRoot));
  if (!selected.length) throw new Error(`${repo}: archive contains no distributable CSS.`);
  const css = await readFile(resolve(archiveRoot, selected[0].path), 'utf8');
  await rm(archiveRoot, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  return { file: selected[0], css };
}

async function listCssFiles(rootDir) {
  const files = [];
  await walkCssFiles(rootDir, rootDir, files);
  return files;
}

async function walkCssFiles(rootDir, currentDir, files) {
  for (const entry of await readdir(currentDir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkCssFiles(rootDir, path, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.css')) {
      files.push({ path: relative(rootDir, path).replaceAll('\\', '/'), bytes: (await stat(path)).size });
    }
  }
}

function fetchRaw(repo, commit, path) {
  return retry(() => fetch(
    `https://raw.githubusercontent.com/${repo}/${commit}/${encodePath(path)}`,
    { signal: AbortSignal.timeout(20_000) },
  ), 1);
}

async function fetchJson(url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'local-markdown-reader-theme-analysis' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await retry(() => fetch(url, { headers, signal: AbortSignal.timeout(45_000) }));
  if (!response.ok) {
    throw new Error(`${url}: GitHub API request failed (${response.status}).`);
  }
  return response.json();
}

async function retry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
    }
  }
  throw lastError;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function sumDirectionMetrics(direction, themes, field) {
  const sums = {};
  for (const name of direction.references) {
    const metrics = themes.find((theme) => theme.name === name)?.aggregate?.[field] ?? {};
    for (const [key, value] of Object.entries(metrics)) {
      sums[key] = (sums[key] ?? 0) + value;
    }
  }
  return sums;
}

function repoCacheName(repo) {
  return basename(repo).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const unknown = argv.filter((arg) => arg !== '--refresh');
  if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(', ')}`);
  return { refresh: argv.includes('--refresh') };
}

function isCliEntrypoint() {
  return process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isCliEntrypoint()) {
  analyzeObsidianTop40(parseArgs(process.argv.slice(2))).then((report) => {
    console.log(`Obsidian source analysis complete: ${report.sourceCount} themes.`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
