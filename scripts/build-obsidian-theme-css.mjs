import { fileURLToPath } from 'node:url';

export const OBSIDIAN_THEME_IDS = [];

export function buildObsidianThemeCss(themeId) {
  throw new Error(`Obsidian theme profile has not been redesigned yet: ${themeId}`);
}

export async function writeObsidianThemeCssPackages() {
  return [];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const themes = await writeObsidianThemeCssPackages();
  console.log(`obsidian theme css generated: ${themes.length} themes`);
}
