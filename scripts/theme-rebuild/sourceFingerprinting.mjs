import { createHash } from 'node:crypto';

export function buildSourceFingerprint({ id, css }) {
  const normalizedCss = normalizeCss(css);
  return {
    id,
    sourceCssSha256: sha256(css),
    normalizedCssSha256: sha256(normalizedCss),
    declarationBlockHashes: extractDeclarationBlockHashes(normalizedCss),
    selectorTrigrams: extractSelectorTrigrams(normalizedCss),
    textWindowHashes: extractTextWindowHashes(normalizedCss, 120),
    bytes: Buffer.byteLength(css, 'utf8'),
    normalizedBytes: Buffer.byteLength(normalizedCss, 'utf8'),
  };
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function normalizeCss(css) {
  return String(css ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDeclarationBlockHashes(css) {
  const hashes = [];
  const blockPattern = /\{([^{}]+)\}/g;
  let match;
  while ((match = blockPattern.exec(css))) {
    const block = match[1]
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .sort()
      .join(';');
    if (block) {
      hashes.push(sha256(block));
    }
  }
  return [...new Set(hashes)].sort();
}

function extractSelectorTrigrams(css) {
  const selectors = css
    .split('{')
    .slice(0, -1)
    .map((part) => part.split('}').pop()?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  const normalized = selectors.replace(/\s+/g, ' ');
  const trigrams = new Set();
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    trigrams.add(normalized.slice(index, index + 3));
  }
  return [...trigrams].sort();
}

function extractTextWindowHashes(css, windowSize) {
  const hashes = [];
  if (css.length < windowSize) {
    return css ? [sha256(css)] : [];
  }
  for (let index = 0; index <= css.length - windowSize; index += 1) {
    hashes.push(sha256(css.slice(index, index + windowSize)));
  }
  return [...new Set(hashes)].sort();
}
