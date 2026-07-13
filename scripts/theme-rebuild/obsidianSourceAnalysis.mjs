import { createHash } from 'node:crypto';

import * as csstree from 'css-tree';

import { splitSelectorList } from './cssMetrics.mjs';

const COMPONENT_PATTERNS = Object.freeze({
  document: /markdown-(?:preview|source)|workspace-leaf-content|view-content/i,
  headings: /(?:^|[\s.:>#])h[1-6](?:\b|:)|heading|inline-title/i,
  tables: /table|thead|tbody|dataview/i,
  code: /code|pre|cm-line|syntax|token/i,
  callouts: /callout|admonition|blockquote/i,
  navigation: /nav-file|nav-folder|file-explorer|tree-item/i,
  toolbar: /toolbar|titlebar|view-header|status-bar|mod-left-split|mod-right-split/i,
  controls: /button|checkbox|toggle|input|dropdown|slider/i,
  metadata: /metadata|frontmatter|property|yaml|tag/i,
  graph: /graph-view|canvas|mermaid/i,
});

const PROPERTY_FAMILIES = Object.freeze({
  typography: /^(?:font|line-height|letter-spacing|text-(?:transform|decoration|indent|align)|white-space|word-break|hyphens)/,
  spacing: /^(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)/,
  sizing: /^(?:width|height|min-|max-|inline-size|block-size|aspect-ratio)/,
  shape: /^(?:border-radius|clip-path|border-(?:top|right|bottom|left)-(?:left-|right-)?radius)/,
  border: /^(?:border|outline)/,
  elevation: /^(?:box-shadow|text-shadow|filter|backdrop-filter|opacity)/,
  layout: /^(?:display|position|grid|flex|align-|justify-|place-|float|clear|overflow|z-index|columns|column-count)/,
  generated: /^(?:content|counter|list-style|quotes|transform|transform-origin|transition|animation)/,
});

export function analyzeObsidianSourceCss(css) {
  const ast = csstree.parse(css, {
    positions: false,
    parseValue: false,
    parseCustomProperty: false,
    onParseError() {},
  });
  let ruleCount = 0;
  let selectorCount = 0;
  let declarationCount = 0;
  let customPropertyCount = 0;
  let nonColorDeclarationCount = 0;
  const componentRules = Object.fromEntries(Object.keys(COMPONENT_PATTERNS).map((key) => [key, 0]));
  const propertyFamilies = Object.fromEntries(Object.keys(PROPERTY_FAMILIES).map((key) => [key, 0]));
  const propertyCounts = {};

  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      ruleCount += 1;
      const selectors = splitSelectorList(csstree.generate(node.prelude));
      selectorCount += selectors.length;
      for (const selector of selectors) {
        for (const [component, pattern] of Object.entries(COMPONENT_PATTERNS)) {
          if (pattern.test(selector)) componentRules[component] += 1;
        }
      }

      node.block?.children?.forEach((child) => {
        if (child.type !== 'Declaration') return;
        declarationCount += 1;
        const property = String(child.property ?? '').trim().toLowerCase();
        const value = csstree.generate(child.value).trim();
        if (property.startsWith('--')) customPropertyCount += 1;
        if (isColorDeclaration(property, value)) return;
        nonColorDeclarationCount += 1;
        propertyCounts[property] = (propertyCounts[property] ?? 0) + 1;
        for (const [family, pattern] of Object.entries(PROPERTY_FAMILIES)) {
          if (pattern.test(property)) propertyFamilies[family] += 1;
        }
      }
      );
    },
  });

  return {
    sha256: createHash('sha256').update(css).digest('hex'),
    bytes: Buffer.byteLength(css, 'utf8'),
    ruleCount,
    selectorCount,
    declarationCount,
    customPropertyCount,
    nonColorDeclarationCount,
    nonColorDeclarationRatio: round(declarationCount ? nonColorDeclarationCount / declarationCount : 0),
    componentRules,
    propertyFamilies,
    topNonColorProperties: Object.entries(propertyCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20)
      .map(([property, count]) => ({ property, count })),
  };
}

function isColorDeclaration(property, value) {
  if (/(?:^|-)color$|^(?:background|fill|stroke)$|^(?:border|outline)(?:-[a-z]+)?-color$/.test(property)) return true;
  if (property.startsWith('--') && /#(?:[0-9a-f]{3,8})\b|rgba?\(|hsla?\(|oklch?\(|color-mix\(/i.test(value)) return true;
  return false;
}

export function chooseThemeCssFiles(files) {
  const candidates = files.filter((file) => (
    file.bytes > 0 &&
    file.bytes <= 8 * 1024 * 1024 &&
    !/(?:^|\/)(?:node_modules|dist|build|snippets?|docs?|examples?|tests?)(?:\/|$)/i.test(file.path)
  ));
  const themeFiles = candidates.filter((file) => /(?:^|\/)theme\.css$/i.test(file.path));
  const obsidianFiles = candidates.filter((file) => /(?:^|\/)obsidian\.css$/i.test(file.path));
  const selected = themeFiles.length ? themeFiles : (obsidianFiles.length ? obsidianFiles : candidates);
  return selected
    .slice()
    .sort((a, b) => cssFilePriority(a.path) - cssFilePriority(b.path) || b.bytes - a.bytes || a.path.localeCompare(b.path))
    .slice(0, 1);
}

function cssFilePriority(path) {
  const base = path.split('/').pop()?.toLowerCase();
  if (base === 'theme.css') return 0;
  if (base === 'obsidian.css') return 1;
  return 2;
}

function round(value) {
  return Number(value.toFixed(4));
}
