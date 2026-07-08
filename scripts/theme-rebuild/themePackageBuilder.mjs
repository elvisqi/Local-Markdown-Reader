import { sanitizeAndScopeThemeCss } from '../../src/shared/themeCss.js';
import {
  buildThemeContract,
  buildThemeDefinition,
  buildThemePackage,
} from './officialThemeData.mjs';
import { auditNonColorFeatures } from './nonColorFeatureAudit.mjs';
import { assertThemeDefinition } from './themeDefinitionSchema.mjs';

export function buildThemeArtifacts(blueprint, { allowPartial = false } = {}) {
  const theme = buildThemePackage(blueprint);
  const contract = buildThemeContract(blueprint);
  const definition = buildThemeDefinition(blueprint);
  assertThemeDefinition(definition);

  const sanitized = sanitizeAndScopeThemeCss(
    theme.css,
    `[data-reader-theme-id="installed:${theme.id}"][data-reader-theme-id]`,
    { themeId: theme.id },
  );
  const audit = auditNonColorFeatures({ theme, contract, allowPartial: true });
  if (!audit.passed) {
    throw new Error(audit.errors.join('\n'));
  }

  return {
    theme,
    contract: {
      ...contract,
      cssMetrics: {
        ruleCount: audit.ruleCount,
        declarationCount: audit.declarationCount,
        nonColorDeclarationRatio: Number(audit.nonColorDeclarationRatio.toFixed(4)),
        coveredComponents: audit.coveredComponents,
      },
    },
    definition,
    reports: {
      audit,
      sanitized: {
        sanitizerVersion: sanitized.sanitizerVersion,
        sourceCssHash: sanitized.sourceCssHash,
        scopedCssHash: sanitized.scopedCssHash,
      },
      allowPartial,
    },
  };
}
