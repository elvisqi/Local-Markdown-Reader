import { render, screen, waitFor, within } from '@testing-library/react';

import { JsonDocumentReader } from './JsonDocumentReader';

describe('JsonDocumentReader', () => {
  it('renders parsed JSON with summary and the vanilla JSON editor', async () => {
    render(
      <JsonDocumentReader
        source={'{"users":[{"id":1,"name":"Ada"}],"meta":{"total":1}}'}
        fileName="data.json"
        theme="light"
      />,
    );

    expect(screen.getByRole('heading', { name: 'data.json' })).toBeInTheDocument();
    expect(screen.getByText('Object')).toBeInTheDocument();
    expect(screen.getByText('节点 7')).toBeInTheDocument();
    expect(await screen.findByLabelText('JSON 编辑器')).toBeInTheDocument();
    expect(screen.queryByLabelText('JSON 阅读模式')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('搜索 JSON')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('JSON 结构树')).not.toBeInTheDocument();
  });

  it('renders primitive JSON roots', () => {
    render(
      <JsonDocumentReader
        source='"hello"'
        fileName="value.json"
        theme="light"
      />,
    );

    expect(screen.getByRole('heading', { name: 'value.json' })).toBeInTheDocument();
    expect(screen.getByText('String')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON 编辑器')).toBeInTheDocument();
  });

  it('shows parse errors and still opens the JSON editor in text mode', async () => {
    render(
      <JsonDocumentReader
        source={'{"name":"Ada",}'}
        fileName="broken.json"
        theme="light"
      />,
    );

    expect(screen.getByText(/JSON 解析失败/)).toBeInTheDocument();
    expect(await screen.findByLabelText('JSON 编辑器')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '尝试修复并预览' })).not.toBeInTheDocument();
  });

  it('uses one editor surface with built-in mode controls', async () => {
    render(
      <JsonDocumentReader
        source={'[{"id":1,"name":"Ada"}]'}
        fileName="rows.json"
        theme="light"
      />,
    );

    const editor = await screen.findByLabelText('JSON 编辑器');
    expect(within(editor).getByText('tree')).toBeInTheDocument();
    expect(within(editor).getByText('table')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '高级视图' })).not.toBeInTheDocument();
  });
});
