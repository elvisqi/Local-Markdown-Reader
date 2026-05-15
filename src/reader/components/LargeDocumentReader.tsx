import { useEffect, useRef, useState } from 'react';

import { formatDocumentBytes, LARGE_LINE_WINDOW_SIZE } from '../largeDocument';
import type { LargeDocumentIndex, LargeDocumentSearchResult } from '../largeDocumentIndex';
import type { LargeDocumentWorkerClient } from '../largeDocumentWorkerClient';
import { VirtualLargeDocumentReader } from './VirtualLargeDocumentReader';

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
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LargeDocumentSearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [searchTargetLine, setSearchTargetLine] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

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
    setSearchTargetLine(nextLine);
    onNavigateLine(nextLine);
  }

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

      <VirtualLargeDocumentReader
        file={file}
        index={index}
        client={client}
        anchorLine={anchorLine}
        searchTargetLine={searchTargetLine}
      />
    </section>
  );
}
