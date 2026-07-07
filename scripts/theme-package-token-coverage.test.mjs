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

const MIN_SELECTOR_BLOCKS_PER_OBSIDIAN_THEME = 500;
const MIN_TOTAL_SELECTOR_BLOCKS = 5000;
const MIN_CSS_LENGTH_PER_OBSIDIAN_THEME = 28000;

const THEME_SIGNATURE_REQUIREMENTS = {
  'minimal-focus': {
    origin: 'Minimal',
    marker: '--reader-theme-signature: minimal-focus',
    snippets: ['content: "Minimal"', 'max-width: 760px', 'border-bottom: 0', 'box-shadow: none'],
  },
  'things-flow': {
    origin: 'Things',
    marker: '--reader-theme-signature: things-flow',
    snippets: ['content: "Things"', 'border-radius: 18px', 'box-shadow: 0 8px 24px', 'background: linear-gradient'],
  },
  'pastel-puccin': {
    origin: 'AnuPpuccin and Catppuccin',
    marker: '--reader-theme-signature: pastel-puccin',
    snippets: ['content: "Pastel"', '--reader-theme-palette: pastel', 'color-mix(in srgb, var(--reader-color-pink)', 'border-radius: 14px'],
  },
  'topaz-blue': {
    origin: 'Blue Topaz',
    marker: '--reader-theme-signature: topaz-blue',
    snippets: ['content: "Topaz"', 'text-align: center', 'border-top: 3px double', 'linear-gradient(90deg'],
  },
  'nord-notes': {
    origin: 'Obsidian Nord',
    marker: '--reader-theme-signature: nord-notes',
    snippets: ['content: "Nord"', '--reader-theme-temperature: frost', 'border-radius: 2px', 'text-transform: uppercase'],
  },
  'atom-one-reader': {
    origin: 'Atom',
    marker: '--reader-theme-signature: atom-one-reader',
    snippets: ['content: "Atom"', '--reader-theme-editor-chrome: atom', 'font-family: var(--reader-monospace-font)', 'border-left: 3px solid'],
  },
  'obsidianite-dark': {
    origin: 'Obsidianite',
    marker: '--reader-theme-signature: obsidianite-dark',
    snippets: ['content: "Obsidianite"', '--reader-theme-glow: neon', 'text-shadow:', 'box-shadow: 0 0'],
  },
  'wasp-highlight': {
    origin: 'Wasp',
    marker: '--reader-theme-signature: wasp-highlight',
    snippets: ['content: "Wasp"', '--reader-theme-contrast: wasp', 'border-radius: 0', 'text-transform: uppercase'],
  },
  'typewriter-desk': {
    origin: 'Typewriter',
    marker: '--reader-theme-signature: typewriter-desk',
    snippets: ['content: "Typewriter"', '--reader-theme-paper: manuscript', 'text-indent: 1.4em', 'font-family: var(--reader-monospace-font)'],
  },
  'its-readable': {
    origin: 'ITS Theme',
    marker: '--reader-theme-signature: its-readable',
    snippets: ['content: "ITS"', '--reader-theme-layout: readable', 'border-left: 5px solid', 'display: grid'],
  },
};

const REQUIRED_VISIBLE_SIGNATURE_SELECTORS = [
  '.theme-preview__document::before',
  '.markdown-heading--h1::before',
  '.markdown-heading--h2::after',
  '.callout-warning',
  '.callout-success',
  '.markdown-code-block::before',
  '.markdown-code-block .line::before',
  '.markdown-table::before',
  '.markdown-table-row:nth-child(even) .markdown-table-cell',
  '.markdown-task-checkbox:checked::after',
  '.markdown-tag[data-tag="theme"]::before',
  '.markdown-image::before',
  '.mermaid::before',
  '.markdown-rule::after',
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

  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s uses semantic markdown CSS hooks for structural differences', (themeId) => {
    const theme = readThemePackage(themeId);
    const css = theme.css ?? '';
    const semanticHooks = new Set(css.match(/\.markdown-[a-z0-9_-]+/g) ?? []);
    const selectorBlocks = css.match(/[^{}]+(?=\s*\{)/g) ?? [];

    expect(semanticHooks.size, `${themeId} should style multiple semantic markdown hooks`).toBeGreaterThanOrEqual(9);
    expect(css, `${themeId} should include non-color structural styling`).toMatch(
      /\b(?:border|padding|margin|font|letter-spacing|max-width|box-shadow|text-transform|display|position)\b/,
    );
    expect(css.length, `${themeId} needs enough CSS to express a recognizable theme personality`).toBeGreaterThanOrEqual(
      MIN_CSS_LENGTH_PER_OBSIDIAN_THEME,
    );
    expect(selectorBlocks.length, `${themeId} should define a richer set of structural rules`).toBeGreaterThanOrEqual(
      MIN_SELECTOR_BLOCKS_PER_OBSIDIAN_THEME,
    );
    for (const requiredHook of [
      '.markdown-heading',
      '.markdown-code-block',
      '.markdown-inline-code',
      '.markdown-table',
      '.markdown-task',
      '.markdown-tag',
      '.markdown-link',
      '.markdown-image',
      '.markdown-list',
      '.markdown-quote',
    ]) {
      expect(css, `${themeId} should style ${requiredHook}`).toContain(requiredHook);
    }
    expect(css, `${themeId} should style Obsidian-style callouts`).toMatch(/\.callout\b/);
  });

  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s declares a recognizable Obsidian source signature', (themeId) => {
    const theme = readThemePackage(themeId);
    const css = theme.css ?? '';
    const requirement = THEME_SIGNATURE_REQUIREMENTS[themeId];

    expect(css, `${themeId} should declare its Obsidian source signature`).toContain(
      `--reader-theme-origin: ${requirement.origin}`,
    );
    expect(css, `${themeId} should declare a package-specific visible signature marker`).toContain(requirement.marker);
    for (const snippet of requirement.snippets) {
      expect(css, `${themeId} should include ${snippet}`).toContain(snippet);
    }
  });

  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s styles visible preview surfaces instead of only changing colors', (themeId) => {
    const theme = readThemePackage(themeId);
    const css = theme.css ?? '';

    for (const selector of REQUIRED_VISIBLE_SIGNATURE_SELECTORS) {
      expect(css, `${themeId} should include visible signature selector ${selector}`).toContain(selector);
    }
  });

  it('ships at least 5000 structural rules across the 10 Obsidian-inspired themes', () => {
    const selectorBlockCounts = OBSIDIAN_INSPIRED_THEME_IDS.map((themeId) => {
      const theme = readThemePackage(themeId);
      return (theme.css?.match(/[^{}]+(?=\s*\{)/g) ?? []).length;
    });

    expect(
      selectorBlockCounts.reduce((total, count) => total + count, 0),
      'Obsidian-inspired themes should have enough total CSS rules to show recognizable theme differences',
    ).toBeGreaterThanOrEqual(MIN_TOTAL_SELECTOR_BLOCKS);
  });
});

function readThemePackage(themeId) {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'themes', 'packages', `${themeId}.mdv-theme.json`), 'utf8'));
}
