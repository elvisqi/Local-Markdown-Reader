import { extractMarkdownTablePreview } from './largeMarkdownTable';

describe('largeMarkdownTable', () => {
  it('extracts a preview from a markdown table chunk with very wide cells', () => {
    const preview = extractMarkdownTablePreview([
      '## 10. 业务数据事实',
      '',
      '| 序号 | 数据文件/模型 | 行号 | values 原始值 |',
      '| --- | --- | --- | --- |',
      `| D1 | app_model_employ | 第1行 | ${JSON.stringify({ leader: 'WangQianQian', payload: 'x'.repeat(500) })} |`,
      `| D2 | app_model_employ | 第2行 | ${JSON.stringify({ leader: 'LiLei', payload: 'y'.repeat(500) })} |`,
    ].join('\n'), { maxRows: 1 });

    expect(preview).toEqual({
      headers: ['序号', '数据文件/模型', '行号', 'values 原始值'],
      rows: [
        ['D1', 'app_model_employ', '第1行', expect.stringContaining('"leader":"WangQianQian"')],
      ],
      totalRows: 2,
      truncated: true,
    });
  });

  it('returns null for non-table chunks', () => {
    expect(extractMarkdownTablePreview('# Title\n\nplain paragraph')).toBeNull();
  });

  it('stops at the first non-table row instead of merging later tables', () => {
    const preview = extractMarkdownTablePreview([
      '| A | B |',
      '| --- | --- |',
      '| first | row |',
      '',
      'paragraph with | a pipe',
      '| C | D |',
      '| --- | --- |',
      '| second | table |',
    ].join('\n'));

    expect(preview?.headers).toEqual(['A', 'B']);
    expect(preview?.rows).toEqual([['first', 'row']]);
    expect(preview?.totalRows).toBe(1);
  });

  it('supports GFM tables without outer pipes', () => {
    expect(extractMarkdownTablePreview('A | B\n--- | ---\nfirst | row')).toEqual({
      headers: ['A', 'B'],
      rows: [['first', 'row']],
      totalRows: 1,
      truncated: false,
    });
  });

  it('normalizes rows with missing and extra cells to the header width', () => {
    const preview = extractMarkdownTablePreview('| A | B |\n| --- | --- |\n| only-a |\n| x | y | z |');

    expect(preview?.rows).toEqual([
      ['only-a', ''],
      ['x', 'y'],
    ]);
  });

  it('unescapes escaped pipes inside cells', () => {
    const preview = extractMarkdownTablePreview('| A | B |\n| --- | --- |\n| escaped\\|pipe | row |');

    expect(preview?.rows[0]).toEqual(['escaped|pipe', 'row']);
  });
});
