import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { type Plugin, unified } from 'unified';
import { visit } from 'unist-util-visit';

import type { Root } from 'mdast';
import type { Element, Root as HastRoot, Text } from 'hast';
import type { Options as SanitizeSchema } from 'rehype-sanitize';
import type { Node } from 'unist';

import type { MarkdownLink, OutlineItem, RenderDiagnostic, RenderResult } from '../types';

type RenderOptions = {
  allowHtml?: boolean;
  chunkMode?: boolean;
};

type HeadingNode = {
  type: 'heading';
  depth: number;
};

type LinkNode = {
  type: 'link';
  url: string;
};

type YamlNode = {
  type: 'yaml';
  value: string;
};

type SanitizeAttributeList = NonNullable<NonNullable<SanitizeSchema['attributes']>[string]>;

function withoutClassNameRules(attributes: SanitizeAttributeList | undefined): SanitizeAttributeList {
  return (attributes ?? []).filter((attribute) => !(Array.isArray(attribute) && attribute[0] === 'className')) as SanitizeAttributeList;
}

export async function renderMarkdown(
  markdown: string,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const diagnostics: RenderDiagnostic[] = [];
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml', 'toml']).parse(markdown);
  const { outline, links, title } = collectMarkdownMetadata(tree);
  const schema: SanitizeSchema = {
    ...defaultSchema,
    clobberPrefix: '',
    tagNames: [
      ...(defaultSchema.tagNames ?? []),
      'button',
    ],
    attributes: {
      ...defaultSchema.attributes,
      h1: [
        ...(defaultSchema.attributes?.h1 ?? []),
        ['className', /^markdown-/],
        ['dataHeadingLevel', /^[1-6]$/],
      ],
      h2: [
        ...(defaultSchema.attributes?.h2 ?? []),
        ['className', /^markdown-/],
        ['dataHeadingLevel', /^[1-6]$/],
      ],
      h3: [
        ...(defaultSchema.attributes?.h3 ?? []),
        ['className', /^markdown-/],
        ['dataHeadingLevel', /^[1-6]$/],
      ],
      h4: [
        ...(defaultSchema.attributes?.h4 ?? []),
        ['className', /^markdown-/],
        ['dataHeadingLevel', /^[1-6]$/],
      ],
      h5: [
        ...(defaultSchema.attributes?.h5 ?? []),
        ['className', /^markdown-/],
        ['dataHeadingLevel', /^[1-6]$/],
      ],
      h6: [
        ...(defaultSchema.attributes?.h6 ?? []),
        ['className', /^markdown-/],
        ['dataHeadingLevel', /^[1-6]$/],
      ],
      p: [
        ...(defaultSchema.attributes?.p ?? []),
        ['className', /^markdown-/],
      ],
      a: [
        ...withoutClassNameRules(defaultSchema.attributes?.a),
        ['className', /^markdown-/],
        ['dataLinkKind', 'external', 'relative', 'hash'],
      ],
      blockquote: [
        ...(defaultSchema.attributes?.blockquote ?? []),
        ['className', /^markdown-/, 'callout', /^callout-[a-z0-9_-]+$/],
        ['dataCallout', /^[a-z0-9_-]+$/],
        ['dataCalloutFold', /^[+-]$/],
      ],
      ul: [
        ...withoutClassNameRules(defaultSchema.attributes?.ul),
        ['className', /^markdown-/, 'contains-task-list'],
      ],
      ol: [
        ...(defaultSchema.attributes?.ol ?? []),
        ['className', /^markdown-/],
      ],
      li: [
        ...withoutClassNameRules(defaultSchema.attributes?.li),
        ['className', /^markdown-/, 'task-list-item'],
        ['dataTaskState', 'checked', 'open'],
      ],
      pre: [
        ...(defaultSchema.attributes?.pre ?? []),
        ['className', /^markdown-/],
      ],
      code: [
        ...withoutClassNameRules(defaultSchema.attributes?.code),
        ['className', /^language-/, /^markdown-/],
        ['dataLanguage', /^[a-z0-9_+.-]{1,40}$/i],
      ],
      input: [
        ...(defaultSchema.attributes?.input ?? []),
        ['type', 'checkbox'],
        ['className', /^markdown-/],
        'checked',
        'disabled',
      ],
      div: [
        ...(defaultSchema.attributes?.div ?? []),
        ['className', 'table-fullscreen', 'table-fullscreen__table', 'table-fullscreen__actions', 'callout-title', 'callout-content'],
        ['dataThemeLayoutScope', 'table-actions'],
      ],
      table: [
        ...(defaultSchema.attributes?.table ?? []),
        ['className', /^markdown-/],
        ['dataRowCount', /^\d+$/],
        ['dataColumnCount', /^\d+$/],
        ['dataTableSize', 'compact', 'regular', 'large'],
        ['dataTableOverflow', 'fit', 'wide'],
      ],
      thead: [
        ...(defaultSchema.attributes?.thead ?? []),
        ['className', /^markdown-/],
      ],
      tbody: [
        ...(defaultSchema.attributes?.tbody ?? []),
        ['className', /^markdown-/],
      ],
      tr: [
        ...(defaultSchema.attributes?.tr ?? []),
        ['className', /^markdown-/],
      ],
      th: [
        ...(defaultSchema.attributes?.th ?? []),
        ['className', /^markdown-/],
      ],
      td: [
        ...(defaultSchema.attributes?.td ?? []),
        ['className', /^markdown-/],
      ],
      span: [
        ...(defaultSchema.attributes?.span ?? []),
        ['className', 'table-fullscreen__row-count', /^markdown-/],
        ['dataTag', /^[a-z0-9][a-z0-9/_-]{0,63}$/i],
        ['title', /^表格共有 \d+ 行$/],
      ],
      button: [
        ...(defaultSchema.attributes?.button ?? []),
        ['className', 'table-fullscreen__trigger'],
        ['type', 'button'],
        ['ariaLabel', '最大化表格'],
        ['title', '最大化表格'],
      ],
    },
  };
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(removeFrontmatter)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: options.allowHtml ?? false })
    .use(rehypeSlug);

  const file = await processor
    .use(wrapTablesForFullscreen)
    .use(addMarkdownSemanticClasses)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown);

  return {
    html: String(file),
    outline,
    title,
    links,
    diagnostics,
  };
}

function collectMarkdownMetadata(tree: unknown): {
  outline: OutlineItem[];
  links: MarkdownLink[];
  title: string | null;
} {
  const slugger = new GithubSlugger();
  const flatHeadings: OutlineItem[] = [];
  const links: MarkdownLink[] = [];
  let title: string | null = null;

  visit(tree as Node, (node) => {
    if (isYamlNode(node)) {
      title ??= extractYamlTitle(node.value);
    }

    if (isHeadingNode(node)) {
      const text = toString(node);
      flatHeadings.push({
        id: slugger.slug(text),
        text,
        depth: node.depth,
        children: [],
      });
    }

    if (isLinkNode(node)) {
      links.push({
        href: node.url,
        text: toString(node),
      });
    }
  });

  return {
    outline: nestOutline(flatHeadings),
    links,
    title,
  };
}

function nestOutline(items: OutlineItem[]): OutlineItem[] {
  const root: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  for (const item of items) {
    while (stack.length && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(item);
    } else {
      root.push(item);
    }

    stack.push(item);
  }

  return root;
}

const removeFrontmatter: Plugin<[], Root> = () => {
  return (tree) => {
    tree.children = tree.children.filter((node) => !isYamlNode(node) && !isTomlNode(node));
  };
};

const wrapTablesForFullscreen: Plugin<[], HastRoot> = () => {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!isTableElement(node) || typeof index !== 'number' || !parent || !('children' in parent)) {
        return;
      }

      parent.children[index] = createTableFullscreenWrapper(node) as typeof parent.children[number];
    });
  };
};

const addMarkdownSemanticClasses: Plugin<[], HastRoot> = () => {
  return (tree) => {
    visit(tree, 'element', (node) => {
      addSemanticClass(node);
    });

    visit(tree, 'text', (node, index, parent) => {
      if (typeof index !== 'number' || !parent || !('children' in parent) || isInsideCodeElement(parent)) {
        return;
      }

      const replacement = splitTextIntoTagNodes(node);
      if (replacement.length > 1) {
        parent.children.splice(index, 1, ...replacement);
      }
    });
  };
};

function addSemanticClass(node: Element): void {
  if (/^h[1-6]$/.test(node.tagName)) {
    addClasses(node, ['markdown-heading', `markdown-heading--${node.tagName}`]);
    node.properties = {
      ...node.properties,
      dataHeadingLevel: node.tagName.slice(1),
    };
    return;
  }

  switch (node.tagName) {
    case 'p':
      addClasses(node, ['markdown-paragraph']);
      break;
    case 'a':
      addClasses(node, ['markdown-link', classifyLink(node)]);
      node.properties = {
        ...node.properties,
        dataLinkKind: getLinkKind(node),
      };
      break;
    case 'blockquote':
      addClasses(node, ['markdown-quote']);
      decorateCallout(node);
      break;
    case 'ul':
      addClasses(node, ['markdown-list', 'markdown-list--unordered']);
      break;
    case 'ol':
      addClasses(node, ['markdown-list', 'markdown-list--ordered']);
      break;
    case 'li':
      addListItemClasses(node);
      break;
    case 'pre':
      addClasses(node, ['markdown-code-block']);
      addBlockCodeClass(node);
      break;
    case 'code':
      addClasses(
        node,
        normalizeClassName(node.properties?.className).includes('markdown-code--block')
          ? ['markdown-code']
          : ['markdown-code', 'markdown-code--inline'],
      );
      break;
    case 'input':
      if (node.properties?.type === 'checkbox') {
        addClasses(node, ['markdown-task-checkbox']);
      }
      break;
    case 'table':
      addClasses(node, ['markdown-table']);
      decorateTableStats(node);
      break;
    case 'thead':
      addClasses(node, ['markdown-table-head']);
      break;
    case 'tbody':
      addClasses(node, ['markdown-table-body']);
      break;
    case 'tr':
      addClasses(node, ['markdown-table-row']);
      break;
    case 'th':
      addClasses(node, ['markdown-table-cell', 'markdown-table-cell--head']);
      break;
    case 'td':
      addClasses(node, ['markdown-table-cell']);
      break;
    default:
      break;
  }
}

function decorateCallout(node: Element): void {
  const marker = extractCalloutMarker(node);
  if (!marker) {
    return;
  }

  addClasses(node, ['callout', `callout-${marker.type}`]);
  node.properties = {
    ...node.properties,
    dataCallout: marker.type,
    ...(marker.fold ? { dataCalloutFold: marker.fold } : {}),
  };
  node.children = [
    {
      type: 'element',
      tagName: 'div',
      properties: { className: ['callout-title'] },
      children: [{ type: 'text', value: marker.title || formatCalloutTitle(marker.type) }],
    },
    {
      type: 'element',
      tagName: 'div',
      properties: { className: ['callout-content'] },
      children: node.children,
    },
  ];
}

function extractCalloutMarker(node: Element): { type: string; fold: string; title: string } | null {
  const firstParagraphIndex = node.children?.findIndex((child) => isElementWithTag(child, 'p')) ?? -1;
  if (firstParagraphIndex < 0) {
    return null;
  }

  const firstChild = node.children[firstParagraphIndex];
  if (!isElementWithTag(firstChild, 'p')) {
    return null;
  }
  const firstText = firstChild.children?.[0];
  if (!isTextNode(firstText)) {
    return null;
  }

  const match = firstText.value.match(/^\[!([a-z][a-z0-9_-]{0,31})\]([+-]?)(?:[ \t]+([^\r\n]*))?(?:\r?\n)?/i);
  if (!match) {
    return null;
  }

  const markerText = match[0];
  const remainingText = firstText.value.slice(markerText.length);
  if (remainingText) {
    firstText.value = remainingText;
  } else {
    firstChild.children.splice(0, 1);
  }

  if (firstChild.children.length === 0) {
    node.children.splice(firstParagraphIndex, 1);
  }

  return {
    type: match[1].toLowerCase(),
    fold: match[2] ?? '',
    title: (match[3] ?? '').trim(),
  };
}

function isTextNode(node: unknown): node is Text {
  return Boolean(node && typeof node === 'object' && 'type' in node && node.type === 'text');
}

function formatCalloutTitle(type: string): string {
  return type
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function addListItemClasses(node: Element): void {
  const checkbox = findDirectCheckbox(node);
  if (!checkbox) {
    addClasses(node, ['markdown-list-item']);
    return;
  }

  const state = checkbox.properties?.checked ? 'checked' : 'open';
  addClasses(node, [
    'markdown-list-item',
    'markdown-task',
    state === 'checked' ? 'markdown-task--checked' : 'markdown-task--open',
  ]);
  node.properties = {
    ...node.properties,
    dataTaskState: state,
  };
}

function findDirectCheckbox(node: Element): Element | null {
  for (const child of node.children ?? []) {
    if (isElementWithTag(child, 'input') && child.properties?.type === 'checkbox') {
      return child;
    }
  }
  return null;
}

function addBlockCodeClass(pre: Element): void {
  const code = pre.children?.find((child) => isElementWithTag(child, 'code'));
  if (code && isElementWithTag(code, 'code')) {
    removeClass(code, 'markdown-code--inline');
    addClasses(code, ['markdown-code', 'markdown-code--block']);
    const language = getCodeLanguage(code);
    if (language) {
      code.properties = {
        ...code.properties,
        dataLanguage: language,
      };
    }
  }
}

function classifyLink(node: Element): string {
  return `markdown-link--${getLinkKind(node) === 'hash' ? 'anchor' : getLinkKind(node) === 'relative' ? 'internal' : 'external'}`;
}

function getLinkKind(node: Element): 'external' | 'relative' | 'hash' {
  const href = typeof node.properties?.href === 'string' ? node.properties.href : '';
  if (href.startsWith('#')) {
    return 'hash';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return 'external';
  }
  return 'relative';
}

function getCodeLanguage(node: Element): string | null {
  const languageClass = normalizeClassName(node.properties?.className)
    .find((className) => className.startsWith('language-'));
  return languageClass ? languageClass.slice('language-'.length).toLowerCase() : null;
}

function decorateTableStats(table: Element): void {
  const rowCount = countTableBodyRows(table);
  const columnCount = countTableColumns(table);
  table.properties = {
    ...table.properties,
    dataRowCount: String(rowCount),
    dataColumnCount: String(columnCount),
    dataTableSize: rowCount > 40 || columnCount > 8 ? 'large' : rowCount > 12 || columnCount > 5 ? 'regular' : 'compact',
    dataTableOverflow: columnCount > 6 ? 'wide' : 'fit',
  };
}

function splitTextIntoTagNodes(node: Text): Array<Text | Element> {
  const tagPattern = /(^|[\s([{])#([a-z0-9][a-z0-9/_-]{0,63})(?=$|[\s.,;:!?)}\]])/gi;
  const parts: Array<Text | Element> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(node.value))) {
    const [fullMatch, prefix, tag] = match;
    const tagStart = match.index + prefix.length;
    if (tagStart > lastIndex) {
      parts.push({
        type: 'text',
        value: node.value.slice(lastIndex, tagStart),
      });
    }

    parts.push({
      type: 'element',
      tagName: 'span',
      properties: {
        className: ['markdown-tag'],
        dataTag: tag.toLowerCase(),
      },
      children: [
        {
          type: 'text',
          value: `#${tag}`,
        },
      ],
    });

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex === 0) {
    return [node];
  }

  if (lastIndex < node.value.length) {
    parts.push({
      type: 'text',
      value: node.value.slice(lastIndex),
    });
  }

  return parts;
}

function isInsideCodeElement(parent: unknown): boolean {
  return isElementWithTag(parent, 'code');
}

function addClasses(node: Element, classNames: string[]): void {
  const existing = normalizeClassName(node.properties?.className);
  const next = [...existing];
  for (const className of classNames) {
    if (!next.includes(className)) {
      next.push(className);
    }
  }
  node.properties = {
    ...node.properties,
    className: next,
  };
}

function removeClass(node: Element, className: string): void {
  const next = normalizeClassName(node.properties?.className).filter((item) => item !== className);
  node.properties = {
    ...node.properties,
    className: next,
  };
}

function normalizeClassName(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean);
  }
  return [];
}

function createTableFullscreenWrapper(table: Element): Element {
  const rowCount = countTableBodyRows(table);

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['table-fullscreen'],
    },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-fullscreen__table'],
        },
        children: [table],
      },
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-fullscreen__actions'],
          dataThemeLayoutScope: 'table-actions',
        },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['table-fullscreen__row-count'],
              title: `表格共有 ${rowCount} 行`,
            },
            children: [
              {
                type: 'text',
                value: `${rowCount} 行`,
              },
            ],
          },
          {
            type: 'element',
            tagName: 'button',
            properties: {
              type: 'button',
              className: ['table-fullscreen__trigger'],
              ariaLabel: '最大化表格',
              title: '最大化表格',
            },
            children: [],
          },
        ],
      },
    ],
  };
}

function countTableBodyRows(table: Element): number {
  const bodyRows = table.children
    ?.filter((child) => isElementWithTag(child, 'tbody'))
    .flatMap((body) => body.children?.filter((child) => isElementWithTag(child, 'tr')) ?? []) ?? [];

  if (bodyRows.length > 0) {
    return bodyRows.length;
  }

  return countDescendantRows(table);
}

function countTableColumns(table: Element): number {
  const headRows = table.children
    ?.filter((child) => isElementWithTag(child, 'thead'))
    .flatMap((head) => head.children?.filter((child) => isElementWithTag(child, 'tr')) ?? []) ?? [];
  const bodyRows = table.children
    ?.filter((child) => isElementWithTag(child, 'tbody'))
    .flatMap((body) => body.children?.filter((child) => isElementWithTag(child, 'tr')) ?? []) ?? [];
  const firstRow = headRows[0] ?? bodyRows[0];
  if (!isElementWithTag(firstRow, 'tr')) {
    return 0;
  }

  return firstRow.children?.filter((child) => isElementWithTag(child, 'th') || isElementWithTag(child, 'td')).length ?? 0;
}

function countDescendantRows(node: Element): number {
  return node.children?.reduce((count, child) => {
    if (!isRecord(child) || child.type !== 'element') {
      return count;
    }

    return count + (child.tagName === 'tr' ? 1 : countDescendantRows(child as Element));
  }, 0) ?? 0;
}

function isElementWithTag(node: unknown, tagName: string): node is Element {
  return isRecord(node) && node.type === 'element' && node.tagName === tagName;
}

function extractYamlTitle(value: string): string | null {
  const match = /^title:\s*['"]?(.+?)['"]?\s*$/m.exec(value);
  return match?.[1] ?? null;
}

function isHeadingNode(node: unknown): node is HeadingNode {
  return isRecord(node) && node.type === 'heading' && typeof node.depth === 'number';
}

function isLinkNode(node: unknown): node is LinkNode {
  return isRecord(node) && node.type === 'link' && typeof node.url === 'string';
}

function isYamlNode(node: unknown): node is YamlNode {
  return isRecord(node) && node.type === 'yaml' && typeof node.value === 'string';
}

function isTomlNode(node: unknown): boolean {
  return isRecord(node) && node.type === 'toml';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTableElement(node: unknown): node is Element {
  return isRecord(node) && node.type === 'element' && node.tagName === 'table';
}
