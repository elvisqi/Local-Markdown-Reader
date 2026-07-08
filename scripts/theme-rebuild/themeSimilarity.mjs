import { analyzeCssMetrics } from './cssMetrics.mjs';

export const MAX_OFFICIAL_THEME_SIMILARITY = 0.88;

export function compareThemePair(themeA, themeB, contractA = null, contractB = null) {
  const metricsA = analyzeCssMetrics(themeA.css ?? '');
  const metricsB = analyzeCssMetrics(themeB.css ?? '');
  const selectorSimilarity = calculateSelectorSimilarity(metricsA.selectors, metricsB.selectors);
  const declarationBlockSimilarity = jaccard(metricsA.declarationBlockHashes, metricsB.declarationBlockHashes);
  const tokenSimilarity = calculateTokenSimilarity(themeA, themeB);
  const nonColorFeatureSimilarity = jaccard(
    contractA?.nonColorFeatureIds ?? [],
    contractB?.nonColorFeatureIds ?? [],
  );
  const cssProfileSimilarity = calculateCssProfileSimilarity(metricsA, metricsB);

  const overallSimilarity = round4(
    selectorSimilarity * 0.18 +
    declarationBlockSimilarity * 0.18 +
    tokenSimilarity * 0.24 +
    nonColorFeatureSimilarity * 0.28 +
    cssProfileSimilarity * 0.12
  );

  return {
    id: `${themeA.id}__${themeB.id}`,
    themeIds: [themeA.id, themeB.id],
    selectorSimilarity: round4(selectorSimilarity),
    declarationBlockSimilarity: round4(declarationBlockSimilarity),
    tokenSimilarity: round4(tokenSimilarity),
    nonColorFeatureSimilarity: round4(nonColorFeatureSimilarity),
    cssProfileSimilarity: round4(cssProfileSimilarity),
    overallSimilarity,
    passed: overallSimilarity <= MAX_OFFICIAL_THEME_SIMILARITY,
  };
}

export function calculateSelectorSimilarity(selectorsA, selectorsB) {
  return jaccard(selectorsA, selectorsB);
}

export function buildThemeSimilarityReport(themes, contracts) {
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const pairs = [];
  for (let outer = 0; outer < themes.length; outer += 1) {
    for (let inner = outer + 1; inner < themes.length; inner += 1) {
      pairs.push(compareThemePair(
        themes[outer],
        themes[inner],
        contractById.get(themes[outer].id),
        contractById.get(themes[inner].id),
      ));
    }
  }

  const maxOverallSimilarity = Math.max(...pairs.map((pair) => pair.overallSimilarity));
  const averageOverallSimilarity = pairs.length
    ? pairs.reduce((sum, pair) => sum + pair.overallSimilarity, 0) / pairs.length
    : 0;

  return {
    generatedAt: '2026-07-08T00:00:00.000Z',
    threshold: MAX_OFFICIAL_THEME_SIMILARITY,
    passed: pairs.every((pair) => pair.passed),
    themeCount: themes.length,
    summary: {
      pairCount: pairs.length,
      maxOverallSimilarity: round4(maxOverallSimilarity),
      averageOverallSimilarity: round4(averageOverallSimilarity),
    },
    pairs,
  };
}

function calculateTokenSimilarity(themeA, themeB) {
  const valuesA = tokenProfile(themeA);
  const valuesB = tokenProfile(themeB);
  return jaccard(valuesA, valuesB);
}

function tokenProfile(theme) {
  const entries = [
    ...Object.entries(theme.tokens ?? {}),
    ...Object.entries(theme.lightTokens ?? {}),
    ...Object.entries(theme.darkTokens ?? {}),
  ];
  return entries.map(([name, value]) => `${name}:${value}`);
}

function calculateCssProfileSimilarity(metricsA, metricsB) {
  const profileA = [
    `rules:${bucket(metricsA.ruleCount, 12)}`,
    `decls:${bucket(metricsA.declarationCount, 24)}`,
    `noncolor:${Math.round(metricsA.nonColorDeclarationRatio * 10)}`,
    `selectors:${bucket(metricsA.selectorCount, 12)}`,
  ];
  const profileB = [
    `rules:${bucket(metricsB.ruleCount, 12)}`,
    `decls:${bucket(metricsB.declarationCount, 24)}`,
    `noncolor:${Math.round(metricsB.nonColorDeclarationRatio * 10)}`,
    `selectors:${bucket(metricsB.selectorCount, 12)}`,
  ];
  return jaccard(profileA, profileB);
}

function jaccard(inputA, inputB) {
  const a = new Set(inputA ?? []);
  const b = new Set(inputB ?? []);
  const union = new Set([...a, ...b]);
  if (!union.size) {
    return 1;
  }
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersection += 1;
    }
  }
  return intersection / union.size;
}

function bucket(value, size) {
  return Math.round(value / size) * size;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}
