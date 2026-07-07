import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const THEME_PACKAGE_SUFFIX = '.mdv-theme.json';

export async function captureThemePreviewScreenshots({ rootDir = ROOT } = {}) {
  const packagesDir = resolve(rootDir, 'themes/packages');
  const previewsDir = resolve(rootDir, 'themes/previews');
  const reportsDir = resolve(rootDir, 'themes/official/reports');
  const screenshotsDir = resolve(reportsDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });

  const themeIds = (await readdir(packagesDir))
    .filter((file) => file.endsWith(THEME_PACKAGE_SUFFIX))
    .map((file) => file.slice(0, -THEME_PACKAGE_SUFFIX.length))
    .sort((a, b) => a.localeCompare(b));

  await captureUrl(pathToFileURL(resolve(previewsDir, 'index.html')).href, resolve(screenshotsDir, 'index.png'), '1480,1200');
  for (const themeId of themeIds) {
    await captureUrl(pathToFileURL(resolve(previewsDir, `${themeId}.svg`)).href, resolve(screenshotsDir, `${themeId}.png`), '960,540');
  }

  const visualReportPath = resolve(reportsDir, 'theme-visual-report.json');
  const visual = JSON.parse(await readFile(visualReportPath, 'utf8'));
  visual.renderer = 'google-chrome-headless';
  visual.screenshotCapturedAt = '2026-07-08T00:00:00.000Z';
  visual.indexScreenshot = 'themes/official/reports/screenshots/index.png';
  visual.themes = visual.themes.map((entry) => ({
    ...entry,
    screenshots: {
      light: `themes/official/reports/screenshots/${entry.id}.png#light-half`,
      dark: `themes/official/reports/screenshots/${entry.id}.png#dark-half`,
      composite: `themes/official/reports/screenshots/${entry.id}.png`,
    },
  }));
  await writeFile(visualReportPath, `${JSON.stringify(visual, null, 2)}\n`, 'utf8');

  return { screenshots: themeIds.length + 1 };
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  captureThemePreviewScreenshots().then((result) => {
    console.log(`theme preview screenshots captured: ${result.screenshots}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
