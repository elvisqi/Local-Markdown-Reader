import {
  EXTREME_MARKDOWN_BYTES,
  LARGE_MARKDOWN_BYTES,
  classifyMarkdownDocument,
  createLineWindow,
  formatDocumentBytes,
  scanMarkdownOutlineLightweight,
} from './largeDocument';

describe('largeDocument', () => {
  it('classifies documents before full markdown rendering', () => {
    expect(classifyMarkdownDocument({ size: 1024, sample: '# Small' })).toEqual({
      kind: 'normal',
      reason: null,
    });

    expect(classifyMarkdownDocument({ size: LARGE_MARKDOWN_BYTES, sample: '# Large' })).toEqual({
      kind: 'large',
      reason: '文件超过 2.0 MB，已进入大文件安全模式。',
    });

    expect(classifyMarkdownDocument({ size: EXTREME_MARKDOWN_BYTES, sample: '# Extreme' })).toEqual({
      kind: 'extreme',
      reason: '文件超过 50.0 MB，已进入超大文件安全模式。',
    });

    expect(classifyMarkdownDocument({ size: 1000, sample: `${'x'.repeat(70000)}\n` }).kind).toBe('large');
  });

  it('creates clamped line windows', () => {
    expect(createLineWindow({ lineCount: 1000, anchorLine: 1, windowSize: 200 })).toEqual({
      startLine: 1,
      endLine: 200,
    });
    expect(createLineWindow({ lineCount: 1000, anchorLine: 950, windowSize: 200 })).toEqual({
      startLine: 801,
      endLine: 1000,
    });
  });

  it('formats byte sizes for reader messages', () => {
    expect(formatDocumentBytes(1024)).toBe('1.0 KB');
    expect(formatDocumentBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('scans markdown headings without parsing full markdown AST', () => {
    expect(scanMarkdownOutlineLightweight('# A\ntext\n## B\n```md\n# ignored\n```\n### C')).toEqual([
      {
        id: 'a',
        text: 'A',
        depth: 1,
        line: 1,
        children: [
          {
            id: 'b',
            text: 'B',
            depth: 2,
            line: 3,
            children: [{ id: 'c', text: 'C', depth: 3, line: 7, children: [] }],
          },
        ],
      },
    ]);
  });
});
