import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { LargeDocumentIndex } from '../largeDocumentIndex';
import type { LargeDocumentWorkerClient } from '../largeDocumentWorkerClient';

const LINE_HEIGHT = 32;
const OVERSCAN_LINES = 120;

export function VirtualLargeDocumentReader({
  file,
  index,
  client,
  anchorLine,
  searchTargetLine,
}: {
  file: File;
  index: LargeDocumentIndex;
  client: LargeDocumentWorkerClient;
  anchorLine: number;
  searchTargetLine: number | null;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [loadedRange, setLoadedRange] = useState<{ startLine: number; endLine: number; lines: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const virtualizer = useVirtualizer({
    count: index.lineCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LINE_HEIGHT,
    overscan: 20,
  });
  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    virtualizer.scrollToIndex(anchorLine - 1, { align: 'center' });
  }, [anchorLine, virtualizer]);

  useEffect(() => {
    if (searchTargetLine) {
      virtualizer.scrollToIndex(searchTargetLine - 1, { align: 'center' });
    }
  }, [searchTargetLine, virtualizer]);

  const fetchRange = useMemo(() => {
    if (virtualItems.length === 0) {
      return { startLine: Math.max(1, anchorLine - OVERSCAN_LINES), endLine: Math.min(index.lineCount, anchorLine + OVERSCAN_LINES) };
    }

    const firstLine = virtualItems[0].index + 1;
    const lastLine = virtualItems[virtualItems.length - 1].index + 1;

    return {
      startLine: Math.max(1, firstLine - OVERSCAN_LINES),
      endLine: Math.min(index.lineCount, lastLine + OVERSCAN_LINES),
    };
  }, [anchorLine, index.lineCount, virtualItems]);

  useEffect(() => {
    let cancelled = false;

    setError(null);

    void client
      .readLines(file, index, fetchRange)
      .then((range) => {
        if (cancelled) {
          return;
        }

        setLoadedRange({
          startLine: range.startLine,
          endLine: range.endLine,
          lines: range.text.replace(/\n$/, '').split('\n'),
        });
      })
      .catch((readError) => {
        if (!cancelled) {
          setError(readError instanceof Error ? readError.message : '读取失败');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, fetchRange, file, index]);

  function getLine(line: number): string {
    if (!loadedRange || line < loadedRange.startLine || line > loadedRange.endLine) {
      return '';
    }

    return loadedRange.lines[line - loadedRange.startLine] ?? '';
  }

  return (
    <div ref={parentRef} className="large-document-reader__virtual-source" data-testid="large-document-virtual-source">
      {error && <p className="status-note">无法读取当前行范围：{error}</p>}
      <div
        className="large-document-reader__virtual-spacer"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const line = virtualItem.index + 1;

          return (
            <div
              key={virtualItem.key}
              className="large-document-reader__virtual-row"
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <span className="large-document-reader__line-number">{line}</span>
              <code>{getLine(line)}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
}
