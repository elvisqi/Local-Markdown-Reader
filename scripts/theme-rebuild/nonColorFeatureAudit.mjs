import { analyzeComponentCoverage } from './componentCoverage.mjs';
import { analyzeCssMetrics } from './cssMetrics.mjs';
import { assertKnownNonColorFeatureIds } from './nonColorFeatureDictionary.mjs';

const MIN_NON_COLOR_FEATURES = 18;
const MIN_SIGNATURE_FEATURES = 3;
const MIN_VISIBLE_FEATURES = 10;
const MIN_COMPONENT_COVERAGE = 7;
const MIN_NON_COLOR_RATIO = 0.45;

export function auditNonColorFeatures({ theme, contract, visualEntry = null, allowPartial = false }) {
  const errors = [];
  const featureIds = Array.isArray(contract?.nonColorFeatureIds) ? contract.nonColorFeatureIds : [];
  const signatureFeatureIds = Array.isArray(contract?.signatureFeatureIds) ? contract.signatureFeatureIds : [];
  const evidence = Array.isArray(contract?.nonColorFeatureEvidence) ? contract.nonColorFeatureEvidence : [];
  const metrics = analyzeCssMetrics(theme?.css ?? '');
  const coverage = analyzeComponentCoverage(metrics.selectors);

  try {
    assertKnownNonColorFeatureIds(featureIds, `${theme?.id ?? 'theme'} nonColorFeatureIds`);
    assertKnownNonColorFeatureIds(signatureFeatureIds, `${theme?.id ?? 'theme'} signatureFeatureIds`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (featureIds.length < MIN_NON_COLOR_FEATURES) {
    errors.push(`${theme.id}: requires at least ${MIN_NON_COLOR_FEATURES} non-color feature ids.`);
  }
  if (signatureFeatureIds.length < MIN_SIGNATURE_FEATURES) {
    errors.push(`${theme.id}: requires at least ${MIN_SIGNATURE_FEATURES} signature feature ids.`);
  }
  if (!signatureFeatureIds.every((featureId) => featureIds.includes(featureId))) {
    errors.push(`${theme.id}: signature feature ids must be included in nonColorFeatureIds.`);
  }
  if (evidence.length < featureIds.length) {
    errors.push(`${theme.id}: every non-color feature must have contract evidence.`);
  }
  if (metrics.nonColorDeclarationRatio < MIN_NON_COLOR_RATIO) {
    errors.push(`${theme.id}: non-color declaration ratio ${metrics.nonColorDeclarationRatio.toFixed(2)} is below ${MIN_NON_COLOR_RATIO}.`);
  }
  if (coverage.coveredComponents.length < MIN_COMPONENT_COVERAGE) {
    errors.push(`${theme.id}: component coverage must include at least ${MIN_COMPONENT_COVERAGE} components.`);
  }

  if (!allowPartial) {
    const acceptedFeatureIds = Array.isArray(visualEntry?.acceptedFeatureIds) ? visualEntry.acceptedFeatureIds : [];
    const visibleEvidence = Array.isArray(visualEntry?.visibleFeatureEvidence)
      ? visualEntry.visibleFeatureEvidence
      : Array.isArray(visualEntry?.featureEvidence)
        ? visualEntry.featureEvidence
        : [];
    if (acceptedFeatureIds.length < MIN_VISIBLE_FEATURES) {
      errors.push(`${theme.id}: visual acceptance requires at least ${MIN_VISIBLE_FEATURES} accepted non-color features.`);
    }
    for (const featureId of acceptedFeatureIds) {
      if (!featureIds.includes(featureId)) {
        errors.push(`${theme.id}: accepted feature ${featureId} is not in the design contract.`);
      }
      if (!visibleEvidence.some((entry) => entry.featureId === featureId && entry.screenshotPath)) {
        errors.push(`${theme.id}: accepted feature ${featureId} must trace to a reviewed screenshot.`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    nonColorFeatureCount: featureIds.length,
    signatureFeatureCount: signatureFeatureIds.length,
    nonColorDeclarationRatio: metrics.nonColorDeclarationRatio,
    ruleCount: metrics.ruleCount,
    declarationCount: metrics.declarationCount,
    coveredComponents: coverage.coveredComponents,
    missingComponents: coverage.missingComponents,
  };
}
