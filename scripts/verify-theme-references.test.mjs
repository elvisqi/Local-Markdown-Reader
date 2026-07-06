import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadThemeReferenceCatalog, verifyThemeReferenceCatalog } from './verify-theme-references.mjs';

describe('verify-theme-references', () => {
  let root;

  beforeEach(async () => {
    root = join(tmpdir(), `local-markdown-reader-theme-references-${process.pid}-${Date.now()}`);
    await mkdir(join(root, 'themes', 'references'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('validates source coverage and candidate metadata for theme research', async () => {
    await writeCatalog(root, {
      version: 1,
      updatedAt: '2026-07-06',
      target: {
        total: 100,
        perEcosystem: {
          obsidian: 50,
          vscode: 50,
        },
      },
      sources: [
        {
          id: 'obsidian-community-themes',
          ecosystem: 'obsidian',
          name: 'Obsidian Community Themes',
          url: 'https://community.obsidian.md/search?type=theme',
          selectionTarget: 50,
        },
        {
          id: 'vscode-marketplace-themes',
          ecosystem: 'vscode',
          name: 'Visual Studio Code Marketplace Themes',
          url: 'https://marketplace.visualstudio.com/search?target=VSCode&category=Themes&sortBy=Installs',
          selectionTarget: 50,
        },
      ],
      candidates: [
        {
          id: 'obsidian:minimal',
          ecosystem: 'obsidian',
          sourceId: 'obsidian-community-themes',
          name: 'Minimal',
          author: 'Kepano',
          sourceUrl: 'https://github.com/kepano/obsidian-minimal',
          license: {
            status: 'needs-review',
          },
          usage: 'inspiration-only',
          reviewStatus: 'candidate',
          colorScheme: 'system',
          tags: ['minimal', 'notes'],
          notes: 'Reference candidate only; do not copy CSS without license review.',
        },
      ],
    });

    const catalog = await loadThemeReferenceCatalog({ rootDir: root });

    expect(catalog.candidates).toHaveLength(1);
    await expect(verifyThemeReferenceCatalog({ rootDir: root })).resolves.toEqual({
      candidates: 1,
      sources: 2,
      target: 100,
    });
  });

  it('rejects unsafe candidate source URLs', async () => {
    await writeCatalog(root, {
      version: 1,
      updatedAt: '2026-07-06',
      target: {
        total: 100,
        perEcosystem: {
          obsidian: 50,
          vscode: 50,
        },
      },
      sources: [
        {
          id: 'obsidian-community-themes',
          ecosystem: 'obsidian',
          name: 'Obsidian Community Themes',
          url: 'https://community.obsidian.md/search?type=theme',
          selectionTarget: 50,
        },
        {
          id: 'vscode-marketplace-themes',
          ecosystem: 'vscode',
          name: 'Visual Studio Code Marketplace Themes',
          url: 'https://marketplace.visualstudio.com/search?target=VSCode&category=Themes&sortBy=Installs',
          selectionTarget: 50,
        },
      ],
      candidates: [
        createCandidate({
          id: 'obsidian:bad',
          sourceUrl: 'javascript:alert(1)',
        }),
      ],
    });

    await expect(verifyThemeReferenceCatalog({ rootDir: root })).rejects.toThrow('sourceUrl must use https');
  });

  it('rejects duplicate candidate ids', async () => {
    await writeCatalog(root, {
      version: 1,
      updatedAt: '2026-07-06',
      target: {
        total: 100,
        perEcosystem: {
          obsidian: 50,
          vscode: 50,
        },
      },
      sources: [
        {
          id: 'obsidian-community-themes',
          ecosystem: 'obsidian',
          name: 'Obsidian Community Themes',
          url: 'https://community.obsidian.md/search?type=theme',
          selectionTarget: 50,
        },
        {
          id: 'vscode-marketplace-themes',
          ecosystem: 'vscode',
          name: 'Visual Studio Code Marketplace Themes',
          url: 'https://marketplace.visualstudio.com/search?target=VSCode&category=Themes&sortBy=Installs',
          selectionTarget: 50,
        },
      ],
      candidates: [
        createCandidate({
          id: 'obsidian:bad',
          sourceUrl: 'https://example.com/theme-a',
        }),
        createCandidate({
          id: 'obsidian:bad',
          sourceUrl: 'https://example.com/theme-b',
        }),
      ],
    });

    await expect(verifyThemeReferenceCatalog({ rootDir: root })).rejects.toThrow('Duplicate reference candidate id');
  });
});

function createCandidate(overrides = {}) {
  return {
    id: 'obsidian:sample',
    ecosystem: 'obsidian',
    sourceId: 'obsidian-community-themes',
    name: 'Sample',
    sourceUrl: 'https://example.com/theme',
    license: {
      status: 'needs-review',
    },
    usage: 'inspiration-only',
    reviewStatus: 'candidate',
    colorScheme: 'system',
    tags: [],
    ...overrides,
  };
}

async function writeCatalog(root, content) {
  await writeFile(
    join(root, 'themes', 'references', 'catalog.json'),
    `${JSON.stringify(content, null, 2)}\n`,
  );
}
