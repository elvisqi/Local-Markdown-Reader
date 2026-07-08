import type { ReaderThemePackage } from './types';

export function buildInstalledThemeStylesheetFromPackage(
  theme: ReaderThemePackage | null,
  createInstalledThemeId?: (themeId: string) => string,
): string;

export function buildReaderThemeStylesheetFromDefinition(
  theme: { id: string; tokens: Record<string, string>; css: string } | null,
): string;

export function buildReaderThemeTokenStylesheet(
  scope: string,
  tokens: Record<string, string>,
  lightTokens?: Record<string, string>,
  darkTokens?: Record<string, string>,
): string;
