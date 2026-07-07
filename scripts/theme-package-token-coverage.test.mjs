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
    snippets: ['border-bottom: 0', 'box-shadow: none'],
  },
  'things-flow': {
    origin: 'Things',
    marker: '--reader-theme-signature: things-flow',
    snippets: ['border-radius: 18px', 'box-shadow: 0 8px 24px', 'background: linear-gradient'],
  },
  'pastel-puccin': {
    origin: 'AnuPpuccin and Catppuccin',
    marker: '--reader-theme-signature: pastel-puccin',
    snippets: ['--reader-theme-palette: pastel', 'color-mix(in srgb, var(--reader-color-pink)', 'border-radius: 14px'],
  },
  'topaz-blue': {
    origin: 'Blue Topaz',
    marker: '--reader-theme-signature: topaz-blue',
    snippets: ['text-align: center', 'border-top: 3px double', 'linear-gradient(90deg'],
  },
  'nord-notes': {
    origin: 'Obsidian Nord',
    marker: '--reader-theme-signature: nord-notes',
    snippets: ['--reader-theme-temperature: frost', 'border-radius: 2px', 'text-transform: uppercase'],
  },
  'atom-one-reader': {
    origin: 'Atom',
    marker: '--reader-theme-signature: atom-one-reader',
    snippets: ['--reader-theme-editor-chrome: atom', 'font-family: var(--reader-monospace-font)', 'border-left: 3px solid'],
  },
  'obsidianite-dark': {
    origin: 'Obsidianite',
    marker: '--reader-theme-signature: obsidianite-dark',
    snippets: ['--reader-theme-glow: neon', 'text-shadow:', 'box-shadow: 0 0'],
  },
  'wasp-highlight': {
    origin: 'Wasp',
    marker: '--reader-theme-signature: wasp-highlight',
    snippets: ['--reader-theme-contrast: wasp', 'border-radius: 0', 'text-transform: uppercase'],
  },
  'typewriter-desk': {
    origin: 'Typewriter',
    marker: '--reader-theme-signature: typewriter-desk',
    snippets: ['--reader-theme-paper: manuscript', 'text-indent: 1.4em', 'font-family: var(--reader-monospace-font)'],
  },
  'its-readable': {
    origin: 'ITS Theme',
    marker: '--reader-theme-signature: its-readable',
    snippets: ['--reader-theme-layout: readable', 'border-left: 5px solid', 'display: grid'],
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

const MIN_UNIQUE_SELECTORS_PER_OBSIDIAN_THEME = 12;
const MAX_PAIRWISE_SELECTOR_JACCARD = 0.93;

const THEME_SOURCE_DETAIL_REQUIREMENTS = {
  'minimal-focus': [
    '.markdown-preview-intro > .markdown-heading--h1',
    '.markdown-preview-intro > .markdown-heading--h2',
    '.markdown-preview-intro .markdown-tag[data-tag="theme"]',
    '.markdown-preview-quote.callout-tip',
  ],
  'things-flow': [
    '.markdown-preview-tasks > .markdown-heading--h3',
    '.markdown-preview-tasks .markdown-task--checked',
    '.markdown-list--unordered > .markdown-task',
    '.markdown-task--open .markdown-task-checkbox',
  ],
  'pastel-puccin': [
    '.markdown-preview-code .markdown-code-block',
    '.markdown-preview-code .token.keyword',
    '.markdown-tag[data-tag="theme"] + .markdown-tag',
    '.markdown-table-row:nth-child(even) > .markdown-table-cell',
  ],
  'topaz-blue': [
    '.markdown-preview-table-wrap > .markdown-heading--h3',
    '.markdown-preview-table .markdown-table-head',
    '.markdown-preview-table .markdown-table-cell--head:first-child',
    '.callout-tip .callout-title',
  ],
  'nord-notes': [
    '.markdown-code-block .line:hover',
    '.markdown-code-block code.language-js',
    '.markdown-table-cell--head:first-child',
    '.outline-panel button.is-active',
  ],
  'atom-one-reader': [
    '.markdown-preview-code > .markdown-heading--h3',
    '.markdown-code-block .token.keyword',
    '.markdown-code-block .token.string',
    '.markdown-inline-code.markdown-code--inline',
  ],
  'obsidianite-dark': [
    '.markdown-link--external',
    '.callout-tip::before',
    '.markdown-code-block::after',
    '.markdown-tag[data-tag="theme"]::after',
  ],
  'wasp-highlight': [
    '.markdown-heading--h1::after',
    '.markdown-heading--h2::before',
    '.markdown-task-checkbox:not(:checked)',
    '.markdown-tag[data-tag="status"]',
  ],
  'typewriter-desk': [
    '.markdown-paragraph + .markdown-paragraph',
    '.markdown-code-block::after',
    '.markdown-table-caption::before',
    '.markdown-preview-document::after',
  ],
  'its-readable': [
    '.theme-preview__callouts',
    '.callout[data-callout="info"]',
    '.callout[data-callout="warning"]',
    '.markdown-tag[data-tag="done"]',
  ],
};

const DISALLOWED_READER_CONTENT_SELECTORS = [
  '.markdown-heading--h1::before',
  '.markdown-code-block::before',
  '.markdown-table::before',
  '.markdown-tag[data-tag="theme"]::before',
  '.markdown-image::before',
  '.mermaid::before',
  'hr::after',
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

  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s includes source-specific Obsidian detail selectors', (themeId) => {
    const theme = readThemePackage(themeId);
    const css = theme.css ?? '';
    const selectors = extractSelectors(css);
    const otherSelectors = new Set(
      OBSIDIAN_INSPIRED_THEME_IDS
        .filter((otherThemeId) => otherThemeId !== themeId)
        .flatMap((otherThemeId) => [...extractSelectors(readThemePackage(otherThemeId).css ?? '')]),
    );
    const uniqueSelectors = [...selectors].filter((selector) => !otherSelectors.has(selector));

    expect(
      uniqueSelectors.length,
      `${themeId} should carry enough theme-specific selectors derived from the Obsidian reference shape`,
    ).toBeGreaterThanOrEqual(MIN_UNIQUE_SELECTORS_PER_OBSIDIAN_THEME);

    for (const requiredSelector of THEME_SOURCE_DETAIL_REQUIREMENTS[themeId]) {
      expect(selectors, `${themeId} should include ${requiredSelector}`).toContain(requiredSelector);
    }
  });

  it('keeps Obsidian-inspired themes structurally distinct, not just recolored copies', () => {
    const selectorSets = Object.fromEntries(
      OBSIDIAN_INSPIRED_THEME_IDS.map((themeId) => [
        themeId,
        extractSelectors(readThemePackage(themeId).css ?? ''),
      ]),
    );

    for (let index = 0; index < OBSIDIAN_INSPIRED_THEME_IDS.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < OBSIDIAN_INSPIRED_THEME_IDS.length; compareIndex += 1) {
        const themeId = OBSIDIAN_INSPIRED_THEME_IDS[index];
        const otherThemeId = OBSIDIAN_INSPIRED_THEME_IDS[compareIndex];
        const similarity = selectorJaccard(selectorSets[themeId], selectorSets[otherThemeId]);

        expect(
          similarity,
          `${themeId} and ${otherThemeId} should not share nearly identical selector sets`,
        ).toBeLessThan(MAX_PAIRWISE_SELECTOR_JACCARD);
      }
    }
  });

  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s does not inject visible template labels into readable content', (themeId) => {
    const theme = readThemePackage(themeId);
    const css = theme.css ?? '';
    const visibleContentValues = findVisibleContentValues(css);

    expect(visibleContentValues, `${themeId} should not ship non-empty CSS content labels`).toEqual([]);
    for (const selector of DISALLOWED_READER_CONTENT_SELECTORS) {
      const selectorPattern = escapeRegExp(selector);
      expect(
        css,
        `${themeId} should not attach readable pseudo-element labels to ${selector}`,
      ).not.toMatch(new RegExp(`${selectorPattern}\\s*\\{[^}]*content:\\s*["'][^"']+`, 'u'));
    }
  });

  it.each(OBSIDIAN_INSPIRED_THEME_IDS)('%s leaves reading width to the app setting', (themeId) => {
    const theme = readThemePackage(themeId);
    const css = theme.css ?? '';

    expect(css, `${themeId} should not constrain the document inner width`).not.toMatch(
      /\.document-reader\s*>\s*div\s*\{[^}]*max-width:/u,
    );
    expect(css, `${themeId} should not constrain paragraphs to a fixed line width`).not.toMatch(
      /\.markdown-paragraph\s*\{[^}]*max-width:\s*\d+(?:px|ch)/u,
    );
    expect(css, `${themeId} should not constrain the theme preview document to a fixed width`).not.toMatch(
      /\.theme-preview__document\s*\{[^}]*max-width:\s*\d+(?:px|ch)/u,
    );
    expect(
      findFiniteMaxWidthValues(css),
      `${themeId} should not ship finite max-width values that override the reading width control`,
    ).toEqual([]);
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

function findVisibleContentValues(css) {
  return [...css.matchAll(/content:\s*(['"])(.*?)\1/gu)]
    .map((match) => match[2])
    .filter((value) => value.length > 0);
}

function findFiniteMaxWidthValues(css) {
  return [...css.matchAll(/max-width:\s*(\d+(?:px|ch|rem|em))/gu)].map((match) => match[1]);
}

function extractSelectors(css) {
  return new Set(
    (css.match(/[^{}]+(?=\s*\{)/g) ?? [])
      .flatMap((selectorList) => splitSelectorList(selectorList.trim()))
      .map((selector) => selector.trim())
      .filter((selector) => selector && !selector.startsWith('@') && !selector.includes(';')),
  );
}

function splitSelectorList(selectorList) {
  const selectors = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (const char of selectorList) {
    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1);
    }

    if (char === ',' && depth === 0) {
      selectors.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    selectors.push(current);
  }

  return selectors;
}

function selectorJaccard(left, right) {
  const intersection = [...left].filter((selector) => right.has(selector)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
