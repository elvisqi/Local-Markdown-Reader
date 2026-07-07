export const THEME_CSS_SANITIZER_VERSION: string;

export const CONTROLLED_THEME_LAYOUT_SCOPES: readonly string[];

export type ThemeCssDiagnostic = {
  themeId: string | null;
  line: number | null;
  column: number | null;
  selector: string;
  property: string;
  value: string;
  reason: string;
};

export type ThemeCssSanitizeResult = {
  sourceCss: string;
  scopedCss: string;
  sanitizerVersion: string;
  sourceCssHash: string;
  scopedCssHash: string;
  diagnostics: ThemeCssDiagnostic[];
};

export function sanitizeAndScopeThemeCss(
  css: string,
  scope: string,
  options?: { themeId?: string },
): ThemeCssSanitizeResult;

export function scopeThemeCss(css: string, scope: string, options?: { themeId?: string }): string;
