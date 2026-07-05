import { act, renderHook, waitFor } from '@testing-library/react';

import { useInstalledThemePackages } from './useInstalledThemePackages';
import {
  inkFocusTheme,
  installedPaperTheme,
} from './testThemeFixtures';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { ReaderSettings } from '../shared/types';

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

  beforeEach(() => {
    vi.clearAllMocks();
    onSettingsChangeSpy = vi.fn(async () => undefined);
    onSettingsChange = onSettingsChangeSpy as unknown as (settings: ReaderSettings) => Promise<void>;
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
});
