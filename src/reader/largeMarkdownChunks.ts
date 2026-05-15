import type { LargeOutlineItem } from './largeDocument';

export type MarkdownChunk = {
  id: string;
  startLine: number;
  endLine: number;
  startByte: number;
  endByte: number;
  headingId: string | null;
  renderable: boolean;
};

export function createMarkdownChunks({
  lineCount,
  lineStarts,
  outline,
  size,
  maxChunkBytes = 512 * 1024,
}: {
  lineCount: number;
  lineStarts: number[];
  outline: LargeOutlineItem[];
  size: number;
  maxChunkBytes?: number;
}): MarkdownChunk[] {
  const headings = flattenHeadings(outline);
  const anchors = createChunkAnchors(headings);
  const chunks: MarkdownChunk[] = [];

  anchors.forEach((heading, index) => {
    const startLine = heading.line;
    const nextHeading = anchors[index + 1];
    const endLine = nextHeading ? nextHeading.line - 1 : lineCount;
    const startByte = lineStarts[startLine - 1] ?? 0;
    const endByte = getLineEndByte(lineStarts, size, endLine);

    if (endByte - startByte <= maxChunkBytes) {
      chunks.push(createChunk({ id: heading.id, startLine, endLine, startByte, endByte, headingId: heading.headingId, maxChunkBytes }));
      return;
    }

    let partStartLine = startLine;
    let partStartByte = startByte;
    let part = 1;

    for (let line = startLine; line <= endLine; line += 1) {
      const currentLineEndByte = getLineEndByte(lineStarts, size, line);
      if (currentLineEndByte - partStartByte >= maxChunkBytes || line === endLine) {
        chunks.push(createChunk({
          id: `${heading.id}-${part}`,
          startLine: partStartLine,
          endLine: line,
          startByte: partStartByte,
          endByte: currentLineEndByte,
          headingId: heading.headingId,
          maxChunkBytes,
        }));
        part += 1;
        partStartLine = line + 1;
        partStartByte = currentLineEndByte;
      }
    }
  });

  return chunks;
}

function createChunkAnchors(headings: Array<{ id: string; line: number }>): Array<{ id: string; line: number; headingId: string | null }> {
  if (headings.length === 0) {
    return [{ id: 'document', line: 1, headingId: null }];
  }

  if (headings[0].line > 1) {
    return [{ id: 'document', line: 1, headingId: null }, ...headings.map((heading) => ({ ...heading, headingId: heading.id }))];
  }

  return headings.map((heading) => ({ ...heading, headingId: heading.id }));
}

function createChunk({
  id,
  startLine,
  endLine,
  startByte,
  endByte,
  headingId,
  maxChunkBytes,
}: Omit<MarkdownChunk, 'renderable'> & { maxChunkBytes: number }): MarkdownChunk {
  return {
    id,
    startLine,
    endLine,
    startByte,
    endByte,
    headingId,
    renderable: endByte - startByte <= maxChunkBytes,
  };
}

function getLineEndByte(lineStarts: number[], size: number, line: number): number {
  return lineStarts[line] ?? size;
}

function flattenHeadings(items: LargeOutlineItem[]): Array<{ id: string; line: number }> {
  return items.flatMap((item) => [{ id: item.id, line: item.line }, ...flattenHeadings(item.children)]);
}
