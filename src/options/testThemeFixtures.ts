import type { ReaderThemePackage } from '../shared/types';

export const inkFocusTheme: ReaderThemePackage = {
  id: 'ink-focus',
  name: 'Ink Focus',
  version: '1.0.0',
  colorScheme: 'light',
  description: 'A crisp reading theme.',
  tokens: {
    '--reader-surface': '#ffffff',
  },
  css: '',
  installedAt: 101,
};

export const nightStudyTheme: ReaderThemePackage = {
  id: 'night-study',
  name: 'Night Study',
  version: '1.0.0',
  colorScheme: 'dark',
  author: 'Local Markdown Reader',
  tokens: {
    '--reader-surface': '#101820',
  },
  css: '',
  installedAt: 102,
};

export const installedPaperTheme: ReaderThemePackage = {
  id: 'paper-pro',
  name: 'Paper Pro',
  version: '1.0.0',
  colorScheme: 'light',
  author: 'Qi Yu',
  description: 'Comfortable long-form reading.',
  tokens: {
    '--reader-surface': '#fffefa',
  },
  css: '',
  installedAt: 123,
};
