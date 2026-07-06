import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OBSIDIAN_INSPIRED_THEME_IDS = [
  'minimal-focus',
  'things-flow',
  'pastel-puccin',
  'topaz-blue',
  'nord-notes',
  'atom-one-reader',
  'obsidianite-dark',
  'wasp-highlight',
  'typewriter-desk',
  'its-readable',
];

const REQUIRED_TOKEN_GROUPS = {
  typography: [
    '--reader-font-family',
    '--reader-monospace-font',
    '--reader-h1-size',
    '--reader-h2-size',
    '--reader-h3-weight',
    '--reader-paragraph-spacing',
    '--reader-list-indent',
  ],
  tablesAndCode: [
    '--reader-table-border',
    '--reader-table-cell-padding',
    '--reader-table-row-hover',
    '--reader-code-radius',
    '--reader-code-border',
    '--reader-code-font-size',
  ],
  obsidianBlocks: [
    '--reader-callout-bg',
    '--reader-callout-border',
    '--reader-callout-title',
    '--reader-quote-padding',
    '--reader-quote-radius',
    '--reader-checkbox-bg',
    '--reader-checkbox-border',
    '--reader-checkbox-checked-bg',
    '--reader-tag-radius',
    '--reader-tag-padding',
  ],
  paletteAndChrome: [
    '--reader-base-00',
    '--reader-base-10',
    '--reader-base-20',
    '--reader-base-30',
    '--reader-base-100',
    '--reader-color-blue',
    '--reader-color-purple',
    '--reader-toolbar-bg',
    '--reader-control-bg',
    '--reader-tree-row-active',
    '--reader-outline-active-bg',
    '--reader-syntax-keyword',
  ],
};

describe('remote Obsidian-inspired theme package token coverage', () => {
  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s uses richer Obsidian-style token groups', (themeId) => {
    const theme = readThemePackage(themeId);
    const tokenNames = new Set(Object.keys(theme.tokens ?? {}));

    for (const [groupName, requiredTokens] of Object.entries(REQUIRED_TOKEN_GROUPS)) {
      const missing = requiredTokens.filter((tokenName) => !tokenNames.has(tokenName));

      expect(missing, `${themeId} is missing ${groupName} tokens`).toEqual([]);
    }
  });
});

function readThemePackage(themeId) {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'themes', 'packages', `${themeId}.mdv-theme.json`), 'utf8'));
}
