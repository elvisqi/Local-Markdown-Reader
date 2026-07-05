import {
  BUILTIN_READER_THEMES,
  buildBuiltinThemeStylesheet,
  buildInstalledThemeStylesheet,
  deleteInstalledTheme,
  installThemePackageFromText,
  parseThemePackageText,
  scopeCss,
  serializeThemePackage,
} from './themes';

describe('themes', () => {
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
