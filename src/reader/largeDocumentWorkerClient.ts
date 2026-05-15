import type { LargeDocumentIndex, LargeDocumentLineRange, LargeDocumentSearchResult } from './largeDocumentIndex';
import type { LargeDocumentWorkerRequest, LargeDocumentWorkerResponse } from './largeDocumentWorkerProtocol';

export type LargeDocumentWorkerClient = {
  buildIndex(file: File): Promise<LargeDocumentIndex>;
  readLines(
    file: File,
    index: LargeDocumentIndex,
    range: { startLine: number; endLine: number },
  ): Promise<LargeDocumentLineRange>;
  search(
    file: File,
    index: LargeDocumentIndex,
    options: { query: string; limit?: number },
  ): Promise<LargeDocumentSearchResult[]>;
  terminate(): void;
};

type WorkerRequestWithoutId = LargeDocumentWorkerRequest extends infer Request
  ? Request extends { id: string }
    ? Omit<Request, 'id'>
    : never
  : never;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

export function createLargeDocumentWorkerClient(
  createWorker: () => Worker = () => new Worker(new URL('./largeDocumentWorker.ts', import.meta.url), { type: 'module' }),
): LargeDocumentWorkerClient {
  const worker = createWorker();
  const pending = new Map<string, PendingRequest>();

  worker.addEventListener('message', (event: MessageEvent<LargeDocumentWorkerResponse>) => {
    const callback = pending.get(event.data.id);
    if (!callback) {
      return;
    }

    pending.delete(event.data.id);

    if (event.data.ok) {
      callback.resolve(event.data.result);
    } else {
      callback.reject(new Error(event.data.error));
    }
  });

  function send<T>(request: WorkerRequestWithoutId): Promise<T> {
    const id = crypto.randomUUID();

    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      worker.postMessage({ ...request, id } as LargeDocumentWorkerRequest);
    });
  }

  return {
    buildIndex(file) {
      return send<LargeDocumentIndex>({ type: 'buildIndex', file });
    },
    readLines(file, index, range) {
      return send<LargeDocumentLineRange>({
        type: 'readLines',
        file,
        index,
        startLine: range.startLine,
        endLine: range.endLine,
      });
    },
    search(file, index, options) {
      return send<LargeDocumentSearchResult[]>({
        type: 'search',
        file,
        index,
        query: options.query,
        limit: options.limit,
      });
    },
    terminate() {
      worker.terminate();
      pending.forEach(({ reject }) => reject(new Error('大文件处理已取消')));
      pending.clear();
    },
  };
}
