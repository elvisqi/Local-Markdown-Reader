import { describe, expect, it } from 'vitest';

import { buildThemeContract, buildThemePackage, THEME_BLUEPRINTS } from './officialThemeData.mjs';
import { auditNonColorFeatures } from './nonColorFeatureAudit.mjs';

describe('non color feature audit', () => {
  it('requires signature, accepted, and evidence-backed non-color feature ids', () => {
    for (const blueprint of THEME_BLUEPRINTS) {
      const result = auditNonColorFeatures({
        theme: buildThemePackage(blueprint),
        contract: buildThemeContract(blueprint),
        allowPartial: true,
      });

      expect(result.passed, blueprint.id).toBe(true);
      expect(result.nonColorFeatureCount, blueprint.id).toBeGreaterThanOrEqual(18);
      expect(result.signatureFeatureCount, blueprint.id).toBeGreaterThanOrEqual(3);
      expect(result.coveredComponents.length, blueprint.id).toBeGreaterThanOrEqual(7);
    }
  });
});
