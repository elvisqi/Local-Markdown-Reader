import { render, screen, waitFor } from '@testing-library/react';

import type { LargeDocumentIndex } from '../largeDocumentIndex';
import { VirtualLargeDocumentReader } from './VirtualLargeDocumentReader';

const scrollToIndex = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 9600,
    getVirtualItems: () => [
      { key: 'line-11', index: 10, start: 320, size: 32 },
      { key: 'line-12', index: 11, start: 352, size: 32 },
    ],
    measureElement: vi.fn(),
    scrollToIndex,
  }),
}));

function createIndex(): LargeDocumentIndex {
  return {
    name: 'big.md',
    size: 1024,
    lineCount: 300,
    lineStarts: [0],
    title: 'Big',
    outline: [],
    warnings: [],
  };
}

describe('VirtualLargeDocumentReader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the requested visible rows around the virtual range', async () => {
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 132, text: Array.from({ length: 132 }, (_, index) => `line ${index + 1}`).join('\n') })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    render(
      <VirtualLargeDocumentReader
        file={new File([''], 'big.md')}
        index={createIndex()}
        client={client}
        anchorLine={1}
        searchTargetLine={null}
      />,
    );

    await waitFor(() =>
      expect(client.readLines).toHaveBeenCalledWith(expect.any(File), expect.any(Object), {
        startLine: 1,
        endLine: 132,
      }),
    );
    expect(screen.getByText('line 11')).toBeInTheDocument();
    expect(screen.getByText('line 12')).toBeInTheDocument();
    expect(screen.queryByText('line 200')).not.toBeInTheDocument();
  });

  it('keeps search result navigation compatible with virtual scroll', async () => {
    const client = {
      readLines: vi.fn(async () => ({ startLine: 1, endLine: 132, text: 'line 1\nline 2' })),
      search: vi.fn(),
      buildIndex: vi.fn(),
      terminate: vi.fn(),
    };

    const { rerender } = render(
      <VirtualLargeDocumentReader
        file={new File([''], 'big.md')}
        index={createIndex()}
        client={client}
        anchorLine={1}
        searchTargetLine={null}
      />,
    );

    rerender(
      <VirtualLargeDocumentReader
        file={new File([''], 'big.md')}
        index={createIndex()}
        client={client}
        anchorLine={42}
        searchTargetLine={42}
      />,
    );

    await waitFor(() => expect(scrollToIndex).toHaveBeenCalledWith(41, { align: 'center' }));
  });
});
