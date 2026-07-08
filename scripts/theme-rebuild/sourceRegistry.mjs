import { buildThemeSourceRegistry } from './officialThemeData.mjs';

export const OFFICIAL_THEME_SOURCES = Object.freeze(buildThemeSourceRegistry());

export function getOfficialThemeSource(themeId) {
  return OFFICIAL_THEME_SOURCES.find((source) => source.id === themeId) ?? null;
}
