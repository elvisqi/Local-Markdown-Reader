import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { LargeDocumentIndex } from '../largeDocumentIndex';
import { LargeDocumentReader } from './LargeDocumentReader';

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
  it('loads and pages line windows through the worker client', async () => {
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 240, text: 'a\nb\nc\n' })),
      search: vi.fn(),
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

    await waitFor(() => expect(screen.getByText('a')).toBeInTheDocument());
    expect(screen.getByText('大文件安全模式')).toBeInTheDocument();
    expect(client.readLines).toHaveBeenCalledWith(expect.any(File), expect.any(Object), {
      startLine: 1,
      endLine: 240,
    });
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
});
