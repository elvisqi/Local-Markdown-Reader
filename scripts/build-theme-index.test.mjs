import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import {
  buildThemeIndex,
  formatThemeIndex,
  verifyThemeIndexFile,
} from './build-theme-index.mjs';

describe('build-theme-index', () => {
  let root;

  beforeEach(async () => {
    root = join(tmpdir(), `local-markdown-reader-theme-index-${process.pid}-${Date.now()}`);
    await mkdir(join(root, 'themes', 'packages'), { recursive: true });
    await mkdir(join(root, 'themes', 'previews'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('builds a stable remote theme index from packages and metadata', async () => {
    await writeThemePackage(root, 'night-study', {
      id: 'night-study',
      name: 'Night Study',
      version: '1.0.0',
      author: 'Local Markdown Reader',
      description: 'Dark reading theme.',
      minAppVersion: '2.3.0',
      colorScheme: 'system',
      tokens: {
        '--reader-surface': '#111827',
      },
      lightTokens: {
        '--reader-page-bg': '#f8fafc',
      },
      darkTokens: {
        '--reader-page-bg': '#0f172a',
      },
      features: ['callouts', 'file-tree'],
      previewFixtures: ['longform', 'table'],
      css: '[data-theme-layout-scope="toolbar-group"] .reader-toolbar__actions { gap: 8px; }',
    });
    await writeThemePackage(root, 'ink-focus', {
      id: 'ink-focus',
      name: 'Ink Focus',
      version: '1.0.0',
      colorScheme: 'light',
      tokens: {
        '--reader-surface': '#ffffff',
      },
    });
    await writeThemePreview(root, 'ink-focus', '<svg><text>Ink Focus</text></svg>');
    await writeThemePreview(root, 'night-study', '<svg><text>Night Study</text></svg>');
    await writeMetadata(root, {
      version: 1,
      schemaVersion: 2,
      catalogVersion: '2026.07.08.1',
      updatedAt: '2026-07-06T00:00:00.000Z',
      packageBaseUrl: 'https://example.com/themes/packages/',
      previewBaseUrl: 'https://example.com/themes/previews/',
      themes: {
        'ink-focus': {
          tags: ['light', 'technical'],
          previewFixtures: ['code'],
        },
        'night-study': {
          tags: ['dark'],
        },
      },
    });

    const index = await buildThemeIndex({ rootDir: root });
    const inkPackageHash = await sha256File(join(root, 'themes', 'packages', 'ink-focus.mdv-theme.json'));
    const inkPreviewHash = await sha256File(join(root, 'themes', 'previews', 'ink-focus.svg'));
    const nightPackageHash = await sha256File(join(root, 'themes', 'packages', 'night-study.mdv-theme.json'));
    const nightPreviewHash = await sha256File(join(root, 'themes', 'previews', 'night-study.svg'));

    expect(index).toEqual({
      version: 1,
      schemaVersion: 2,
      catalogVersion: '2026.07.08.1',
      updatedAt: '2026-07-06T00:00:00.000Z',
      themes: [
        expect.objectContaining({
          id: 'ink-focus',
          downloadUrl: versionedAssetUrl('https://example.com/themes/packages/ink-focus.mdv-theme.json', '1.0.0', inkPackageHash),
          packageUrl: versionedAssetUrl('https://example.com/themes/packages/ink-focus.mdv-theme.json', '1.0.0', inkPackageHash),
          previewUrl: versionedAssetUrl('https://example.com/themes/previews/ink-focus.svg', '1.0.0', inkPreviewHash),
          sha256: inkPackageHash,
          tags: ['light', 'technical'],
          features: [],
          previewFixtures: ['code'],
        }),
        expect.objectContaining({
          id: 'night-study',
          colorScheme: 'system',
          downloadUrl: versionedAssetUrl('https://example.com/themes/packages/night-study.mdv-theme.json', '1.0.0', nightPackageHash),
          previewUrl: versionedAssetUrl('https://example.com/themes/previews/night-study.svg', '1.0.0', nightPreviewHash),
          sha256: nightPackageHash,
          tags: ['dark'],
          features: ['callouts', 'file-tree'],
          previewFixtures: ['longform', 'table'],
        }),
      ],
    });
    expect(formatThemeIndex(index)).toContain('"themes": [\n    {');

    await writeThemePreview(root, 'ink-focus', '<svg><text>Ink Focus updated</text></svg>');
    const updatedIndex = await buildThemeIndex({ rootDir: root });
    expect(updatedIndex.themes.find((theme) => theme.id === 'ink-focus')?.previewUrl)
      .not.toBe(index.themes.find((theme) => theme.id === 'ink-focus')?.previewUrl);
  });

  it('detects a stale checked-in index', async () => {
    await writeThemePackage(root, 'ink-focus', {
      id: 'ink-focus',
      name: 'Ink Focus',
      version: '1.0.0',
      colorScheme: 'light',
      tokens: {
        '--reader-surface': '#ffffff',
      },
    });
    await writeMetadata(root, {
      version: 1,
      updatedAt: '2026-07-06T00:00:00.000Z',
      packageBaseUrl: 'https://example.com/themes/packages/',
      themes: {
        'ink-focus': {
          tags: ['light'],
        },
      },
    });
    await writeFile(join(root, 'themes', 'index.json'), JSON.stringify({ version: 1, themes: [] }, null, 2));

    await expect(verifyThemeIndexFile({ rootDir: root })).rejects.toThrow('themes/index.json is out of date');
  });
});

async function writeThemePackage(root, id, content) {
  await writeFile(
    join(root, 'themes', 'packages', `${id}.mdv-theme.json`),
    `${JSON.stringify(content, null, 2)}\n`,
  );
}

async function writeThemePreview(root, id, content) {
  await writeFile(join(root, 'themes', 'previews', `${id}.svg`), content);
}

async function writeMetadata(root, content) {
  await writeFile(join(root, 'themes', 'metadata.json'), `${JSON.stringify(content, null, 2)}\n`);
}

async function sha256File(filePath) {
  return createHash('sha256').update(await readFile(filePath, 'utf8')).digest('hex');
}

function versionedAssetUrl(url, version, hash) {
  return `${url}?v=${version}&h=${hash.slice(0, 16)}`;
}
