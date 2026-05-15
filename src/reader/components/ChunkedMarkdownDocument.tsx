import { useEffect, useMemo, useRef, useState } from 'react';

import { renderMarkdown } from '../../shared/render/markdown';
import type { LargeDocumentIndex } from '../largeDocumentIndex';
import type { LargeDocumentWorkerClient } from '../largeDocumentWorkerClient';
import type { MarkdownChunk } from '../largeMarkdownChunks';
import { RenderedMarkdownContent } from '../RenderedMarkdownContent';

type ChunkState =
  | { status: 'loading' }
  | { status: 'rendered'; html: string }
  | { status: 'raw'; text: string; reason: 'too-large' | 'render-failed' }
  | { status: 'error'; message: string };

export function ChunkedMarkdownDocument({
  file,
  index,
  chunks,
  client,
  activeLine,
  mermaidEnabled,
}: {
  file: File;
  index: LargeDocumentIndex;
  chunks: MarkdownChunk[];
  client: LargeDocumentWorkerClient;
  activeLine: number;
  mermaidEnabled: boolean;
}) {
  const activeChunk = useMemo(
    () => chunks.find((chunk) => activeLine >= chunk.startLine && activeLine <= chunk.endLine) ?? chunks[0],
    [activeLine, chunks],
  );
  const [chunkStates, setChunkStates] = useState<Record<string, ChunkState>>({});
  const requestedChunksRef = useRef(new Set<string>());

  useEffect(() => {
    requestedChunksRef.current.clear();
    setChunkStates({});
  }, [file, index]);

  useEffect(() => {
    if (!activeChunk || requestedChunksRef.current.has(activeChunk.id)) {
      return undefined;
    }

    let cancelled = false;
    requestedChunksRef.current.add(activeChunk.id);
    setChunkStates((current) => ({ ...current, [activeChunk.id]: { status: 'loading' } }));

    void client
      .readLines(file, index, { startLine: activeChunk.startLine, endLine: activeChunk.endLine })
      .then(async (range) => {
        if (!activeChunk.renderable) {
          if (!cancelled) {
            setChunkStates((current) => ({
              ...current,
              [activeChunk.id]: { status: 'raw', text: range.text, reason: 'too-large' },
            }));
          }
          return;
        }

        try {
          const result = await renderMarkdown(range.text.replace(/\n$/, ''), { chunkMode: true });
          if (!cancelled) {
            setChunkStates((current) => ({
              ...current,
              [activeChunk.id]: { status: 'rendered', html: result.html },
            }));
          }
        } catch {
          if (!cancelled) {
            setChunkStates((current) => ({
              ...current,
              [activeChunk.id]: { status: 'raw', text: range.text, reason: 'render-failed' },
            }));
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setChunkStates((current) => ({
            ...current,
            [activeChunk.id]: {
              status: 'error',
              message: error instanceof Error ? error.message : '读取失败',
            },
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeChunk, client, file, index]);

  if (!activeChunk) {
    return <p className="empty-note">当前文档没有可预览的分块。</p>;
  }

  const state = chunkStates[activeChunk.id] ?? { status: 'loading' };

  return (
    <section className="chunked-markdown-document" aria-label="分块预览">
      <div className="chunked-markdown-document__meta">
        第 {activeChunk.startLine}-{activeChunk.endLine} 行
      </div>
      {state.status === 'loading' && <p className="status-note">正在渲染当前分块</p>}
      {state.status === 'rendered' && (
        <RenderedMarkdownContent
          html={state.html}
          mermaidEnabled={mermaidEnabled && activeChunk.endByte - activeChunk.startByte <= 256 * 1024}
        />
      )}
      {state.status === 'raw' && (
        <section className="raw-source">
          <p className="status-note">
            {state.reason === 'too-large' ? '当前分块过大，已显示原文。' : '分块渲染失败，已显示原文。'}
          </p>
          <pre>{state.text}</pre>
        </section>
      )}
      {state.status === 'error' && <p className="status-note">无法读取当前分块：{state.message}</p>}
    </section>
  );
}
