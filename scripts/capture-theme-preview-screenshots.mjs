import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { sanitizeAndScopeThemeCss } from '../src/shared/themeCss.js';
import {
  buildVisualEvidence,
  hashText,
  OFFICIAL_SCREENSHOT_FILES,
} from './theme-rebuild/officialThemeData.mjs';
import { OFFICIAL_THEME_IDS } from './theme-rebuild/officialThemeIds.mjs';

const execFileAsync = promisify(execFile);
const ROOT = resolve(process.cwd());
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

export async function captureThemePreviewScreenshots({ rootDir = ROOT, skipCapture = false, screenshotFiles = OFFICIAL_SCREENSHOT_FILES } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const contractsDir = resolve(rootDir, 'themes/official/contracts');
  const previewsDir = resolve(rootDir, 'themes/previews');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const screenshotsDir = resolve(reportsDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });

  const themes = await readPackages(packagesDir);
  const contracts = await Promise.all(themes.map((theme) => readJson(resolve(contractsDir, `${theme.id}.json`))));
  let screenshotCount = 0;

  for (const theme of themes) {
    const themeScreenshotDir = resolve(screenshotsDir, theme.id);
    await mkdir(themeScreenshotDir, { recursive: true });
    const realDomUrl = pathToFileURL(resolve(previewsDir, 'real-dom', `${theme.id}.html`)).href;
    const svgUrl = pathToFileURL(resolve(previewsDir, `${theme.id}.svg`)).href;

    for (const screenshotFile of screenshotFiles) {
      const outputPath = resolve(themeScreenshotDir, screenshotFile);
      const url = buildCaptureUrl({ screenshotFile, realDomUrl, svgUrl });
      const windowSize = screenshotFile.includes('narrow') ? '760,1100' : '1480,960';
      if (skipCapture) {
        await writeFile(outputPath, PLACEHOLDER_PNG);
      } else {
        await captureUrl(url, outputPath, windowSize);
      }
      screenshotCount += 1;
    }
  }

  const report = buildThemeVisualReport({ themes, contracts });
  await writeFile(resolve(reportsDir, 'theme-visual-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return { screenshots: screenshotCount };
}

export function buildCaptureUrl({ screenshotFile, realDomUrl, svgUrl }) {
  if (screenshotFile === 'catalog-card.png') return svgUrl;
  if (screenshotFile === 'table-fullscreen.png') return `${realDomUrl}?mode=light&target=table`;
  if (screenshotFile === 'mermaid-fullscreen.png') return `${realDomUrl}?mode=dark&target=mermaid`;
  if (screenshotFile.startsWith('reader-details-')) {
    const mode = screenshotFile.includes('dark') ? 'dark' : 'light';
    return `${realDomUrl}?mode=${mode}&target=details`;
  }
  const mode = screenshotFile.includes('dark') ? 'dark' : 'light';
  return `${realDomUrl}?mode=${mode}`;
}

export function buildThemeVisualReport({ themes, contracts }) {
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  return {
    generatedAt: '2026-07-08T00:00:00.000Z',
    renderer: 'google-chrome-headless',
    passed: false,
    manualAcceptance: false,
    reviewedScreenshots: [],
    themes: themes.map((theme) => {
      const contract = contractById.get(theme.id);
      const sanitized = sanitizeAndScopeThemeCss(
        theme.css ?? '',
        `[data-reader-theme-id="installed:${theme.id}"][data-reader-theme-id]`,
        { themeId: theme.id },
      );
      const screenshotFiles = OFFICIAL_SCREENSHOT_FILES.map((file) => `themes/official/reports/screenshots/${theme.id}/${file}`);
      const visibleFeatureEvidence = buildVisualEvidence(theme.id, contract.nonColorFeatureIds);
      return {
        id: theme.id,
        sourceCssHash: sanitized.sourceCssHash,
        scopedCssHash: sanitized.scopedCssHash,
        resolvedTokensHash: hashText(JSON.stringify({
          tokens: theme.tokens,
          lightTokens: theme.lightTokens,
          darkTokens: theme.darkTokens,
        })),
        screenshotFiles,
        candidateFeatureIds: [...new Set(visibleFeatureEvidence.map((entry) => entry.featureId))],
        visibleFeatureEvidence,
        acceptedFeatureIds: [],
        rejectedFeatureIds: [],
        domAssertions: {
          document: true,
          headings: true,
          table: true,
          toolbar: true,
          fileTree: true,
          outline: true,
        },
      };
    }),
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

async function captureUrl(url, outputPath, windowSize) {
  await execFileAsync(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${windowSize}`,
    `--screenshot=${outputPath}`,
    url,
  ], {
    timeout: 30000,
  });
}

if (isCliEntrypoint()) {
  captureThemePreviewScreenshots().then((result) => {
    console.log(`theme preview screenshots captured: ${result.screenshots}`);
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
