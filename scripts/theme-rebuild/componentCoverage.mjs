const COMPONENT_SELECTOR_PATTERNS = Object.freeze({
  document: [/\.document-reader\b/, /\.markdown-paragraph\b/, /\.markdown-list\b/],
  headings: [/\.markdown-heading\b/, /\.markdown-heading--h[1-6]\b/],
  tables: [/\.markdown-table\b/, /\.markdown-table-cell\b/, /\.markdown-table-wrapper\b/],
  'fullscreen-table': [/table-fullscreen/, /\[data-theme-layout-scope=["']?table-fullscreen-actions/],
  code: [/\.markdown-code-block\b/, /\.markdown-inline-code\b/],
  callouts: [/\.callout\b/, /\.callout-title\b/],
  'file-tree': [/\.file-tree\b/, /file-tree-indicator/, /\.file-tree__/],
  toolbar: [/\.reader-toolbar\b/, /toolbar-group/],
  outline: [/\.outline-panel\b/, /outline-indicator/],
  mermaid: [/\.mermaid-fullscreen\b/, /mermaid-actions/],
  'json-yaml': [/\.json-reader\b/, /\.yaml-reader\b/],
  dashboard: [/callout-dashboard/, /theme-preview-overlay/],
});

export const REQUIRED_COMPONENTS = Object.freeze(Object.keys(COMPONENT_SELECTOR_PATTERNS));

export function analyzeComponentCoverage(selectors) {
  const selectorText = Array.isArray(selectors) ? selectors.join('\n') : String(selectors ?? '');
  const coveredComponents = REQUIRED_COMPONENTS.filter((component) => (
    COMPONENT_SELECTOR_PATTERNS[component].some((pattern) => pattern.test(selectorText))
  ));

  return {
    coveredComponents,
    missingComponents: REQUIRED_COMPONENTS.filter((component) => !coveredComponents.includes(component)),
  };
}
