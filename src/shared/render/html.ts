import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import type { Element, Root } from 'hast';
import type { Options as SanitizeSchema } from 'rehype-sanitize';
import type { Node } from 'unist';

import type { OutlineItem, RenderDiagnostic, RenderResult } from '../types';

const HTML_SANITIZE_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'article',
    'aside',
    'details',
    'figcaption',
    'figure',
    'footer',
    'header',
    'main',
    'nav',
    'section',
    'summary',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'aria-label',
      'aria-hidden',
      'role',
      ['id', /^[-_a-zA-Z0-9:.]+$/],
    ],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'href',
      'title',
      'target',
      'rel',
    ],
    h1: [
      ...(defaultSchema.attributes?.h1 ?? []),
      'id',
    ],
    h2: [
      ...(defaultSchema.attributes?.h2 ?? []),
      'id',
    ],
    h3: [
      ...(defaultSchema.attributes?.h3 ?? []),
      'id',
    ],
    h4: [
      ...(defaultSchema.attributes?.h4 ?? []),
      'id',
    ],
    h5: [
      ...(defaultSchema.attributes?.h5 ?? []),
      'id',
    ],
    h6: [
      ...(defaultSchema.attributes?.h6 ?? []),
      'id',
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-/],
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'src',
      'alt',
      'title',
      'width',
      'height',
    ],
    th: [
      ...(defaultSchema.attributes?.th ?? []),
      'colspan',
      'rowspan',
      'align',
    ],
    td: [
      ...(defaultSchema.attributes?.td ?? []),
      'colspan',
      'rowspan',
      'align',
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https', 'data'],
  },
};

type HtmlHeading = {
  id: string;
  text: string;
  depth: number;
};

export async function renderHtmlDocument(source: string): Promise<RenderResult> {
  const diagnostics: RenderDiagnostic[] = [];
  const tree = unified().use(rehypeParse, { fragment: false }).parse(source);
  const { outline, title } = collectHtmlMetadata(tree);
  const file = await unified()
    .use(rehypeParse, { fragment: false })
    .use(extractBodyContent)
    .use(removeUnsafeHtmlDocumentParts)
    .use(addMissingHeadingIds)
    .use(secureLinks)
    .use(rehypeSanitize, HTML_SANITIZE_SCHEMA)
    .use(rehypeStringify)
    .process(source);

  return {
    html: String(file),
    outline,
    title,
    links: [],
    diagnostics,
  };
}

const removeUnsafeHtmlDocumentParts = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node, index, parent) => {
      if (
        typeof index === 'number' &&
        parent &&
        'children' in parent &&
        ['script', 'style', 'link', 'meta', 'base', 'iframe', 'object', 'embed'].includes(node.tagName)
      ) {
        parent.children.splice(index, 1);
      }
    });
  };
};

const extractBodyContent = () => {
  return (tree: Root) => {
    const body = findElement(tree, 'body');
    if (body) {
      tree.children = body.children;
    }
  };
};

const addMissingHeadingIds = () => {
  return (tree: Root) => {
    const headings: HtmlHeading[] = [];

    visit(tree, 'element', (node) => {
      const depth = getHeadingDepth(node.tagName);
      if (!depth) {
        return;
      }

      const text = getTextContent(node).trim();
      if (!text) {
        return;
      }

      const existingId = typeof node.properties?.id === 'string' ? node.properties.id : null;
      if (existingId) {
        headings.push({ id: existingId, text, depth });
        return;
      }

      const id = slugHtmlHeading(text, headings);
      node.properties = {
        ...node.properties,
        id,
      };
      headings.push({ id, text, depth });
    });
  };
};

const secureLinks = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') {
        return;
      }

      const href = String(node.properties?.href ?? '');
      if (!href || href.startsWith('#')) {
        return;
      }

      node.properties = {
        ...node.properties,
        target: '_blank',
        rel: 'noreferrer noopener',
      };
    });
  };
};

function collectHtmlMetadata(tree: unknown): { outline: OutlineItem[]; title: string | null } {
  const flatHeadings: HtmlHeading[] = [];
  const knownHeadings: HtmlHeading[] = [];
  let title: string | null = null;

  visit(tree as Node, (node) => {
    if (!isElement(node)) {
      return;
    }

    if (node.tagName === 'title') {
      title ??= getTextContent(node).trim() || null;
      return;
    }

    const depth = getHeadingDepth(node.tagName);
    if (!depth) {
      return;
    }

    const text = getTextContent(node).trim();
    if (!text) {
      return;
    }

    const id = typeof node.properties?.id === 'string' ? node.properties.id : slugHtmlHeading(text, knownHeadings);
    const heading = { id, text, depth };
    flatHeadings.push(heading);
    knownHeadings.push(heading);
  });

  return {
    outline: nestOutline(flatHeadings),
    title: title ?? flatHeadings[0]?.text ?? null,
  };
}

function slugHtmlHeading(text: string, existing: HtmlHeading[]): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._:-]+/gu, '')
    .replace(/^-+|-+$/g, '') || 'heading';
  let slug = base;
  let index = 1;

  while (existing.some((heading) => heading.id === slug)) {
    slug = `${base}-${index++}`;
  }

  return slug;
}

function nestOutline(items: HtmlHeading[]): OutlineItem[] {
  const root: OutlineItem[] = [];
  const stack: OutlineItem[] = [];

  for (const item of items) {
    const outlineItem: OutlineItem = {
      ...item,
      children: [],
    };

    while (stack.length && stack[stack.length - 1].depth >= outlineItem.depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(outlineItem);
    } else {
      root.push(outlineItem);
    }

    stack.push(outlineItem);
  }

  return root;
}

function getHeadingDepth(tagName: string): number | null {
  const match = /^h([1-6])$/.exec(tagName);
  return match ? Number(match[1]) : null;
}

function getTextContent(node: Node): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => getTextContent(child as Node)).join('');
  }

  return '';
}

function findElement(node: Node, tagName: string): Element | null {
  if (isElement(node) && node.tagName === tagName) {
    return node;
  }

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findElement(child as Node, tagName);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function isElement(node: unknown): node is Element {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'element' && 'tagName' in node;
}
