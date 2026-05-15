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
    outline: [
      {
        id: 'chunk',
        text: 'Chunk',
        depth: 1,
        line: 1,
        children: [{ id: 'deep', text: 'Deep', depth: 2, line: 3, children: [] }],
      },
    ],
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

  it('scrolls to headings inside the already rendered active chunk', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const renderMarkdown = vi.spyOn(markdownRenderer, 'renderMarkdown').mockResolvedValue({
      html: '<h1 id="chunk">Chunk</h1><p>body</p><h2 id="deep">Deep</h2>',
      outline: [],
      title: null,
      links: [],
      diagnostics: [],
    });
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 4, text: '# Chunk\nbody\n## Deep\nmore' })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };
    const file = new File([''], 'big.md');
    const index = createIndex();
    const chunks: MarkdownChunk[] = [
      { id: 'merged', startLine: 1, endLine: 4, startByte: 0, endByte: 60, headingId: 'chunk', renderable: true },
    ];

    const { rerender } = render(
      <ChunkedMarkdownDocument
        file={file}
        index={index}
        chunks={chunks}
        client={client}
        activeLine={1}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Deep' })).toBeInTheDocument());
    const readCountBeforeNavigation = client.readLines.mock.calls.length;
    scrollIntoView.mockClear();

    rerender(
      <ChunkedMarkdownDocument
        file={file}
        index={index}
        chunks={chunks}
        client={client}
        activeLine={3}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
    expect(client.readLines).toHaveBeenCalledTimes(readCountBeforeNavigation);

    renderMarkdown.mockRestore();
  });

  it('scrolls duplicate headings by chunk-local ordinal instead of global slug', async () => {
    const scrolledHeadingIds: string[] = [];
    Element.prototype.scrollIntoView = vi.fn(function recordScrolledHeading(this: Element) {
      scrolledHeadingIds.push(this.id);
    });
    const renderMarkdown = vi.spyOn(markdownRenderer, 'renderMarkdown').mockResolvedValue({
      html: '<h1 id="api">API</h1><p>first</p><h1 id="api-1">API</h1><p>second</p>',
      outline: [],
      title: null,
      links: [],
      diagnostics: [],
    });
    const index: LargeDocumentIndex = {
      ...createIndex(),
      outline: [
        { id: 'api', text: 'API', depth: 1, line: 1, children: [] },
        { id: 'api-1', text: 'API', depth: 1, line: 20, children: [] },
        { id: 'api-2', text: 'API', depth: 1, line: 40, children: [] },
      ],
    };
    const client = {
      readLines: vi.fn(async () => ({ startLine: 20, endLine: 60, text: '# API\nbody\n# API\nbody' })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <ChunkedMarkdownDocument
        file={new File([''], 'big.md')}
        index={index}
        chunks={[{ id: 'api-1', startLine: 20, endLine: 60, startByte: 100, endByte: 300, headingId: 'api-1', renderable: true }]}
        client={client}
        activeLine={40}
        mermaidEnabled={false}
      />,
    );

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'API' })).toHaveLength(2));
    await waitFor(() => expect(scrolledHeadingIds).toContain('api-1'));
    expect(scrolledHeadingIds).not.toContain('api');

    renderMarkdown.mockRestore();
  });
});
