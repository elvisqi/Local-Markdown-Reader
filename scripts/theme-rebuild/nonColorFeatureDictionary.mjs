export const NON_COLOR_FEATURE_MINIMUMS = Object.freeze({
  minFeatureIds: 18,
  minSignatureFeatureIds: 3,
  minScreenshotVisibleFeatureIds: 10,
  minComponentCoverage: 7,
  minNonColorDeclarationRatio: 0.45,
});

export const NON_COLOR_FEATURE_IDS_BY_CATEGORY = Object.freeze({
  typography: [
    'type-body-serif',
    'type-body-sans',
    'type-body-mono',
    'type-heading-serif',
    'type-heading-mono',
    'type-heading-display',
    'type-compact-line-height',
    'type-editorial-line-height',
    'type-paragraph-air',
    'type-first-line-indent',
    'type-list-rhythm',
    'type-link-underline-thick',
  ],
  heading: [
    'heading-quiet-scale',
    'heading-editorial-scale',
    'heading-command-prefix',
    'heading-numbered-marker',
    'heading-bottom-rule',
    'heading-left-rail',
    'heading-caps-transform',
    'heading-kicker-spacing',
    'heading-block-surface',
    'heading-hierarchy-colorless',
  ],
  chrome: [
    'chrome-quiet-flat',
    'chrome-native-toolbar',
    'chrome-terminal-frame',
    'chrome-glow-frame',
    'chrome-panel-surface',
    'chrome-compact-sidebar',
    'chrome-roomy-sidebar',
    'chrome-resize-handle-themed',
    'chrome-scrollbar-themed',
    'chrome-floating-actions',
    'chrome-border-grid',
    'chrome-soft-shadow',
  ],
  table: [
    'table-dense-grid',
    'table-spacious-grid',
    'table-sticky-header-frame',
    'table-zebra-structure',
    'table-hover-row',
    'table-metric-badges',
    'table-fullscreen-toolbar',
    'table-cell-borderless',
    'table-dataview-density',
    'table-scroll-shadow',
  ],
  callout: [
    'callout-left-rail',
    'callout-card',
    'callout-title-band',
    'callout-icon-chip',
    'callout-typed-shape',
    'callout-glow-border',
    'callout-compact',
    'callout-quote-style',
    'callout-dashboard-block',
    'callout-low-noise',
  ],
  code: [
    'code-editor-frame',
    'code-terminal-block',
    'code-header-strip',
    'code-inline-pill',
    'code-grid-border',
    'code-soft-panel',
    'code-language-badge',
    'code-dense-line-height',
  ],
  'file-tree': [
    'tree-compact-rows',
    'tree-roomy-rows',
    'tree-disclosure-themed',
    'tree-active-left-bar',
    'tree-active-pill',
    'tree-icon-sized',
    'tree-indent-strong',
    'tree-low-noise',
  ],
  outline: [
    'outline-compact-list',
    'outline-editorial-list',
    'outline-active-rail',
    'outline-active-pill',
    'outline-hierarchy-indent',
    'outline-quiet-hover',
  ],
  control: [
    'control-sharp-buttons',
    'control-rounded-buttons',
    'control-pill-buttons',
    'control-pressed-state',
    'control-focus-ring',
    'control-soft-shadow',
    'control-glow-focus',
    'control-disabled-muted',
  ],
  'generated-reader': [
    'yaml-summary-panel',
    'json-key-value-grid',
    'mermaid-framed-surface',
    'mermaid-floating-controls',
    'fullscreen-table-docked-actions',
    'fullscreen-table-corner-actions',
    'theme-preview-overlay',
    'selection-themed',
  ],
});

const CATEGORY_EVIDENCE = Object.freeze({
  typography: {
    selectors: ['.document-reader', '.document-reader .markdown-paragraph'],
    properties: ['font-family', 'line-height', 'margin-block'],
  },
  heading: {
    selectors: ['.document-reader .markdown-heading', '.document-reader .markdown-heading--h2'],
    properties: ['font-size', 'line-height', 'border-bottom-width', 'padding-bottom'],
  },
  chrome: {
    selectors: ['.reader-toolbar', '.outline-panel', '.file-tree'],
    properties: ['border-width', 'box-shadow', 'min-height', 'padding'],
  },
  table: {
    selectors: ['.document-reader .markdown-table-cell', '.document-reader .markdown-table-wrapper'],
    properties: ['padding', 'border-width', 'position', 'box-shadow'],
  },
  callout: {
    selectors: ['.document-reader .callout', '.document-reader .callout-title'],
    properties: ['border-left-width', 'padding', 'border-radius', 'box-shadow'],
  },
  code: {
    selectors: ['.document-reader .markdown-code-block', '.document-reader .markdown-inline-code'],
    properties: ['font-family', 'border-width', 'padding', 'line-height'],
  },
  'file-tree': {
    selectors: ['.file-tree', '[data-theme-layout-scope="file-tree-indicator"]'],
    properties: ['--reader-file-tree-row-height', 'padding-inline', 'border-width'],
  },
  outline: {
    selectors: ['.outline-panel', '[data-theme-layout-scope="outline-indicator"]'],
    properties: ['padding-inline-start', 'border-left-width', 'border-radius'],
  },
  control: {
    selectors: ['.reader-toolbar button', '.reader-toolbar button:focus-visible'],
    properties: ['border-radius', 'padding', 'outline-width', 'box-shadow'],
  },
  'generated-reader': {
    selectors: ['.yaml-reader', '.json-reader', '.mermaid-fullscreen', '[data-theme-layout-scope="theme-preview-overlay"]'],
    properties: ['display', 'grid-template-columns', 'position', 'border-radius'],
  },
});

export const NON_COLOR_FEATURES = Object.freeze(
  Object.entries(NON_COLOR_FEATURE_IDS_BY_CATEGORY).flatMap(([category, ids]) => (
    ids.map((id) => feature(
      id,
      category,
      describeFeature(id, category),
      CATEGORY_EVIDENCE[category].selectors,
      CATEGORY_EVIDENCE[category].properties,
    ))
  )),
);

export const NON_COLOR_FEATURE_DICTIONARY = Object.freeze(
  Object.fromEntries(NON_COLOR_FEATURES.map((featureEntry) => [featureEntry.id, featureEntry])),
);

export function assertKnownNonColorFeatureIds(featureIds, label = 'nonColorFeatureIds') {
  const unknown = featureIds.filter((featureId) => !NON_COLOR_FEATURE_DICTIONARY[featureId]);
  if (unknown.length) {
    throw new Error(`${label} contains unknown feature ids: ${unknown.join(', ')}`);
  }
}

function feature(id, category, description, evidenceSelectors, evidenceProperties, options = {}) {
  return Object.freeze({
    id,
    category,
    description,
    evidenceSelectors,
    evidenceProperties,
    requiresScreenshotEvidence: options.requiresScreenshotEvidence ?? true,
  });
}

function describeFeature(id, category) {
  return `${category} non-color feature ${id.replaceAll('-', ' ')}.`;
}
