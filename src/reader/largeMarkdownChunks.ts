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

type ChunkAnchor = { id: string; line: number; headingId: string | null };
type ChunkSection = Omit<MarkdownChunk, 'renderable'>;

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
  const sections = anchors.map((heading, index) => createSection({
    heading,
    nextHeading: anchors[index + 1],
    lineCount,
    lineStarts,
    size,
  }));

  const mergedSections = mergeSmallSections(sections, maxChunkBytes);

  return mergedSections.flatMap((section) => splitSection(section, lineStarts, size, maxChunkBytes));
}

function createChunkAnchors(headings: Array<{ id: string; line: number }>): ChunkAnchor[] {
  if (headings.length === 0) {
    return [{ id: 'document', line: 1, headingId: null }];
  }

  if (headings[0].line > 1) {
    return [{ id: 'document', line: 1, headingId: null }, ...headings.map((heading) => ({ ...heading, headingId: heading.id }))];
  }

  return headings.map((heading) => ({ ...heading, headingId: heading.id }));
}

function createSection({
  heading,
  nextHeading,
  lineCount,
  lineStarts,
  size,
}: {
  heading: ChunkAnchor;
  nextHeading: ChunkAnchor | undefined;
  lineCount: number;
  lineStarts: number[];
  size: number;
}): ChunkSection {
  const startLine = heading.line;
  const endLine = nextHeading ? nextHeading.line - 1 : lineCount;
  const startByte = lineStarts[startLine - 1] ?? 0;
  const endByte = getLineEndByte(lineStarts, size, endLine);

  return {
    id: heading.id,
    startLine,
    endLine,
    startByte,
    endByte,
    headingId: heading.headingId,
  };
}

function mergeSmallSections(sections: ChunkSection[], maxChunkBytes: number): ChunkSection[] {
  const merged: ChunkSection[] = [];
  let current: ChunkSection | null = null;

  for (const section of sections) {
    if (!current) {
      current = { ...section };
      continue;
    }

    const nextSize = section.endByte - current.startByte;
    if (nextSize <= maxChunkBytes) {
      current = {
        ...current,
        endLine: section.endLine,
        endByte: section.endByte,
      };
      continue;
    }

    merged.push(current);
    current = { ...section };
  }

  if (current) {
    merged.push(current);
  }

  return merged;
}

function splitSection(section: ChunkSection, lineStarts: number[], size: number, maxChunkBytes: number): MarkdownChunk[] {
  if (section.endByte - section.startByte <= maxChunkBytes) {
    return [createChunk({ ...section, maxChunkBytes })];
  }

  const chunks: MarkdownChunk[] = [];
  let partStartLine = section.startLine;
  let partStartByte = section.startByte;
  let part = 1;

  for (let line = section.startLine; line <= section.endLine; line += 1) {
    const currentLineEndByte = getLineEndByte(lineStarts, size, line);
    if (currentLineEndByte - partStartByte >= maxChunkBytes || line === section.endLine) {
      chunks.push(createChunk({
        id: `${section.id}-${part}`,
        startLine: partStartLine,
        endLine: line,
        startByte: partStartByte,
        endByte: currentLineEndByte,
        headingId: section.headingId,
        maxChunkBytes,
      }));
      part += 1;
      partStartLine = line + 1;
      partStartByte = currentLineEndByte;
    }
  }

  return chunks;
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
