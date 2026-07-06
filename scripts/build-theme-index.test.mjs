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
      colorScheme: 'dark',
      tokens: {
        '--reader-surface': '#111827',
      },
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
      updatedAt: '2026-07-06T00:00:00.000Z',
      packageBaseUrl: 'https://example.com/themes/packages/',
      themes: {
        'ink-focus': {
          tags: ['light', 'technical'],
        },
        'night-study': {
          tags: ['dark'],
          previewUrl: 'https://example.com/previews/night-study.png',
        },
      },
    });

    const index = await buildThemeIndex({ rootDir: root });

    expect(index).toEqual({
      version: 1,
      updatedAt: '2026-07-06T00:00:00.000Z',
      themes: [
        expect.objectContaining({
          id: 'ink-focus',
          downloadUrl: 'https://example.com/themes/packages/ink-focus.mdv-theme.json',
          sha256: await sha256File(join(root, 'themes', 'packages', 'ink-focus.mdv-theme.json')),
          tags: ['light', 'technical'],
        }),
        expect.objectContaining({
          id: 'night-study',
          previewUrl: 'https://example.com/previews/night-study.png',
          sha256: await sha256File(join(root, 'themes', 'packages', 'night-study.mdv-theme.json')),
          tags: ['dark'],
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
