import { createLargeDocumentWorkerClient } from './largeDocumentWorkerClient';

class FakeWorker extends EventTarget {
  messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  reply(message: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: message }));
  }
}

describe('largeDocumentWorkerClient', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'request-1'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves worker responses by request id', async () => {
    const worker = new FakeWorker();
    const client = createLargeDocumentWorkerClient(() => worker as unknown as Worker);
    const file = new File(['# A'], 'a.md');

    const promise = client.buildIndex(file);
    const request = worker.messages[0] as { id: string; type: string };

    expect(request.type).toBe('buildIndex');

    worker.reply({
      id: request.id,
      ok: true,
      result: { name: 'a.md', size: 3, lineCount: 1, lineStarts: [0], outline: [], title: null, warnings: [] },
    });

    await expect(promise).resolves.toMatchObject({ name: 'a.md', lineCount: 1 });
  });

  it('rejects worker errors and terminates workers', async () => {
    const worker = new FakeWorker();
    const client = createLargeDocumentWorkerClient(() => worker as unknown as Worker);
    const promise = client.search(
      new File(['abc'], 'a.md'),
      {
        name: 'a.md',
        size: 3,
        lineCount: 1,
        lineStarts: [0],
        outline: [],
        title: null,
        warnings: [],
      },
      { query: 'abc' },
    );
    const request = worker.messages[0] as { id: string };

    worker.reply({ id: request.id, ok: false, error: 'Search failed' });

    await expect(promise).rejects.toThrow('Search failed');

    client.terminate();
    expect(worker.terminated).toBe(true);
  });
});
