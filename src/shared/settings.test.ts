import { DEFAULT_SETTINGS, loadSettings, mergeSettings, saveSettings } from './settings';

describe('settings', () => {
  it('defines reading, rendering, and UI defaults', () => {
    expect(DEFAULT_SETTINGS.reading.theme).toBe('system');
    expect(DEFAULT_SETTINGS.reading.width).toBe('comfortable');
    expect(DEFAULT_SETTINGS.reading.style).toBe('clean');
    expect(DEFAULT_SETTINGS.reading.rawMode).toBe(false);
    expect(DEFAULT_SETTINGS.rendering.syntaxHighlighting).toBe(true);
    expect(DEFAULT_SETTINGS.rendering.mermaid).toBe(true);
    expect(DEFAULT_SETTINGS.rendering.mathJax).toBe(true);
    expect(DEFAULT_SETTINGS.ui.popupTheme).toBe('system');
  });

  it('merges partial settings without dropping new defaults', () => {
    const merged = mergeSettings({
      reading: {
        theme: 'dark',
      },
      rendering: {
        mermaid: false,
      },
    });

    expect(merged.reading.theme).toBe('dark');
    expect(merged.reading.width).toBe(DEFAULT_SETTINGS.reading.width);
    expect(merged.reading.style).toBe(DEFAULT_SETTINGS.reading.style);
    expect(merged.rendering.mermaid).toBe(false);
    expect(merged.rendering.syntaxHighlighting).toBe(true);
    expect(merged.ui.popupTheme).toBe('system');
  });

  it('preserves a selected reading style template', () => {
    const merged = mergeSettings({
      reading: {
        style: 'paper',
      },
    });

    expect(merged.reading.style).toBe('paper');
  });

  it('loads defaults and saves as a no-op when chrome storage is unavailable', async () => {
    const loaded = await loadSettings();

    await expect(saveSettings(loaded)).resolves.toBeUndefined();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });
});
