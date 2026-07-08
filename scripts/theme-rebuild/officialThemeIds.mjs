export const OFFICIAL_THEME_IDS = Object.freeze([
  'minimal',
  'things',
  'anuppuccin',
  'blue-topaz',
  'catppuccin',
  'everforest',
  'its-theme',
  'primary',
  'prism',
  'cybertron',
]);

export const LEGACY_OFFICIAL_THEME_IDS = Object.freeze([
  'everforest-field',
  'github-workbench',
  'minimal-manuscript',
  'nord-research',
  'primary-soft',
  'prism-spectrum',
  'sanctum-archive',
  'terminal-console',
  'things-native',
  'topaz-lab',
]);

const OFFICIAL_THEME_ID_SET = new Set(OFFICIAL_THEME_IDS);

export function assertOnlyOfficialThemeIds(themeIds) {
  for (const themeId of themeIds) {
    if (!OFFICIAL_THEME_ID_SET.has(themeId)) {
      throw new Error(`Unexpected official theme id: ${themeId}`);
    }
  }
}

export function isOfficialThemeId(themeId) {
  return OFFICIAL_THEME_ID_SET.has(themeId);
}
