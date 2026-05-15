/// <reference lib="webworker" />

import {
  buildLargeDocumentIndex,
  readLargeDocumentLines,
  searchLargeDocument,
} from './largeDocumentIndex';
import type {
  LargeDocumentWorkerRequest,
  LargeDocumentWorkerResponse,
  LargeDocumentWorkerResult,
} from './largeDocumentWorkerProtocol';

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<LargeDocumentWorkerRequest>) => {
  void handleRequest(event.data);
});

async function handleRequest(request: LargeDocumentWorkerRequest) {
  try {
    if (request.type === 'buildIndex') {
      postSuccess(request.id, await buildLargeDocumentIndex(request.file));
      return;
    }

    if (request.type === 'readLines') {
      postSuccess(
        request.id,
        await readLargeDocumentLines(request.file, request.index, {
          startLine: request.startLine,
          endLine: request.endLine,
        }),
      );
      return;
    }

    postSuccess(
      request.id,
      await searchLargeDocument(request.file, request.index, {
        query: request.query,
        limit: request.limit,
      }),
    );
  } catch (error) {
    scope.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : '大文件处理失败',
    } satisfies LargeDocumentWorkerResponse);
  }
}

function postSuccess(id: string, result: LargeDocumentWorkerResult) {
  scope.postMessage({ id, ok: true, result } satisfies LargeDocumentWorkerResponse);
}
