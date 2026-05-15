import { createMarkdownChunks } from './largeMarkdownChunks';

describe('largeMarkdownChunks', () => {
  it('creates heading-bounded chunks capped by byte size', () => {
    expect(
      createMarkdownChunks({
        lineCount: 8,
        lineStarts: [0, 4, 8, 12, 20, 28, 36, 44],
        outline: [
          { id: 'a', text: 'A', depth: 1, line: 1, children: [] },
          { id: 'b', text: 'B', depth: 1, line: 5, children: [] },
        ],
        maxChunkBytes: 24,
      }),
    ).toEqual([
      { id: 'a', startLine: 1, endLine: 4, startByte: 0, endByte: 20, headingId: 'a' },
      { id: 'b', startLine: 5, endLine: 8, startByte: 20, endByte: 44, headingId: 'b' },
    ]);
  });

  it('splits oversized heading sections into bounded chunks', () => {
    expect(
      createMarkdownChunks({
        lineCount: 5,
        lineStarts: [0, 10, 20, 30, 40],
        outline: [{ id: 'a', text: 'A', depth: 1, line: 1, children: [] }],
        maxChunkBytes: 20,
      }),
    ).toEqual([
      { id: 'a-1', startLine: 1, endLine: 2, startByte: 0, endByte: 20, headingId: 'a' },
      { id: 'a-2', startLine: 3, endLine: 4, startByte: 20, endByte: 40, headingId: 'a' },
      { id: 'a-3', startLine: 5, endLine: 5, startByte: 40, endByte: 40, headingId: 'a' },
    ]);
  });
});
