import { createHash } from 'node:crypto';

import * as csstree from 'css-tree';

const COLOR_PROPERTY_PATTERN = /(?:^|-)color$|background$|background-color$|border-color$|outline-color$|text-decoration-color$|caret-color$|fill$|stroke$/;
const COLOR_VALUE_PATTERN = /#(?:[0-9a-f]{3,8})\b|rgba?\(|hsla?\(|lab\(|lch\(|oklab\(|oklch\(|color-mix\(|\b(?:red|blue|green|yellow|purple|pink|orange|cyan|black|white|transparent|currentcolor)\b/i;
const CSS_WINDOW_LENGTH = 120;

export function analyzeCssMetrics(css) {
  if (typeof css !== 'string' || !css.trim()) {
    return emptyMetrics();
  }

  const ast = csstree.parse(css, {
    positions: true,
    parseValue: true,
    parseCustomProperty: false,
  });
  const selectors = [];
  const declarations = [];
  const colorDeclarations = [];
  const nonColorDeclarations = [];
  const declarationBlockHashes = [];
  let ruleCount = 0;

  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      ruleCount += 1;
      const selectorText = csstree.generate(node.prelude).trim();
      selectors.push(...splitSelectorList(selectorText));

      const blockDeclarations = [];
      node.block?.children?.forEach((child) => {
        if (child.type !== 'Declaration') {
          return;
        }
        const property = String(child.property ?? '').trim().toLowerCase();
        const value = csstree.generate(child.value).trim();
        const declaration = {
          selector: selectorText,
          property,
          value,
        };
        declarations.push(declaration);
        blockDeclarations.push(declaration);
        if (isColorDeclaration(property, value)) {
          colorDeclarations.push(declaration);
        } else {
          nonColorDeclarations.push(declaration);
        }
      });

      if (blockDeclarations.length) {
        declarationBlockHashes.push(hashText(blockDeclarations.map((declaration) => (
          `${declaration.property}:${declaration.value}`
        )).sort().join(';')));
      }
    },
  });

  const declarationCount = declarations.length;
  const colorDeclarationCount = colorDeclarations.length;
  const nonColorDeclarationCount = nonColorDeclarations.length;
  const uniqueSelectors = [...new Set(selectors)].sort((a, b) => a.localeCompare(b));
  return {
    bytes: Buffer.byteLength(css, 'utf8'),
    ruleCount,
    selectorCount: selectors.length,
    declarationCount,
    colorDeclarationCount,
    nonColorDeclarationCount,
    nonColorDeclarationRatio: declarationCount ? nonColorDeclarationCount / declarationCount : 0,
    selectors: uniqueSelectors,
    declarations,
    colorDeclarations,
    nonColorDeclarations,
    declarationBlockHashes: [...new Set(declarationBlockHashes)].sort((a, b) => a.localeCompare(b)),
    selectorTrigrams: buildTrigramHashes(uniqueSelectors.join('\n')),
    textWindowHashes: buildTextWindowHashes(normalizeCss(css), CSS_WINDOW_LENGTH),
  };
}

export const analyzeCss = analyzeCssMetrics;

export function analyzeBoxShadowGeometry(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'none') {
    return {
      hasGeometry: false,
      geometrySignature: '',
      colorOnly: false,
    };
  }

  const geometryTokens = normalized
    .split(/\s+/)
    .filter((token) => (
      token === 'inset' ||
      /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|ch|vh|vw|%)$/.test(token) ||
      /^0(?:\.0+)?$/.test(token)
    ));
  const nonZeroGeometryTokens = geometryTokens.filter((token) => token !== 'inset' && !/^0(?:px|rem|em|ch|vh|vw|%)?$/.test(token));

  return {
    hasGeometry: nonZeroGeometryTokens.length > 0 || geometryTokens.includes('inset'),
    geometrySignature: geometryTokens.join(' '),
    colorOnly: COLOR_VALUE_PATTERN.test(normalized) && nonZeroGeometryTokens.length === 0 && !geometryTokens.includes('inset'),
  };
}

export function splitSelectorList(selectorList) {
  const selectors = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let index = 0; index < selectorList.length; index += 1) {
    const char = selectorList[index];
    const previous = selectorList[index - 1];

    if (quote) {
      current += char;
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1);
    }

    if (char === ',' && depth === 0) {
      selectors.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    selectors.push(current.trim());
  }

  return selectors;
}

function isColorDeclaration(property, value) {
  if (property === 'box-shadow' || property === 'text-shadow') {
    return !analyzeBoxShadowGeometry(value).hasGeometry;
  }
  if (property.startsWith('--') && COLOR_VALUE_PATTERN.test(value)) {
    return true;
  }
  return COLOR_PROPERTY_PATTERN.test(property) || COLOR_VALUE_PATTERN.test(value);
}

function emptyMetrics() {
  return {
    ruleCount: 0,
    selectorCount: 0,
    declarationCount: 0,
    colorDeclarationCount: 0,
    nonColorDeclarationCount: 0,
    nonColorDeclarationRatio: 0,
    selectors: [],
    declarations: [],
    colorDeclarations: [],
    nonColorDeclarations: [],
    declarationBlockHashes: [],
    selectorTrigrams: [],
    textWindowHashes: [],
  };
}

function buildTrigramHashes(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < 3) {
    return normalized ? [hashText(normalized)] : [];
  }
  const hashes = new Set();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    hashes.add(hashText(normalized.slice(index, index + 3)));
  }
  return [...hashes].sort((a, b) => a.localeCompare(b));
}

function buildTextWindowHashes(text, windowLength) {
  if (!text) {
    return [];
  }
  if (text.length <= windowLength) {
    return [hashText(text)];
  }
  const hashes = new Set();
  for (let index = 0; index <= text.length - windowLength; index += 1) {
    hashes.add(hashText(text.slice(index, index + windowLength)));
  }
  return [...hashes].sort((a, b) => a.localeCompare(b));
}

function normalizeCss(css) {
  return String(css ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}
