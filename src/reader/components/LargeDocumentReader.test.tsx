import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { LargeDocumentIndex } from '../largeDocumentIndex';
import { LargeDocumentReader } from './LargeDocumentReader';

vi.mock('./VirtualLargeDocumentReader', () => ({
  VirtualLargeDocumentReader: () => <div data-testid="virtual-large-document-reader">virtual rows</div>,
}));

vi.mock('./ChunkedMarkdownDocument', () => ({
  ChunkedMarkdownDocument: () => <div data-testid="chunked-markdown-document">chunk preview</div>,
}));

function createIndex(): LargeDocumentIndex {
  return {
    name: 'big.md',
    size: 1024,
    lineCount: 500,
    lineStarts: [0],
    title: 'Big',
    outline: [],
    warnings: [],
  };
}

describe('LargeDocumentReader', () => {
  it('renders the large document shell and virtualized source', () => {
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 240, text: 'a\nb\nc\n' })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <LargeDocumentReader
        file={new File(['a\nb\nc'], 'big.md')}
        index={{ ...createIndex(), size: 60 * 1024 * 1024 }}
        reason="文件超过 2.0 MB，已进入大文件安全模式。"
        client={client}
        anchorLine={1}
        onNavigateLine={vi.fn()}
      />,
    );

    expect(screen.getByText('大文件安全模式')).toBeInTheDocument();
    expect(screen.getByTestId('virtual-large-document-reader')).toBeInTheDocument();
  });

  it('focuses custom search when Ctrl+F is pressed in large mode', async () => {
    const user = userEvent.setup();
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 3, text: 'a\nb\nc\n' })),
      search: vi.fn(async () => []),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <LargeDocumentReader
        file={new File(['a\nb\nc'], 'big.md')}
        index={createIndex()}
        reason="文件超过 2.0 MB，已进入大文件安全模式。"
        client={client}
        anchorLine={1}
        onNavigateLine={vi.fn()}
      />,
    );

    await user.keyboard('{Control>}f{/Control}');

    expect(screen.getByRole('searchbox', { name: '搜索当前大文件' })).toHaveFocus();
  });

  it('jumps to search results by line number', async () => {
    const user = userEvent.setup();
    const onNavigateLine = vi.fn();
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 3, text: 'a\nb\nc\n' })),
      search: vi.fn(async () => [{ line: 42, column: 3, text: 'target line' }]),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <LargeDocumentReader
        file={new File(['target'], 'big.md')}
        index={createIndex()}
        reason="文件超过 2.0 MB，已进入大文件安全模式。"
        client={client}
        anchorLine={1}
        onNavigateLine={onNavigateLine}
      />,
    );

    await user.type(screen.getByRole('searchbox', { name: '搜索当前大文件' }), 'target');
    await user.click(screen.getByRole('button', { name: '搜索' }));
    await user.click(await screen.findByRole('button', { name: /第 42 行/ }));

    expect(onNavigateLine).toHaveBeenCalledWith(42);
  });

  it('defaults to chunked preview for large documents and raw view for extreme documents', () => {
    const client = {
      readLines: vi.fn(),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };
    const { rerender } = render(
      <LargeDocumentReader
        file={new File([''], 'big.md')}
        index={{ ...createIndex(), size: 3 * 1024 * 1024 }}
        reason="大文件"
        client={client}
        anchorLine={1}
        onNavigateLine={vi.fn()}
        mermaidEnabled={false}
      />,
    );

    expect(screen.getByTestId('chunked-markdown-document')).toBeInTheDocument();

    rerender(
      <LargeDocumentReader
        file={new File([''], 'huge.md')}
        index={{ ...createIndex(), size: 21 * 1024 * 1024 }}
        reason="超大文件"
        client={client}
        anchorLine={1}
        onNavigateLine={vi.fn()}
        mermaidEnabled={false}
      />,
    );

    expect(screen.getByTestId('virtual-large-document-reader')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '分块预览' })).toBeDisabled();
  });
});
