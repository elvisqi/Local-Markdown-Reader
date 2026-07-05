import { DEFAULT_SETTINGS, loadSettings, mergeSettings, saveSettings, subscribeSettings } from './settings';

describe('settings', () => {
  it('defines reading, rendering, and UI defaults', () => {
    expect(DEFAULT_SETTINGS.reading.colorMode).toBe('system');
    expect(DEFAULT_SETTINGS.reading.themeId).toBe('builtin:paper');
    expect(DEFAULT_SETTINGS.reading.width).toBe('comfortable');
    expect(DEFAULT_SETTINGS.reading.rawMode).toBe(false);
    expect(DEFAULT_SETTINGS.rendering.syntaxHighlighting).toBe(true);
    expect(DEFAULT_SETTINGS.rendering.mermaid).toBe(true);
    expect(DEFAULT_SETTINGS.rendering.mathJax).toBe(true);
    expect(DEFAULT_SETTINGS.ui.popupColorMode).toBe('system');
  });

  it('merges partial settings without dropping new defaults', () => {
    const merged = mergeSettings({
      reading: {
        colorMode: 'dark',
      },
      rendering: {
        mermaid: false,
      },
    });

    expect(merged.reading.colorMode).toBe('dark');
    expect(merged.reading.themeId).toBe(DEFAULT_SETTINGS.reading.themeId);
    expect(merged.reading.width).toBe(DEFAULT_SETTINGS.reading.width);
    expect(merged.rendering.mermaid).toBe(false);
    expect(merged.rendering.syntaxHighlighting).toBe(true);
    expect(merged.ui.popupColorMode).toBe('system');
  });

  it('preserves a selected reader theme', () => {
    const merged = mergeSettings({
      reading: {
        themeId: 'builtin:github',
      },
    });

    expect(merged.reading.themeId).toBe('builtin:github');
  });

  it('migrates legacy theme fields to color mode and reader theme ids', () => {
    const merged = mergeSettings({
      reading: {
        theme: 'dark',
        style: 'classic',
      },
      ui: {
        popupTheme: 'light',
      },
    });

    expect(merged.reading.colorMode).toBe('dark');
    expect(merged.reading.themeId).toBe('builtin:classic');
    expect(merged.ui.popupColorMode).toBe('light');
  });

  it('migrates legacy installed theme package selections', () => {
    const merged = mergeSettings({
      reading: {
        themePackageId: 'paper-pro',
      },
    });

    expect(merged.reading.themeId).toBe('installed:paper-pro');
  });

  it('loads defaults and saves as a no-op when chrome storage is unavailable', async () => {
    const loaded = await loadSettings();

    await expect(saveSettings(loaded)).resolves.toBeUndefined();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it('subscribes to synced setting changes', () => {
    const onChange = vi.fn();
    type StorageChangeListener = Parameters<typeof chrome.storage.onChanged.addListener>[0];
    let listener: StorageChangeListener | undefined;
    const addListener = vi.fn((callback: StorageChangeListener) => {
      listener = callback;
    });
    const removeListener = vi.fn();
    const storage = {
      onChanged: {
        addListener,
        removeListener,
      },
    } as unknown as typeof chrome.storage;

    const unsubscribe = subscribeSettings(onChange, storage);
    listener?.(
      {
        readerSettings: {
          newValue: {
            reading: {
              style: 'github',
            },
          },
        },
      },
      'sync',
    );

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      reading: {
        ...DEFAULT_SETTINGS.reading,
        themeId: 'builtin:github',
      },
    });

    listener?.(
      {
        otherKey: {
          newValue: {},
        },
      },
      'sync',
    );
    listener?.(
      {
        readerSettings: {
          newValue: {
            reading: {
              style: 'classic',
            },
          },
        },
      },
      'local',
    );
    unsubscribe();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledWith(listener);
  });
});
