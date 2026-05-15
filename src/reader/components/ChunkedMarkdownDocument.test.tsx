import { render, screen, waitFor } from '@testing-library/react';

import type { LargeDocumentIndex } from '../largeDocumentIndex';
import type { MarkdownChunk } from '../largeMarkdownChunks';
import { ChunkedMarkdownDocument } from './ChunkedMarkdownDocument';
import * as markdownRenderer from '../../shared/render/markdown';

function createIndex(): LargeDocumentIndex {
  return {
    name: 'big.md',
    size: 2 * 1024 * 1024,
    lineCount: 20,
    lineStarts: [0],
    title: 'Big',
    outline: [],
    warnings: [],
  };
}

function createChunks(): MarkdownChunk[] {
  return [
    { id: 'a', startLine: 1, endLine: 4, startByte: 0, endByte: 20, headingId: 'a', renderable: true },
    { id: 'b', startLine: 5, endLine: 8, startByte: 20, endByte: 44, headingId: 'b', renderable: true },
  ];
}

describe('ChunkedMarkdownDocument', () => {
  it('renders only requested markdown chunks', async () => {
    const renderMarkdown = vi.spyOn(markdownRenderer, 'renderMarkdown').mockResolvedValue({
      html: '<h1 id="chunk">Chunk</h1>',
      outline: [],
      title: null,
      links: [],
      diagnostics: [],
    });
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 4, text: '# Chunk\nbody' })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <ChunkedMarkdownDocument
        file={new File([''], 'big.md')}
        index={createIndex()}
        chunks={createChunks()}
        client={client}
        activeLine={1}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(renderMarkdown).toHaveBeenCalledWith('# Chunk\nbody', { chunkMode: true }));
    expect(screen.getByRole('heading', { name: 'Chunk' })).toBeInTheDocument();
    expect(client.readLines).toHaveBeenCalledTimes(1);

    renderMarkdown.mockRestore();
  });

  it('keeps raw mode available when chunk rendering fails', async () => {
    const renderMarkdown = vi.spyOn(markdownRenderer, 'renderMarkdown').mockRejectedValue(new Error('bad markdown'));
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 4, text: '# Raw fallback\nbody' })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <ChunkedMarkdownDocument
        file={new File([''], 'big.md')}
        index={createIndex()}
        chunks={createChunks()}
        client={client}
        activeLine={1}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(screen.getByText(/Raw fallback/)).toBeInTheDocument());
    expect(screen.getByText('分块渲染失败，已显示原文。')).toBeInTheDocument();

    renderMarkdown.mockRestore();
  });

  it('does not render markdown for non-renderable chunks', async () => {
    const renderMarkdown = vi.spyOn(markdownRenderer, 'renderMarkdown');
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 1, text: 'x'.repeat(1024) })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <ChunkedMarkdownDocument
        file={new File([''], 'big.md')}
        index={createIndex()}
        chunks={[{ id: 'huge-line', startLine: 1, endLine: 1, startByte: 0, endByte: 2 * 1024 * 1024, headingId: null, renderable: false }]}
        client={client}
        activeLine={1}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(screen.getByText('x'.repeat(1024))).toBeInTheDocument());
    expect(renderMarkdown).not.toHaveBeenCalled();
    expect(screen.getByText('当前分块过大，已显示原文。')).toBeInTheDocument();

    renderMarkdown.mockRestore();
  });

  it('shows a failure state when chunk lines cannot be loaded', async () => {
    const renderMarkdown = vi.spyOn(markdownRenderer, 'renderMarkdown');
    const client = {
      readLines: vi.fn(async () => Promise.reject(new Error('permission lost'))),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <ChunkedMarkdownDocument
        file={new File([''], 'big.md')}
        index={createIndex()}
        chunks={createChunks()}
        client={client}
        activeLine={1}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(screen.getByText('无法读取当前分块：permission lost')).toBeInTheDocument());
    expect(renderMarkdown).not.toHaveBeenCalled();

    renderMarkdown.mockRestore();
  });
});
