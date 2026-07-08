import { analyzeCssMetrics } from './cssMetrics.mjs';

export function assertNoRestrictedSourceCopy({
  themeId,
  css,
  sourceFingerprints,
  restrictedSourceIds,
}) {
  const metrics = analyzeCssMetrics(css);
  const restricted = new Set(restrictedSourceIds ?? []);
  const sources = sourceFingerprints?.sources ?? {};
  const matches = [];

  for (const [sourceId, fingerprint] of Object.entries(sources)) {
    if (!restricted.has(sourceId)) {
      continue;
    }
    const declarationMatches = intersect(metrics.declarationBlockHashes, fingerprint.declarationBlockHashes ?? []);
    const textWindowMatches = intersect(metrics.textWindowHashes, fingerprint.textWindowHashes ?? []);
    if (declarationMatches.length || textWindowMatches.length) {
      matches.push({
        sourceId,
        declarationBlockMatches: declarationMatches.length,
        textWindowMatches: textWindowMatches.length,
      });
    }
  }

  if (matches.length) {
    throw new Error(`${themeId}: generated CSS matches restricted source fingerprints: ${matches.map((match) => match.sourceId).join(', ')}`);
  }

  return {
    passed: true,
    checkedSources: restricted.size,
  };
}

function intersect(inputA, inputB) {
  const b = new Set(inputB ?? []);
  return [...new Set(inputA ?? [])].filter((value) => b.has(value));
}
