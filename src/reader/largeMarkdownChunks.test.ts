import { createMarkdownChunks } from './largeMarkdownChunks';

describe('largeMarkdownChunks', () => {
  it('creates heading-bounded chunks capped by byte size', () => {
    expect(
      createMarkdownChunks({
        lineCount: 8,
        lineStarts: [0, 4, 8, 12, 20, 28, 36, 44],
        size: 52,
        outline: [
          { id: 'a', text: 'A', depth: 1, line: 1, children: [] },
          { id: 'b', text: 'B', depth: 1, line: 5, children: [] },
        ],
        maxChunkBytes: 40,
      }),
    ).toEqual([
      { id: 'a', startLine: 1, endLine: 4, startByte: 0, endByte: 20, headingId: 'a', renderable: true },
      { id: 'b', startLine: 5, endLine: 8, startByte: 20, endByte: 52, headingId: 'b', renderable: true },
    ]);
  });

  it('splits oversized heading sections into bounded chunks', () => {
    expect(
      createMarkdownChunks({
        lineCount: 5,
        lineStarts: [0, 10, 20, 30, 40],
        size: 50,
        outline: [{ id: 'a', text: 'A', depth: 1, line: 1, children: [] }],
        maxChunkBytes: 20,
      }),
    ).toEqual([
      { id: 'a-1', startLine: 1, endLine: 2, startByte: 0, endByte: 20, headingId: 'a', renderable: true },
      { id: 'a-2', startLine: 3, endLine: 4, startByte: 20, endByte: 40, headingId: 'a', renderable: true },
      { id: 'a-3', startLine: 5, endLine: 5, startByte: 40, endByte: 50, headingId: 'a', renderable: true },
    ]);
  });

  it('includes content before the first heading as a document chunk', () => {
    expect(
      createMarkdownChunks({
        lineCount: 5,
        lineStarts: [0, 8, 16, 28, 40],
        size: 48,
        outline: [{ id: 'intro', text: 'Intro', depth: 1, line: 3, children: [] }],
        maxChunkBytes: 40,
      }),
    ).toEqual([
      { id: 'document', startLine: 1, endLine: 2, startByte: 0, endByte: 16, headingId: null, renderable: true },
      { id: 'intro', startLine: 3, endLine: 5, startByte: 16, endByte: 48, headingId: 'intro', renderable: true },
    ]);
  });

  it('uses file size as the final byte offset and marks oversized single-line chunks as non-renderable', () => {
    expect(
      createMarkdownChunks({
        lineCount: 1,
        lineStarts: [0],
        size: 2 * 1024 * 1024,
        outline: [],
        maxChunkBytes: 512 * 1024,
      }),
    ).toEqual([
      {
        id: 'document-1',
        startLine: 1,
        endLine: 1,
        startByte: 0,
        endByte: 2 * 1024 * 1024,
        headingId: null,
        renderable: false,
      },
    ]);
  });
});
