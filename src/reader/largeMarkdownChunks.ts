import type { LargeOutlineItem } from './largeDocument';

export type MarkdownChunk = {
  id: string;
  startLine: number;
  endLine: number;
  startByte: number;
  endByte: number;
  headingId: string | null;
};

export function createMarkdownChunks({
  lineCount,
  lineStarts,
  outline,
  maxChunkBytes = 512 * 1024,
}: {
  lineCount: number;
  lineStarts: number[];
  outline: LargeOutlineItem[];
  maxChunkBytes?: number;
}): MarkdownChunk[] {
  const headings = flattenHeadings(outline);
  const anchors = headings.length > 0 ? headings : [{ id: 'document', line: 1 }];
  const chunks: MarkdownChunk[] = [];

  anchors.forEach((heading, index) => {
    const startLine = heading.line;
    const nextHeading = anchors[index + 1];
    const endLine = nextHeading ? nextHeading.line - 1 : lineCount;
    const startByte = lineStarts[startLine - 1] ?? 0;
    const endByte = lineStarts[endLine] ?? lineStarts[lineStarts.length - 1] ?? startByte;

    if (endByte - startByte <= maxChunkBytes) {
      chunks.push({ id: heading.id, startLine, endLine, startByte, endByte, headingId: heading.id });
      return;
    }

    let partStartLine = startLine;
    let partStartByte = startByte;
    let part = 1;

    for (let line = startLine; line <= endLine; line += 1) {
      const lineEndByte = lineStarts[line] ?? endByte;
      if (lineEndByte - partStartByte >= maxChunkBytes || line === endLine) {
        chunks.push({
          id: `${heading.id}-${part}`,
          startLine: partStartLine,
          endLine: line,
          startByte: partStartByte,
          endByte: lineEndByte,
          headingId: heading.id,
        });
        part += 1;
        partStartLine = line + 1;
        partStartByte = lineEndByte;
      }
    }
  });

  return chunks;
}

function flattenHeadings(items: LargeOutlineItem[]): Array<{ id: string; line: number }> {
  return items.flatMap((item) => [{ id: item.id, line: item.line }, ...flattenHeadings(item.children)]);
}
