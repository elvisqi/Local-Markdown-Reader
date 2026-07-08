import { describe, expect, it } from 'vitest';

import { buildThemePackage, THEME_BLUEPRINTS } from './officialThemeData.mjs';
import { analyzeCssMetrics } from './cssMetrics.mjs';
import { analyzeComponentCoverage } from './componentCoverage.mjs';

describe('official theme CSS metrics', () => {
  it('uses AST metrics to reject thin recolor-only themes', () => {
    for (const blueprint of THEME_BLUEPRINTS) {
      const theme = buildThemePackage(blueprint);
      const metrics = analyzeCssMetrics(theme.css);
      const coverage = analyzeComponentCoverage(metrics.selectors);

      expect(metrics.ruleCount, blueprint.id).toBeGreaterThanOrEqual(90);
      expect(metrics.declarationCount, blueprint.id).toBeGreaterThanOrEqual(320);
      expect(metrics.nonColorDeclarationRatio, blueprint.id).toBeGreaterThanOrEqual(0.45);
      expect(coverage.coveredComponents.length, blueprint.id).toBeGreaterThanOrEqual(7);
    }
  });
});
