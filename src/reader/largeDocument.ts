import GithubSlugger from 'github-slugger';

import type { OutlineItem } from '../shared/types';

export const LARGE_MARKDOWN_BYTES = 2 * 1024 * 1024;
export const EXTREME_MARKDOWN_BYTES = 20 * 1024 * 1024;
export const LARGE_SAMPLE_BYTES = 64 * 1024;
export const LONG_LINE_SAMPLE_CHARS = 64 * 1024;
export const LARGE_LINE_WINDOW_SIZE = 240;

export type LargeDocumentKind = 'normal' | 'large' | 'extreme';

export type LargeOutlineItem = OutlineItem & {
  line: number;
  children: LargeOutlineItem[];
};

export function classifyMarkdownDocument({
  size,
  sample,
}: {
  size: number;
  sample: string;
}): { kind: LargeDocumentKind; reason: string | null } {
  if (size >= EXTREME_MARKDOWN_BYTES) {
    return { kind: 'extreme', reason: '文件超过 20.0 MB，已进入超大文件安全模式。' };
  }

  if (size >= LARGE_MARKDOWN_BYTES) {
    return { kind: 'large', reason: '文件超过 2.0 MB，已进入大文件安全模式。' };
  }

  if (sample.split('\n').some((line) => line.length >= LONG_LINE_SAMPLE_CHARS)) {
    return { kind: 'large', reason: '文件包含超长单行，已进入大文件安全模式。' };
  }

  return { kind: 'normal', reason: null };
}

export function createLineWindow({
  lineCount,
  anchorLine,
  windowSize = LARGE_LINE_WINDOW_SIZE,
}: {
  lineCount: number;
  anchorLine: number;
  windowSize?: number;
}): { startLine: number; endLine: number } {
  const safeLineCount = Math.max(1, lineCount);
  const safeWindowSize = Math.max(1, windowSize);
  const clampedAnchor = Math.min(Math.max(1, anchorLine), safeLineCount);
  const startLine = Math.min(
    Math.max(1, clampedAnchor - Math.floor(safeWindowSize / 2)),
    Math.max(1, safeLineCount - safeWindowSize + 1),
  );
  const endLine = Math.min(safeLineCount, startLine + safeWindowSize - 1);

  return { startLine, endLine };
}

export function formatDocumentBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function scanMarkdownOutlineLightweight(source: string): LargeOutlineItem[] {
  const slugger = new GithubSlugger();
  const flat: LargeOutlineItem[] = [];
  let inFence = false;

  source.split('\n').forEach((line, index) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }

    if (inFence) {
      return;
    }

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) {
      return;
    }

    const text = match[2].trim();
    flat.push({
      id: slugger.slug(text),
      text,
      depth: match[1].length,
      line: index + 1,
      children: [],
    });
  });

  return nestOutline(flat);
}

function nestOutline(items: LargeOutlineItem[]): LargeOutlineItem[] {
  const root: LargeOutlineItem[] = [];
  const stack: LargeOutlineItem[] = [];

  for (const item of items) {
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
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
