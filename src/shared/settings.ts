import type { DeepPartial, ReaderSettings } from './types';

const SETTINGS_KEY = 'readerSettings';

export const DEFAULT_SETTINGS: ReaderSettings = {
  reading: {
    theme: 'system',
    width: 'comfortable',
    style: 'clean',
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
    popupTheme: 'system',
    iconTheme: 'default',
  },
};

export function mergeSettings(input?: DeepPartial<ReaderSettings> | null): ReaderSettings {
  return {
    reading: {
      ...DEFAULT_SETTINGS.reading,
      ...input?.reading,
    },
    rendering: {
      ...DEFAULT_SETTINGS.rendering,
      ...input?.rendering,
    },
    ui: {
      ...DEFAULT_SETTINGS.ui,
      ...input?.ui,
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
  return mergeSettings(stored[SETTINGS_KEY] as DeepPartial<ReaderSettings> | undefined);
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
