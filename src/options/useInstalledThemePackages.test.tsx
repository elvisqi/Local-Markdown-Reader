import { act, renderHook, waitFor } from '@testing-library/react';

import { useInstalledThemePackages } from './useInstalledThemePackages';
import {
  inkFocusTheme,
  installedPaperTheme,
} from './testThemeFixtures';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { ReaderSettings, RemoteThemeIndex } from '../shared/types';

function createSettings(themeId: ReaderSettings['reading']['themeId'] = DEFAULT_SETTINGS.reading.themeId): ReaderSettings {
  return {
    ...DEFAULT_SETTINGS,
    reading: {
      ...DEFAULT_SETTINGS.reading,
      themeId,
    },
  };
}

describe('useInstalledThemePackages', () => {
  let onSettingsChange: (settings: ReaderSettings) => Promise<void>;
  let onSettingsChangeSpy: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSettingsChangeSpy = vi.fn(async () => undefined);
    onSettingsChange = onSettingsChangeSpy as unknown as (settings: ReaderSettings) => Promise<void>;
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads installed themes and prepares replacement previews', async () => {
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    localGet.mockResolvedValue({
      readerThemePackages: [installedPaperTheme],
    });

    const { result } = renderHook(() =>
      useInstalledThemePackages({
        settings: createSettings('installed:paper-pro'),
        onSettingsChange,
      }),
    );

    await waitFor(() => expect(result.current.installedThemes).toHaveLength(1));

    expect(result.current.selectedTheme).toEqual(installedPaperTheme);

    const updatedTheme = { ...installedPaperTheme, version: '1.1.0', installedAt: 789 };
    act(() => {
      result.current.previewTheme(updatedTheme);
    });

    expect(result.current.pendingTheme).toEqual(updatedTheme);
    expect(result.current.pendingExistingTheme).toEqual(installedPaperTheme);
    expect(result.current.themeStatus).toBe('检测到已安装主题：Paper Pro 1.0.0，将更新为 1.1.0。');
  });

  it('installs catalog themes and applies them to reader settings', async () => {
    const { result } = renderHook(() =>
      useInstalledThemePackages({
        settings: createSettings(),
        onSettingsChange,
      }),
    );

    await act(async () => {
      await result.current.installCatalogTheme(inkFocusTheme);
    });

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        readerThemePackages: [
          expect.objectContaining({
            id: 'ink-focus',
            version: '1.0.0',
          }),
        ],
      }),
    );
    expect(onSettingsChangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reading: expect.objectContaining({
          themeId: 'installed:ink-focus',
        }),
      }),
    );
    expect(result.current.themeStatus).toBe('已安装主题：Ink Focus。');
  });

  it('removes the active installed theme and restores the default reader theme', async () => {
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    localGet.mockResolvedValue({
      readerThemePackages: [installedPaperTheme],
    });

    const { result } = renderHook(() =>
      useInstalledThemePackages({
        settings: createSettings('installed:paper-pro'),
        onSettingsChange,
      }),
    );

    await waitFor(() => expect(result.current.installedThemes).toHaveLength(1));

    await act(async () => {
      await result.current.removeInstalledTheme(installedPaperTheme);
    });

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        readerThemePackages: [],
      }),
    );
    expect(onSettingsChangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reading: expect.objectContaining({
          themeId: DEFAULT_SETTINGS.reading.themeId,
        }),
      }),
    );
    expect(result.current.themeStatus).toBe('已删除主题：Paper Pro。');
  });

  it('loads cached remote themes and refreshes the remote theme source', async () => {
    const localGet = chrome.storage.local.get as unknown as ReturnType<typeof vi.fn>;
    localGet.mockResolvedValue({
      readerRemoteThemeIndex: createRemoteThemeIndex(),
    });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({
      version: 1,
      updatedAt: '2026-07-07T00:00:00.000Z',
      themes: [
        {
          id: 'night-study',
          name: 'Night Study',
          version: '1.0.0',
          colorScheme: 'dark',
          downloadUrl: 'https://example.com/themes/night-study.mdv-theme.json',
          sha256: 'b'.repeat(64),
          tags: ['dark'],
        },
      ],
    }), { status: 200 }));

    const { result } = renderHook(() =>
      useInstalledThemePackages({
        settings: createSettings(),
        onSettingsChange,
      }),
    );

    await waitFor(() => expect(result.current.remoteThemeIndex?.themes[0].id).toBe('ink-focus'));

    await act(async () => {
      await result.current.refreshRemoteThemes();
    });

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/themes/index.json'), expect.objectContaining({
      cache: 'no-store',
    }));
    expect(result.current.remoteThemeIndex?.themes[0].id).toBe('night-study');
    expect(result.current.remoteThemeStatus).toBe('已更新远程主题源：1 个主题。');
  });

  it('downloads remote themes, installs them, and applies them', async () => {
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
    fetchSpy.mockResolvedValue(new Response(packageText, { status: 200 }));

    const { result } = renderHook(() =>
      useInstalledThemePackages({
        settings: createSettings(),
        onSettingsChange,
      }),
    );

    await act(async () => {
      await result.current.installRemoteThemeEntry({
        id: 'ink-focus',
        name: 'Ink Focus',
        version: '1.0.0',
        colorScheme: 'light',
        compatible: true,
        downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
        sha256,
        tags: [],
      });
    });

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        readerThemePackages: [
          expect.objectContaining({
            id: 'ink-focus',
            version: '1.0.0',
          }),
        ],
      }),
    );
    expect(onSettingsChangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reading: expect.objectContaining({
          themeId: 'installed:ink-focus',
        }),
      }),
    );
    expect(result.current.remoteThemeStatus).toBe('已安装远程主题：Ink Focus。');
  });

  it('downloads remote themes for preview without installing or applying them', async () => {
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
    fetchSpy.mockResolvedValue(new Response(packageText, { status: 200 }));

    const { result } = renderHook(() =>
      useInstalledThemePackages({
        settings: createSettings(),
        onSettingsChange,
      }),
    );

    await act(async () => {
      await result.current.previewRemoteThemeEntry({
        id: 'ink-focus',
        name: 'Ink Focus',
        version: '1.0.0',
        colorScheme: 'light',
        compatible: true,
        downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
        sha256,
        tags: [],
      });
    });

    expect(fetchSpy).toHaveBeenCalledWith(`https://example.com/themes/ink-focus.mdv-theme.json?sha256=${sha256}`, expect.objectContaining({
      cache: 'no-store',
    }));
    expect(result.current.pendingTheme).toEqual(expect.objectContaining({
      id: 'ink-focus',
      version: '1.0.0',
    }));
    expect(result.current.remoteThemeStatus).toBe('远程主题已准备好：Ink Focus。');
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(onSettingsChangeSpy).not.toHaveBeenCalled();
  });
});

function createRemoteThemeIndex(): RemoteThemeIndex {
  return {
    sourceUrl: 'https://example.com/themes/index.json',
    fetchedAt: 123,
    version: 1,
    updatedAt: '2026-07-06T00:00:00.000Z',
    themes: [
      {
        id: 'ink-focus',
        name: 'Ink Focus',
        version: '1.0.0',
        colorScheme: 'light',
        compatible: true,
        downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
        sha256: 'a'.repeat(64),
        tags: ['light'],
      },
    ],
  };
}

async function calculateTestSha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
