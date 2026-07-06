import {
  BUILTIN_READER_THEMES,
  DEFAULT_REMOTE_THEME_INDEX_URL,
  buildBuiltinThemeStylesheet,
  buildInstalledThemeStylesheet,
  deleteInstalledTheme,
  fetchRemoteThemeIndex,
  installRemoteTheme,
  installThemePackageFromText,
  loadCachedRemoteThemeIndex,
  loadInstalledThemes,
  parseThemePackageText,
  saveCachedRemoteThemeIndex,
  scopeCss,
  serializeThemePackage,
} from './themes';

describe('themes', () => {
  it('uses the raw GitHub remote theme index by default', () => {
    expect(DEFAULT_REMOTE_THEME_INDEX_URL).toBe(
      'https://raw.githubusercontent.com/elvisqi/Local-Markdown-Reader/2.0/themes/index.json',
    );
  });

  it('parses a local theme package with tokens and css', () => {
    const theme = parseThemePackageText(JSON.stringify({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.0',
      author: 'Qi Yu',
      colorScheme: 'light',
      tokens: {
        '--reader-page-bg': '#f7f4ef',
        '--markdown-font-size': '17px',
      },
      css: '.document-reader h1 { font-weight: 700; }',
    }), 123);

    expect(theme).toMatchObject({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.0',
      author: 'Qi Yu',
      colorScheme: 'light',
      installedAt: 123,
      tokens: {
        '--reader-page-bg': '#f7f4ef',
        '--markdown-font-size': '17px',
      },
      css: '.document-reader h1 { font-weight: 700; }',
    });
  });

  it('accepts expanded reader theme tokens for richer markdown styling', () => {
    const theme = parseThemePackageText(JSON.stringify({
      id: 'rich-paper',
      name: 'Rich Paper',
      version: '1.0.0',
      tokens: {
        '--reader-radius': '10px',
        '--reader-panel-bg': '#fffdf8',
        '--reader-panel-border': '#d8d1c4',
        '--reader-accent': '#3b6f8f',
        '--reader-accent-muted': '#e5eef5',
        '--reader-selection-bg': '#d7e7f3',
        '--reader-heading-text': '#1f2933',
        '--reader-heading-font': 'Georgia, serif',
        '--reader-heading-border': '#cfd8e3',
        '--reader-inline-code-bg': '#f0ece4',
        '--reader-inline-code-text': '#2d3033',
        '--reader-task-done': '#7b8794',
        '--reader-mark-bg': '#fff4b8',
        '--reader-mark-text': '#28251f',
        '--reader-tag-bg': '#e5eef5',
        '--reader-tag-text': '#2f5f7d',
      },
    }), 123);

    expect(theme.tokens['--reader-radius']).toBe('10px');
    expect(theme.tokens['--reader-heading-font']).toBe('Georgia, serif');
    expect(theme.tokens['--reader-tag-text']).toBe('#2f5f7d');
  });

  it('ships built-in themes with the expanded token set', () => {
    for (const theme of BUILTIN_READER_THEMES) {
      const tokens = theme.tokens;

      expect(tokens['--reader-radius']).toBeTruthy();
      expect(tokens['--reader-accent']).toBeTruthy();
      expect(tokens['--reader-heading-text']).toBeTruthy();
      expect(tokens['--reader-inline-code-bg']).toBeTruthy();
      expect(tokens['--reader-mark-bg']).toBeTruthy();
    }
  });

  it('builds a scoped stylesheet for installed themes', () => {
    const theme = parseThemePackageText(JSON.stringify({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.0',
      tokens: {
        '--reader-surface': '#fffefa',
      },
      css: 'h1, .reader-app .document-reader h2 { color: var(--reader-link); }',
    }), 123);

    expect(buildInstalledThemeStylesheet(theme)).toContain('[data-reader-theme-id="installed:paper-pro"][data-reader-theme-id] {');
    expect(buildInstalledThemeStylesheet(theme)).toContain('--reader-surface: #fffefa;');
    expect(buildInstalledThemeStylesheet(theme)).toContain(
      '[data-reader-theme-id="installed:paper-pro"][data-reader-theme-id] h1, [data-reader-theme-id="installed:paper-pro"][data-reader-theme-id] .document-reader h2',
    );
  });

  it('builds built-in reader themes from registered tokens and css', () => {
    const paperTheme = BUILTIN_READER_THEMES.find((theme) => theme.id === 'builtin:paper') ?? null;
    const stylesheet = buildBuiltinThemeStylesheet(paperTheme);

    expect(stylesheet).toContain('[data-reader-theme-id="builtin:paper"][data-reader-theme-id] {');
    expect(stylesheet).toContain('--reader-surface: #fffefa;');
    expect(stylesheet).toContain('[data-reader-theme-id="builtin:paper"][data-reader-theme-id] .document-reader h1');
  });

  it('scopes selectors inside supported conditional at-rules', () => {
    expect(scopeCss('@media (max-width: 700px) { h1 { font-size: 22px; } }', '.reader-app')).toBe(
      '@media (max-width: 700px) {\n.reader-app h1 { font-size: 22px; }\n}',
    );
  });

  it('rejects remote css resources and unsupported token names', () => {
    expect(() =>
      parseThemePackageText(JSON.stringify({
        id: 'remote-css',
        name: 'Remote CSS',
        version: '1.0.0',
        css: '.document-reader { background-image: url(https://example.com/a.png); }',
      })),
    ).toThrow('主题 CSS 不能包含远程资源');

    expect(() =>
      parseThemePackageText(JSON.stringify({
        id: 'bad-token',
        name: 'Bad Token',
        version: '1.0.0',
        tokens: {
          '--global-color': '#fff',
        },
      })),
    ).toThrow('不支持的主题变量');
  });

  it('rejects unsupported package fields with a specific message', () => {
    expect(() =>
      parseThemePackageText(JSON.stringify({
        id: 'paper-pro',
        name: 'Paper Pro',
        version: '1.0.0',
        palette: {
          surface: '#fffefa',
        },
        tokens: {
          '--reader-surface': '#fffefa',
        },
      })),
    ).toThrow('主题包包含不支持的字段：palette。');
  });

  it('rejects invalid color schemes instead of silently falling back', () => {
    expect(() =>
      parseThemePackageText(JSON.stringify({
        id: 'paper-pro',
        name: 'Paper Pro',
        version: '1.0.0',
        colorScheme: 'sepia',
        tokens: {
          '--reader-surface': '#fffefa',
        },
      })),
    ).toThrow('主题包 colorScheme 必须是 system、light 或 dark。');
  });

  it('rejects optional metadata fields that are too long', () => {
    expect(() =>
      parseThemePackageText(JSON.stringify({
        id: 'paper-pro',
        name: 'Paper Pro',
        version: '1.0.0',
        author: 'a'.repeat(161),
        tokens: {
          '--reader-surface': '#fffefa',
        },
      })),
    ).toThrow('主题包 author 字段过长。');
  });

  it('installs, replaces, and deletes local themes in chrome local storage', async () => {
    const area = createStorageArea();
    const first = JSON.stringify({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.0',
      tokens: {
        '--reader-surface': '#ffffff',
      },
    });
    const replacement = JSON.stringify({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.1',
      tokens: {
        '--reader-surface': '#fffefa',
      },
    });

    await installThemePackageFromText(first, area);
    const installed = await installThemePackageFromText(replacement, area);

    expect(installed.themes).toHaveLength(1);
    expect(installed.theme.version).toBe('1.0.1');
    expect(installed.themes[0].tokens['--reader-surface']).toBe('#fffefa');

    await expect(deleteInstalledTheme('paper-pro', area)).resolves.toEqual([]);
  });

  it('rejects theme packages that require a newer app version', async () => {
    await expect(installThemePackageFromText(JSON.stringify({
      id: 'future-theme',
      name: 'Future Theme',
      version: '1.0.0',
      minAppVersion: '99.0.0',
      tokens: {
        '--reader-surface': '#ffffff',
      },
    }), createStorageArea())).rejects.toThrow('需要应用版本 99.0.0 或更高版本');
  });

  it('serializes installed themes without local installation metadata', () => {
    const theme = parseThemePackageText(JSON.stringify({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.0',
      author: 'Qi Yu',
      minAppVersion: '2.2.3',
      colorScheme: 'light',
      tokens: {
        '--reader-surface': '#fffefa',
      },
      css: '.document-reader h1 { font-weight: 700; }',
    }), 123);

    const serialized = JSON.parse(serializeThemePackage(theme)) as Record<string, unknown>;

    expect(serialized).toMatchObject({
      id: 'paper-pro',
      name: 'Paper Pro',
      version: '1.0.0',
      author: 'Qi Yu',
      minAppVersion: '2.2.3',
      colorScheme: 'light',
      tokens: {
        '--reader-surface': '#fffefa',
      },
      css: '.document-reader h1 { font-weight: 700; }',
    });
    expect(serialized.installedAt).toBeUndefined();
  });

  it('fetches and caches a compatible remote theme index', async () => {
    const area = createStorageArea();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      updatedAt: '2026-07-06T00:00:00.000Z',
      themes: [
        {
          id: 'ink-focus',
          name: 'Ink Focus',
          version: '1.0.0',
          colorScheme: 'light',
          minAppVersion: '2.3.0',
          downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
          sha256: 'a'.repeat(64),
          tags: ['light', 'writing'],
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    const index = await fetchRemoteThemeIndex({
      indexUrl: 'https://example.com/themes/index.json',
      fetcher,
      area,
    });

    expect(fetcher).toHaveBeenCalledWith('https://example.com/themes/index.json', expect.objectContaining({
      cache: 'no-store',
    }));
    expect(index.themes).toHaveLength(1);
    expect(index.themes[0]).toMatchObject({
      id: 'ink-focus',
      compatible: true,
    });
    await expect(loadCachedRemoteThemeIndex(area)).resolves.toMatchObject({
      sourceUrl: 'https://example.com/themes/index.json',
      themes: [expect.objectContaining({ id: 'ink-focus' })],
    });
  });

  it('rejects malformed remote theme indexes without overwriting cached data', async () => {
    const area = createStorageArea();
    await saveCachedRemoteThemeIndex({
      sourceUrl: 'https://example.com/themes/index.json',
      fetchedAt: 123,
      version: 1,
      updatedAt: '2026-07-06T00:00:00.000Z',
      themes: [],
    }, area);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      updatedAt: '2026-07-06T00:00:00.000Z',
      themes: [
        {
          id: 'bad-theme',
          name: 'Bad Theme',
          version: '1.0.0',
          colorScheme: 'dark',
          downloadUrl: 'javascript:alert(1)',
          sha256: 'b'.repeat(64),
        },
      ],
    })));

    await expect(fetchRemoteThemeIndex({
      indexUrl: 'https://example.com/themes/index.json',
      fetcher,
      area,
    })).rejects.toThrow('远程主题 downloadUrl 必须使用 https。');

    await expect(loadCachedRemoteThemeIndex(area)).resolves.toMatchObject({
      sourceUrl: 'https://example.com/themes/index.json',
      themes: [],
    });
  });

  it('installs remote themes only when sha256 matches the downloaded package', async () => {
    const area = createStorageArea();
    const packageText = JSON.stringify({
      id: 'ink-focus',
      name: 'Ink Focus',
      version: '1.0.0',
      colorScheme: 'light',
      tokens: {
        '--reader-surface': '#ffffff',
      },
    });
    const sha256 = await calculateTestSha256(packageText);
    const fetcher = vi.fn(async () => new Response(packageText, { status: 200 }));

    const result = await installRemoteTheme({
      entry: {
        id: 'ink-focus',
        name: 'Ink Focus',
        version: '1.0.0',
        colorScheme: 'light',
        compatible: true,
        downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
        sha256,
        tags: [],
      },
      fetcher,
      area,
    });

    expect(fetcher).toHaveBeenCalledWith('https://example.com/themes/ink-focus.mdv-theme.json', expect.objectContaining({
      cache: 'no-store',
    }));
    expect(result.theme.id).toBe('ink-focus');
    await expect(loadInstalledThemes(area)).resolves.toEqual([
      expect.objectContaining({ id: 'ink-focus' }),
    ]);
  });

  it('rejects remote theme downloads with mismatched sha256 hashes', async () => {
    const area = createStorageArea();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: 'ink-focus',
      name: 'Ink Focus',
      version: '1.0.0',
      colorScheme: 'light',
      tokens: {
        '--reader-surface': '#ffffff',
      },
    }), { status: 200 }));

    await expect(installRemoteTheme({
      entry: {
        id: 'ink-focus',
        name: 'Ink Focus',
        version: '1.0.0',
        colorScheme: 'light',
        compatible: true,
        downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
        sha256: '0'.repeat(64),
        tags: [],
      },
      fetcher,
      area,
    })).rejects.toThrow('远程主题校验失败');

    await expect(loadInstalledThemes(area)).resolves.toEqual([]);
  });
});

function createStorageArea(): chrome.storage.StorageArea {
  const values = new Map<string, unknown>();

  return {
    get: vi.fn(async (key: string) => ({ [key]: values.get(key) })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        values.set(key, value);
      }
    }),
  } as unknown as chrome.storage.StorageArea;
}

async function calculateTestSha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
