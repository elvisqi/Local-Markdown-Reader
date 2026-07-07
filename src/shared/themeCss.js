import * as csstree from 'css-tree';

export const THEME_CSS_SANITIZER_VERSION = 'theme-css-ast-v1';

export const CONTROLLED_THEME_LAYOUT_SCOPES = [
  'table-actions',
  'table-fullscreen-actions',
  'mermaid-actions',
  'file-tree-indicator',
  'toolbar-group',
  'outline-indicator',
  'theme-preview-overlay',
];

const MAX_THEME_CSS_LENGTH = 128 * 1024;
const SUPPORTED_AT_RULES = new Set(['media', 'supports', 'container']);
const CONTROLLED_SCOPE_PATTERN = /\[data-theme-layout-scope=(?:"([^"]+)"|'([^']+)'|([^\]\s]+))\]/g;
const UNSAFE_VALUE_PATTERN = /url\s*\(|@import|expression\s*\(|javascript:|behavior\s*:/i;
const FORBIDDEN_SELECTOR_PATTERN = /(^|[\s>+~,])(?:iframe|script|style|link|meta)(?=[\s.#:[>+~]|$)/i;
const GLOBAL_RESET_SELECTOR_PATTERN = /(^|[\s>+~,])\*(?=[\s.#:[>+~]|$)/;
const CRITICAL_INTERACTION_SELECTOR_PATTERN = /(?:\.file-tree|\.reader-toolbar|\.outline-panel|\.document-reader|\.table-fullscreen|\.mermaid-fullscreen|\.reader-layout|\.reader-shell)/;
const FILE_TREE_ROW_SELECTOR_PATTERN = /\.file-tree__(?:row|node|name)|\.file-tree--arborist/;
const DOCUMENT_READER_SELECTOR_PATTERN = /\.document-reader(?:[\s.#:[>+~]|$)/;

export function sanitizeAndScopeThemeCss(css, scope, options = {}) {
  const sourceCss = normalizeCssInput(css);
  const diagnostics = [];
  const sourceCssHash = hashText(sourceCss);

  if (!sourceCss) {
    return {
      sourceCss,
      scopedCss: '',
      sanitizerVersion: THEME_CSS_SANITIZER_VERSION,
      sourceCssHash,
      scopedCssHash: hashText(''),
      diagnostics,
    };
  }

  let ast;
  try {
    ast = csstree.parse(sourceCss, {
      positions: true,
      parseValue: true,
      parseCustomProperty: false,
    });
  } catch (error) {
    throw createCssError('主题 CSS 必须包含有效的 CSS 规则。', options, null, error);
  }

  validateThemeCssAst(ast, options, diagnostics);
  scopeThemeCssAst(ast, scope);

  const scopedCss = csstree.generate(ast).trim();
  return {
    sourceCss,
    scopedCss,
    sanitizerVersion: THEME_CSS_SANITIZER_VERSION,
    sourceCssHash,
    scopedCssHash: hashText(scopedCss),
    diagnostics,
  };
}

export function scopeThemeCss(css, scope, options = {}) {
  return sanitizeAndScopeThemeCss(css, scope, options).scopedCss;
}

function normalizeCssInput(css) {
  if (typeof css !== 'string') {
    throw new Error('主题包 css 字段必须是字符串。');
  }

  if (css.length > MAX_THEME_CSS_LENGTH) {
    throw new Error('主题 CSS 不能超过 128KB。');
  }

  const sourceCss = css.trim();
  if (sourceCss && !sourceCss.includes('{')) {
    throw new Error('主题 CSS 必须包含完整的 CSS 规则。');
  }

  if (UNSAFE_VALUE_PATTERN.test(sourceCss) || /@font-face/i.test(sourceCss)) {
    throw new Error('主题 CSS 不能包含远程资源、@import 或不安全表达式。');
  }

  return sourceCss;
}

function validateThemeCssAst(ast, options, diagnostics) {
  csstree.walk(ast, {
    enter(node) {
      if (node.type === 'Atrule') {
        validateAtRule(node, options, diagnostics);
        return;
      }

      if (node.type !== 'Rule') {
        return;
      }

      const selector = csstree.generate(node.prelude).trim();
      const selectors = splitSelectorList(selector);
      validateSelectorList(selectors, options, diagnostics);
      validateRuleDeclarations(node, selectors, options, diagnostics);
    },
  });
}

function validateAtRule(node, options, diagnostics) {
  const name = String(node.name ?? '').toLowerCase();
  if (!SUPPORTED_AT_RULES.has(name)) {
    addDiagnosticAndThrow(
      diagnostics,
      {
        selector: `@${name}`,
        property: '',
        value: '',
        reason: `主题 CSS 暂不支持 @${name} 规则。`,
      },
      options,
      node,
    );
  }
}

function validateSelectorList(selectors, options, diagnostics) {
  if (selectors.length === 0) {
    addDiagnosticAndThrow(
      diagnostics,
      { selector: '', property: '', value: '', reason: '主题 CSS 选择器不能为空。' },
      options,
      null,
    );
  }

  for (const selector of selectors) {
    if (FORBIDDEN_SELECTOR_PATTERN.test(selector)) {
      addDiagnosticAndThrow(
        diagnostics,
        { selector, property: '', value: '', reason: '主题 CSS 不能选择非 reader 内容节点。' },
        options,
        null,
      );
    }

    if (GLOBAL_RESET_SELECTOR_PATTERN.test(selector)) {
      addDiagnosticAndThrow(
        diagnostics,
        { selector, property: '', value: '', reason: '主题 CSS 不能使用全局重置选择器。' },
        options,
        null,
      );
    }
  }
}

function validateRuleDeclarations(rule, selectors, options, diagnostics) {
  rule.block?.children?.forEach((declaration) => {
    if (declaration.type !== 'Declaration') {
      return;
    }

    const property = String(declaration.property ?? '').trim().toLowerCase();
    const value = csstree.generate(declaration.value).trim();
    const normalizedValue = value.toLowerCase();

    if (UNSAFE_VALUE_PATTERN.test(value)) {
      failDeclaration(selectors, property, value, '主题 CSS 不能包含远程资源、@import 或不安全表达式。', options, diagnostics, declaration);
    }

    if (property === '--reader-file-tree-row-height') {
      validateFileTreeRowHeight(value, selectors, property, options, diagnostics, declaration);
    }

    if (
      FILE_TREE_ROW_SELECTOR_PATTERN.test(selectors.join(', ')) &&
      ['height', 'min-height', 'line-height'].includes(property)
    ) {
      failDeclaration(
        selectors,
        property,
        value,
        '主题 CSS 不能直接覆盖文件树虚拟行高，必须使用 --reader-file-tree-row-height。',
        options,
        diagnostics,
        declaration,
      );
    }

    if (['width', 'max-width'].includes(property) && selectors.some((selector) => DOCUMENT_READER_SELECTOR_PATTERN.test(selector))) {
      failDeclaration(selectors, property, value, '主题 CSS 不能覆盖正文阅读宽度。', options, diagnostics, declaration);
    }

    if (property === 'position') {
      if (normalizedValue === 'fixed') {
        failDeclaration(selectors, property, value, '主题 CSS 禁止使用 position: fixed。', options, diagnostics, declaration);
      }
      if (normalizedValue === 'absolute' && !selectors.every(hasControlledLayoutScope)) {
        failDeclaration(
          selectors,
          property,
          value,
          '受限布局属性 position: absolute 必须作用在受控布局容器内。',
          options,
          diagnostics,
          declaration,
        );
      }
    }

    if (property === 'z-index') {
      const numericValue = Number.parseInt(value, 10);
      if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 20 || String(numericValue) !== value.trim()) {
        failDeclaration(selectors, property, value, '主题 CSS z-index 必须在 0 到 20 之间。', options, diagnostics, declaration);
      }
    }

    if (
      (property === 'display' && normalizedValue === 'none') ||
      (property === 'visibility' && normalizedValue === 'hidden') ||
      (property === 'opacity' && Number.parseFloat(value) === 0)
    ) {
      failCriticalDeclaration(selectors, property, value, '主题 CSS 不能隐藏关键交互元素。', options, diagnostics, declaration);
    }

    if (
      (property === 'pointer-events' && normalizedValue === 'none') ||
      (property === 'user-select' && normalizedValue === 'none') ||
      (property === 'touch-action' && normalizedValue === 'none')
    ) {
      failCriticalDeclaration(selectors, property, value, '主题 CSS 不能禁用核心交互。', options, diagnostics, declaration);
    }

    if (property === 'overflow' && normalizedValue === 'hidden') {
      failCriticalDeclaration(selectors, property, value, '主题 CSS 不能隐藏核心滚动容器溢出。', options, diagnostics, declaration);
    }

    if (property === 'transform') {
      failCriticalDeclaration(selectors, property, value, '主题 CSS 不能变换核心测量容器。', options, diagnostics, declaration);
    }
  });
}

function validateFileTreeRowHeight(value, selectors, property, options, diagnostics, node) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)px$/);
  const numericValue = match ? Number.parseFloat(match[1]) : NaN;
  if (!match || !Number.isFinite(numericValue) || numericValue < 22 || numericValue > 40) {
    failDeclaration(
      selectors,
      property,
      value,
      '--reader-file-tree-row-height 必须是 22px 到 40px 之间的 px 数值。',
      options,
      diagnostics,
      node,
    );
  }
}

function failCriticalDeclaration(selectors, property, value, reason, options, diagnostics, node) {
  if (!selectors.some((selector) => CRITICAL_INTERACTION_SELECTOR_PATTERN.test(selector))) {
    return;
  }

  failDeclaration(selectors, property, value, reason, options, diagnostics, node);
}

function failDeclaration(selectors, property, value, reason, options, diagnostics, node) {
  addDiagnosticAndThrow(
    diagnostics,
    {
      selector: selectors.join(', '),
      property,
      value,
      reason,
    },
    options,
    node,
  );
}

function addDiagnosticAndThrow(diagnostics, diagnostic, options, node) {
  const structuredDiagnostic = {
    themeId: options.themeId ?? null,
    line: node?.loc?.start?.line ?? null,
    column: node?.loc?.start?.column ?? null,
    ...diagnostic,
  };
  diagnostics.push(structuredDiagnostic);
  throw createCssError(diagnostic.reason, options, structuredDiagnostic, null);
}

function createCssError(message, options, diagnostic, cause) {
  const themePrefix = options.themeId ? `主题 ${options.themeId}：` : '';
  const error = new Error(`${themePrefix}${message}`);
  if (diagnostic) {
    error.diagnostic = diagnostic;
  }
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function hasControlledLayoutScope(selector) {
  const scopes = [...selector.matchAll(CONTROLLED_SCOPE_PATTERN)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter(Boolean);

  return scopes.some((scope) => CONTROLLED_THEME_LAYOUT_SCOPES.includes(scope));
}

function scopeThemeCssAst(ast, scope) {
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      const selector = csstree.generate(node.prelude).trim();
      node.prelude = csstree.parse(scopeSelectorList(selector, scope), { context: 'selectorList' });
    },
  });
}

function scopeSelectorList(selectorList, scope) {
  return splitSelectorList(selectorList)
    .map((selector) => scopeSelector(selector.trim(), scope))
    .filter(Boolean)
    .join(', ');
}

function splitSelectorList(selectorList) {
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

function scopeSelector(selector, scope) {
  if (!selector || selector.startsWith(scope)) {
    return selector;
  }

  if (selector.startsWith('.reader-app')) {
    return selector.replace(/^\.reader-app(?=[\s.#:[>+~]|$)/, scope);
  }

  if (/^(?:html|body|:root)(?=[\s.#:[>+~]|$)/.test(selector)) {
    return selector.replace(/^(?:html|body|:root)(?=[\s.#:[>+~]|$)/, scope);
  }

  return `${scope} ${selector}`;
}

function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = new Uint32Array(8);
  hash.set([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);

  for (let index = 0; index < bytes.length; index += 1) {
    const slot = index % hash.length;
    const value = bytes[index] + index + 0x9e3779b9;
    hash[slot] = Math.imul(hash[slot] ^ value, 0x85ebca6b) >>> 0;
    hash[(slot + 3) % hash.length] = (hash[(slot + 3) % hash.length] + Math.imul(value, 0xc2b2ae35)) >>> 0;
  }

  return Array.from(hash)
    .map((value) => value.toString(16).padStart(8, '0'))
    .join('');
}
