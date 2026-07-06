import type { ColorModePreference, DeepPartial, ReaderSettings, ReadingStyle } from './types';
import {
  createBuiltinReaderThemeId,
  createInstalledReaderThemeId,
  DEFAULT_READER_THEME_ID,
} from './themes';

const SETTINGS_KEY = 'readerSettings';
const COLOR_MODE_VALUES = new Set<ColorModePreference>(['system', 'light', 'dark']);
const READING_STYLE_VALUES = new Set<ReadingStyle>(['clean', 'github', 'paper', 'classic']);
const READER_THEME_ID_PATTERN = /^(?:builtin:(?:clean|github|paper|classic)|installed:[a-z0-9][a-z0-9._-]{1,63})$/i;

export const DEFAULT_SETTINGS: ReaderSettings = {
  reading: {
    colorMode: 'system',
    themeId: DEFAULT_READER_THEME_ID,
    width: 'comfortable',
    rawMode: false,
    showOutline: true,
    autoReload: false,
  },
  rendering: {
    syntaxHighlighting: true,
    mermaid: true,
    mathJax: true,
    emoji: false,
    customCss: '',
  },
  ui: {
    popupColorMode: 'system',
    iconTheme: 'default',
  },
};

type LegacySettings = {
  reading?: {
    theme?: unknown;
    themePackageId?: unknown;
    style?: unknown;
    colorMode?: unknown;
    themeId?: unknown;
  };
  ui?: {
    popupTheme?: unknown;
    popupColorMode?: unknown;
  };
};
type StoredReadingSettings = DeepPartial<ReaderSettings>['reading'] & LegacySettings['reading'];
type StoredUiSettings = DeepPartial<ReaderSettings>['ui'] & LegacySettings['ui'];

export function mergeSettings(input?: (DeepPartial<ReaderSettings> & LegacySettings) | null): ReaderSettings {
  const readingInput = input?.reading as StoredReadingSettings | undefined;
  const uiInput = input?.ui as StoredUiSettings | undefined;

  return {
    reading: {
      colorMode: normalizeColorMode(readingInput?.colorMode ?? readingInput?.theme, DEFAULT_SETTINGS.reading.colorMode),
      themeId: normalizeReaderThemeId(readingInput),
      width: readingInput?.width ?? DEFAULT_SETTINGS.reading.width,
      rawMode: readingInput?.rawMode ?? DEFAULT_SETTINGS.reading.rawMode,
      showOutline: readingInput?.showOutline ?? DEFAULT_SETTINGS.reading.showOutline,
      autoReload: readingInput?.autoReload ?? DEFAULT_SETTINGS.reading.autoReload,
    },
    rendering: {
      ...DEFAULT_SETTINGS.rendering,
      ...input?.rendering,
    },
    ui: {
      popupColorMode: normalizeColorMode(uiInput?.popupColorMode ?? uiInput?.popupTheme, DEFAULT_SETTINGS.ui.popupColorMode),
      iconTheme: uiInput?.iconTheme ?? DEFAULT_SETTINGS.ui.iconTheme,
    },
  };
}

export async function loadSettings(
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.sync,
): Promise<ReaderSettings> {
  if (!area?.get) {
    return DEFAULT_SETTINGS;
  }

  const stored = await area.get(SETTINGS_KEY);
  return mergeSettings(stored[SETTINGS_KEY] as (DeepPartial<ReaderSettings> & LegacySettings) | undefined);
}

export async function saveSettings(
  settings: ReaderSettings,
  area: chrome.storage.StorageArea | undefined = globalThis.chrome?.storage?.sync,
): Promise<void> {
  if (!area?.set) {
    return;
  }

  await area.set({ [SETTINGS_KEY]: settings });
}

export function subscribeSettings(
  onChange: (settings: ReaderSettings) => void,
  storage: typeof chrome.storage | undefined = globalThis.chrome?.storage,
): () => void {
  if (!storage?.onChanged?.addListener || !storage.onChanged.removeListener) {
    return () => {};
  }

  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'sync' || !changes[SETTINGS_KEY]) {
      return;
    }

    onChange(mergeSettings(changes[SETTINGS_KEY].newValue as (DeepPartial<ReaderSettings> & LegacySettings) | undefined));
  };

  storage.onChanged.addListener(listener);

  return () => storage.onChanged.removeListener(listener);
}

function normalizeColorMode(value: unknown, fallback: ColorModePreference): ColorModePreference {
  return typeof value === 'string' && COLOR_MODE_VALUES.has(value as ColorModePreference)
    ? value as ColorModePreference
    : fallback;
}

function normalizeReaderThemeId(reading: StoredReadingSettings | undefined): ReaderSettings['reading']['themeId'] {
  if (typeof reading?.themeId === 'string' && READER_THEME_ID_PATTERN.test(reading.themeId)) {
    return reading.themeId as ReaderSettings['reading']['themeId'];
  }

  if (typeof reading?.themePackageId === 'string' && reading.themePackageId.trim()) {
    return createInstalledReaderThemeId(reading.themePackageId.trim().toLowerCase());
  }

  if (typeof reading?.style === 'string' && READING_STYLE_VALUES.has(reading.style as ReadingStyle)) {
    return createBuiltinReaderThemeId(reading.style as ReadingStyle);
  }

  return DEFAULT_SETTINGS.reading.themeId;
}
