import GithubSlugger from 'github-slugger';

import type { LargeOutlineItem } from './largeDocument';

export type LargeDocumentIndex = {
  name: string;
  size: number;
  lineCount: number;
  lineStarts: number[];
  outline: LargeOutlineItem[];
  title: string | null;
  warnings: string[];
};

export type LargeDocumentLineRange = {
  startLine: number;
  endLine: number;
  text: string;
};

export type LargeDocumentSearchResult = {
  line: number;
  column: number;
  text: string;
};

type HeadingLine = {
  line: number;
  text: string;
  depth: number;
};

type SearchLineChunk = {
  startLine: number;
  lines: string[];
};

export async function buildLargeDocumentIndex(
  file: File,
  options: { chunkBytes?: number; maxHeadingLineBytes?: number } = {},
): Promise<LargeDocumentIndex> {
  const chunkBytes = options.chunkBytes ?? 256 * 1024;
  const maxHeadingLineBytes = options.maxHeadingLineBytes ?? 16 * 1024;
  const lineStarts = [0];
  const headingLines: HeadingLine[] = [];
  const warnings = new Set<string>();
  let currentLineBytes: number[] = [];
  let currentLineNumber = 1;
  let inFence = false;

  for (let start = 0; start < file.size; start += chunkBytes) {
    const chunk = new Uint8Array(await file.slice(start, Math.min(file.size, start + chunkBytes)).arrayBuffer());

    for (let index = 0; index < chunk.length; index += 1) {
      const byte = chunk[index];
      const absoluteOffset = start + index;

      if (byte === 10) {
        collectHeadingLine({
          bytes: currentLineBytes,
          lineNumber: currentLineNumber,
          maxHeadingLineBytes,
          headingLines,
          warnings,
          getFenceState: () => inFence,
          setFenceState: (value) => {
            inFence = value;
          },
        });
        currentLineBytes = [];
        currentLineNumber += 1;
        lineStarts.push(absoluteOffset + 1);
        continue;
      }

      if (currentLineBytes.length <= maxHeadingLineBytes) {
        currentLineBytes.push(byte);
      } else {
        warnings.add('检测到超长单行，部分标题扫描会跳过这些行。');
      }
    }
  }

  if (currentLineBytes.length > 0 || file.size === 0) {
    collectHeadingLine({
      bytes: currentLineBytes,
      lineNumber: currentLineNumber,
      maxHeadingLineBytes,
      headingLines,
      warnings,
      getFenceState: () => inFence,
      setFenceState: (value) => {
        inFence = value;
      },
    });
  }

  const outline = createOutlineFromHeadingLines(headingLines);

  return {
    name: file.name,
    size: file.size,
    lineCount: file.size === 0 ? 1 : lineStarts.length,
    lineStarts,
    outline,
    title: outline[0]?.text ?? null,
    warnings: [...warnings],
  };
}

export async function readLargeDocumentLines(
  file: Blob,
  index: LargeDocumentIndex,
  range: { startLine: number; endLine: number },
): Promise<LargeDocumentLineRange> {
  const startLine = Math.min(Math.max(1, range.startLine), index.lineCount);
  const endLine = Math.min(Math.max(startLine, range.endLine), index.lineCount);
  const startByte = index.lineStarts[startLine - 1] ?? 0;
  const endByte = index.lineStarts[endLine] ?? file.size;

  return {
    startLine,
    endLine,
    text: await file.slice(startByte, endByte).text(),
  };
}

export async function searchLargeDocument(
  file: Blob,
  index: LargeDocumentIndex,
  options: { query: string; limit?: number },
): Promise<LargeDocumentSearchResult[]> {
  const query = options.query.trim();
  const limit = options.limit ?? 200;
  if (!query) {
    return [];
  }

  const results: LargeDocumentSearchResult[] = [];

  for await (const chunk of iterateSearchLineChunks(file, index, 512 * 1024)) {
    for (const [offset, text] of chunk.lines.entries()) {
      if (results.length >= limit) {
        return results;
      }

      const column = text.indexOf(query);
      if (column >= 0) {
        results.push({ line: chunk.startLine + offset, column: column + 1, text: createSnippet(text) });
      }
    }
  }

  return results;
}

async function* iterateSearchLineChunks(
  file: Blob,
  index: LargeDocumentIndex,
  targetChunkBytes: number,
): AsyncGenerator<SearchLineChunk> {
  let startLine = 1;

  while (startLine <= index.lineCount) {
    let endLine = startLine;
    while (
      endLine < index.lineCount &&
      (index.lineStarts[endLine] ?? file.size) - (index.lineStarts[startLine - 1] ?? 0) < targetChunkBytes
    ) {
      endLine += 1;
    }

    const range = await readLargeDocumentLines(file, index, { startLine, endLine });
    yield { startLine: range.startLine, lines: range.text.replace(/\n$/, '').split('\n') };
    startLine = endLine + 1;
  }
}

function collectHeadingLine({
  bytes,
  lineNumber,
  maxHeadingLineBytes,
  headingLines,
  warnings,
  getFenceState,
  setFenceState,
}: {
  bytes: number[];
  lineNumber: number;
  maxHeadingLineBytes: number;
  headingLines: HeadingLine[];
  warnings: Set<string>;
  getFenceState: () => boolean;
  setFenceState: (value: boolean) => void;
}) {
  if (bytes.length > maxHeadingLineBytes) {
    warnings.add('检测到超长单行，部分标题扫描会跳过这些行。');
    return;
  }

  const line = new TextDecoder().decode(new Uint8Array(bytes));
  const trimmed = line.trim();
  if (/^(```|~~~)/.test(trimmed)) {
    setFenceState(!getFenceState());
    return;
  }

  if (getFenceState()) {
    return;
  }

  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!match) {
    return;
  }

  headingLines.push({
    line: lineNumber,
    depth: match[1].length,
    text: match[2].trim(),
  });
}

function createOutlineFromHeadingLines(headings: HeadingLine[]): LargeOutlineItem[] {
  const slugger = new GithubSlugger();
  const root: LargeOutlineItem[] = [];
  const stack: LargeOutlineItem[] = [];

  for (const heading of headings) {
    const item: LargeOutlineItem = {
      id: slugger.slug(heading.text),
      text: heading.text,
      depth: heading.depth,
      line: heading.line,
      children: [],
    };

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

function createSnippet(text: string): string {
  return text.length <= 160 ? text : `${text.slice(0, 157)}...`;
}
