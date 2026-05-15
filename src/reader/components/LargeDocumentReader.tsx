import { useEffect, useRef, useState } from 'react';

import { createLineWindow, formatDocumentBytes, LARGE_LINE_WINDOW_SIZE } from '../largeDocument';
import type { LargeDocumentIndex, LargeDocumentLineRange, LargeDocumentSearchResult } from '../largeDocumentIndex';
import type { LargeDocumentWorkerClient } from '../largeDocumentWorkerClient';

export function LargeDocumentReader({
  file,
  index,
  reason,
  client,
  anchorLine,
  onNavigateLine,
}: {
  file: File;
  index: LargeDocumentIndex;
  reason: string;
  client: LargeDocumentWorkerClient;
  anchorLine: number;
  onNavigateLine: (line: number) => void;
}) {
  const [range, setRange] = useState<LargeDocumentLineRange | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LargeDocumentSearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const nextWindow = createLineWindow({
      lineCount: index.lineCount,
      anchorLine,
      windowSize: LARGE_LINE_WINDOW_SIZE,
    });

    let cancelled = false;
    setStatus('正在读取当前窗口');

    void client.readLines(file, index, nextWindow).then(
      (nextRange) => {
        if (!cancelled) {
          setRange(nextRange);
          setStatus(null);
        }
      },
      (error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : '读取失败');
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [anchorLine, client, file, index]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  async function runSearch() {
    setStatus('正在搜索');
    try {
      const results = await client.search(file, index, { query, limit: 200 });
      setSearchResults(results);
      setStatus(results.length ? null : '没有找到匹配结果');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '搜索失败');
    }
  }

  function jumpToLine(line: number) {
    const nextLine = Math.min(Math.max(1, line), index.lineCount);
    onNavigateLine(nextLine);
  }

  const lines = range?.text.replace(/\n$/, '').split('\n') ?? [];

  return (
    <section className="large-document-reader" aria-label="大文件阅读器">
      <div className="large-document-reader__notice">
        <strong>大文件安全模式</strong>
        <span>{reason}</span>
        <span>
          {formatDocumentBytes(index.size)} · {index.lineCount} 行
        </span>
      </div>

      <div className="large-document-reader__tools">
        <button type="button" onClick={() => jumpToLine(anchorLine - LARGE_LINE_WINDOW_SIZE)} disabled={anchorLine <= 1}>
          上一页
        </button>
        <button
          type="button"
          onClick={() => jumpToLine(anchorLine + LARGE_LINE_WINDOW_SIZE)}
          disabled={anchorLine >= index.lineCount}
        >
          下一页
        </button>
        <label>
          跳到行
          <input
            type="number"
            min={1}
            max={index.lineCount}
            value={anchorLine}
            onChange={(event) => jumpToLine(Number(event.target.value))}
          />
        </label>
        <input
          ref={searchRef}
          role="searchbox"
          aria-label="搜索当前大文件"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" onClick={() => void runSearch()}>
          搜索
        </button>
      </div>

      {status && <p className="status-note">{status}</p>}

      {searchResults.length > 0 && (
        <ol className="large-document-reader__search-results">
          {searchResults.map((result) => (
            <li key={`${result.line}:${result.column}`}>
              <button type="button" onClick={() => jumpToLine(result.line)}>
                第 {result.line} 行：{result.text}
              </button>
            </li>
          ))}
        </ol>
      )}

      <pre className="large-document-reader__source">
        {lines.map((line, index) => (
          <code key={`${range?.startLine ?? 1}:${index}`}>
            <span className="large-document-reader__line-number">{(range?.startLine ?? 1) + index}</span>
            {line}
            {'\n'}
          </code>
        ))}
      </pre>
    </section>
  );
}
