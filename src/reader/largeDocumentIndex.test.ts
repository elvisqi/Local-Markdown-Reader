import { buildLargeDocumentIndex, readLargeDocumentLines, searchLargeDocument } from './largeDocumentIndex';

describe('largeDocumentIndex', () => {
  it('indexes line byte offsets without reading the full source string into React state', async () => {
    const file = new File(['# 标题\n第一行\n第二行\n'], 'big.md', { type: 'text/markdown' });

    const index = await buildLargeDocumentIndex(file, { chunkBytes: 8 });

    expect(index).toMatchObject({
      name: 'big.md',
      size: file.size,
      lineCount: 4,
      title: '标题',
      warnings: [],
    });
    expect(index.outline[0]).toMatchObject({ text: '标题', depth: 1, line: 1 });
  });

  it('reads selected lines by byte range', async () => {
    const file = new File(['# Title\nline 1\nline 2\nline 3'], 'big.md', { type: 'text/markdown' });
    const index = await buildLargeDocumentIndex(file, { chunkBytes: 10 });

    await expect(readLargeDocumentLines(file, index, { startLine: 2, endLine: 3 })).resolves.toEqual({
      startLine: 2,
      endLine: 3,
      text: 'line 1\nline 2\n',
    });
  });

  it('searches large documents and returns bounded snippets', async () => {
    const file = new File(['alpha\nbeta target\n中文 target 命中\nomega'], 'big.md', { type: 'text/markdown' });
    const index = await buildLargeDocumentIndex(file, { chunkBytes: 9 });

    await expect(searchLargeDocument(file, index, { query: 'target', limit: 5 })).resolves.toEqual([
      { line: 2, column: 6, text: 'beta target' },
      { line: 3, column: 4, text: '中文 target 命中' },
    ]);
  });

  it('marks very long lines without decoding the entire line during indexing', async () => {
    const file = new File([`${'# A'.padEnd(70000, 'x')}\nshort`], 'big.md');

    const index = await buildLargeDocumentIndex(file, { chunkBytes: 4096, maxHeadingLineBytes: 2048 });

    expect(index.warnings).toContain('检测到超长单行，部分标题扫描会跳过这些行。');
    expect(index.lineCount).toBe(2);
  });
});
