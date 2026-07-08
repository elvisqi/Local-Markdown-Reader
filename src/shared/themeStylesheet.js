import { scopeThemeCss } from './themeCss.js';

export function buildInstalledThemeStylesheetFromPackage(theme, createInstalledThemeId = defaultInstalledThemeId) {
  if (!theme) {
    return '';
  }

  const scope = `[data-reader-theme-id="${createInstalledThemeId(theme.id)}"][data-reader-theme-id]`;
  const tokenCss = buildReaderThemeTokenStylesheet(scope, theme.tokens ?? {}, theme.lightTokens ?? {}, theme.darkTokens ?? {});
  const scopedCss = theme.scopedCss?.trim() || (theme.css?.trim() ? scopeThemeCss(theme.css, scope) : '');
  return [tokenCss, scopedCss].filter(Boolean).join('\n\n');
}

export function buildReaderThemeStylesheetFromDefinition(theme) {
  if (!theme) {
    return '';
  }

  const scope = `[data-reader-theme-id="${theme.id}"][data-reader-theme-id]`;
  const tokenCss = buildReaderThemeTokenStylesheet(scope, theme.tokens ?? {});
  const scopedCss = theme.css?.trim() ? scopeThemeCss(theme.css, scope) : '';
  return [tokenCss, scopedCss].filter(Boolean).join('\n\n');
}

export function buildReaderThemeTokenStylesheet(
  scope,
  tokens,
  lightTokens = {},
  darkTokens = {},
) {
  const blocks = [];
  const sharedBlock = buildTokenBlock(scope, tokens);
  if (sharedBlock) {
    blocks.push(sharedBlock);
  }

  if (Object.keys(lightTokens).length) {
    blocks.push(buildTokenBlock(`.theme-light${scope}`, lightTokens));
    blocks.push(buildTokenBlock(`.theme-system${scope}`, lightTokens));
  }

  if (Object.keys(darkTokens).length) {
    blocks.push(buildTokenBlock(`.theme-dark${scope}`, darkTokens));
    blocks.push(`@media (prefers-color-scheme: dark) {\n${buildTokenBlock(`.theme-system${scope}`, darkTokens)}\n}`);
  }

  return blocks.filter(Boolean).join('\n\n');
}

function buildTokenBlock(selector, tokens) {
  const tokenLines = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`);
  return tokenLines.length ? `${selector} {\n${tokenLines.join('\n')}\n}` : '';
}

function defaultInstalledThemeId(themeId) {
  return `installed:${themeId}`;
}
