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

    expect(index).toEqual({
      version: 1,
      schemaVersion: 2,
      catalogVersion: '2026.07.08.1',
      updatedAt: '2026-07-06T00:00:00.000Z',
      themes: [
        expect.objectContaining({
          id: 'ink-focus',
          downloadUrl: 'https://example.com/themes/packages/ink-focus.mdv-theme.json?v=1.0.0',
          packageUrl: 'https://example.com/themes/packages/ink-focus.mdv-theme.json?v=1.0.0',
          previewUrl: 'https://example.com/themes/previews/ink-focus.svg?v=1.0.0',
          sha256: await sha256File(join(root, 'themes', 'packages', 'ink-focus.mdv-theme.json')),
          tags: ['light', 'technical'],
          features: [],
          previewFixtures: ['code'],
        }),
        expect.objectContaining({
          id: 'night-study',
          colorScheme: 'system',
          downloadUrl: 'https://example.com/themes/packages/night-study.mdv-theme.json?v=1.0.0',
          previewUrl: 'https://example.com/themes/previews/night-study.svg?v=1.0.0',
          sha256: await sha256File(join(root, 'themes', 'packages', 'night-study.mdv-theme.json')),
          tags: ['dark'],
          features: ['callouts', 'file-tree'],
          previewFixtures: ['longform', 'table'],
        }),
      ],
    });
    expect(formatThemeIndex(index)).toContain('"themes": [\n    {');
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

async function writeMetadata(root, content) {
  await writeFile(join(root, 'themes', 'metadata.json'), `${JSON.stringify(content, null, 2)}\n`);
}

async function sha256File(filePath) {
  return createHash('sha256').update(await readFile(filePath, 'utf8')).digest('hex');
}
