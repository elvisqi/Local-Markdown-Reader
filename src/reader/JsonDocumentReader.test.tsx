import { render, screen, waitFor, within } from '@testing-library/react';

import { JsonDocumentReader } from './JsonDocumentReader';

const EDITOR_LOAD_TIMEOUT = { timeout: 5000 };

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
    expect(await screen.findByLabelText('JSON 编辑器', {}, EDITOR_LOAD_TIMEOUT)).toBeInTheDocument();
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
    expect(await screen.findByLabelText('JSON 编辑器', {}, EDITOR_LOAD_TIMEOUT)).toBeInTheDocument();
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

    const editor = await screen.findByLabelText('JSON 编辑器', {}, EDITOR_LOAD_TIMEOUT);
    expect(within(editor).getByText('tree')).toBeInTheDocument();
    expect(within(editor).getByText('table')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '高级视图' })).not.toBeInTheDocument();
  });

  it('renders JSONL as a parsed JSON array', async () => {
    render(
      <JsonDocumentReader
        source={'{"id":1,"event":"open"}\n{"id":2,"event":"close"}'}
        fileName="events.jsonl"
        theme="light"
        format="jsonl"
      />,
    );

    expect(screen.getByRole('heading', { name: 'events.jsonl' })).toBeInTheDocument();
    expect(screen.getByText('Array')).toBeInTheDocument();
    expect(within(screen.getByText('顶层').closest('div')!).getByText('2')).toBeInTheDocument();
    expect(await screen.findByLabelText('JSON 编辑器', {}, EDITOR_LOAD_TIMEOUT)).toBeInTheDocument();
  });
});
