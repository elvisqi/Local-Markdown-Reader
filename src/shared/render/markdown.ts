import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
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
import type { Element, Root as HastRoot } from 'hast';
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
      code: [
        ...(defaultSchema.attributes?.code ?? []),
        ['className', /^language-/],
      ],
      input: [
        ...(defaultSchema.attributes?.input ?? []),
        ['type', 'checkbox'],
        'checked',
        'disabled',
      ],
      div: [
        ...(defaultSchema.attributes?.div ?? []),
        ['className', 'table-fullscreen', 'table-fullscreen__table', 'table-fullscreen__actions'],
      ],
      span: [
        ...(defaultSchema.attributes?.span ?? []),
        ['className', 'table-fullscreen__row-count'],
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

  if (!options.chunkMode) {
    processor.use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
    });
  }

  const file = await processor
    .use(wrapTablesForFullscreen)
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
