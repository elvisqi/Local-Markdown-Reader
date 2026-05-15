import {
  consumeTemporaryMarkdownDocument,
  createTemporaryMarkdownDocumentName,
  isMarkdownFileUrl,
  saveTemporaryMarkdownDocument,
  type TemporaryDocumentStorage,
} from './temporaryDocument';

function createStorage(): TemporaryDocumentStorage {
  const values = new Map<string, unknown>();

  return {
    async get(key) {
      if (typeof key !== 'string') {
        return {};
      }

      return { [key]: values.get(key) };
    },
    async set(items) {
      Object.entries(items).forEach(([key, value]) => values.set(key, value));
    },
    async remove(key) {
      if (typeof key === 'string') {
        values.delete(key);
      }
    },
  };
}

describe('temporary markdown documents', () => {
  it('saves and consumes a temporary document from session storage once', async () => {
    const storage = createStorage();
    const document = {
      url: 'file:///Users/qiyu/Desktop/standalone.md',
      name: 'standalone.md',
      createdAt: 123,
    };

    const id = await saveTemporaryMarkdownDocument(document, storage, () => 'temp-1');

    expect(id).toBe('temp-1');
    await expect(consumeTemporaryMarkdownDocument('temp-1', storage)).resolves.toEqual(document);
    await expect(consumeTemporaryMarkdownDocument('temp-1', storage)).resolves.toBeNull();
  });

  it('detects Markdown file URLs and derives readable names', () => {
    expect(isMarkdownFileUrl('file:///Users/qiyu/Desktop/PRD%20Notes.md')).toBe(true);
    expect(isMarkdownFileUrl('https://example.com/notes.md')).toBe(false);
    expect(isMarkdownFileUrl('file:///Users/qiyu/Desktop/image.png')).toBe(false);
    expect(createTemporaryMarkdownDocumentName('file:///Users/qiyu/Desktop/PRD%20Notes.md')).toBe('PRD Notes.md');
  });

  it('falls back to chrome local storage when session storage is unavailable', async () => {
    const local = createStorage();
    vi.stubGlobal('chrome', {
      storage: {
        local,
      },
    });

    const id = await saveTemporaryMarkdownDocument(
      {
        url: 'file:///Users/qiyu/Desktop/fallback.md',
        name: 'fallback.md',
        source: '# Fallback',
        createdAt: 456,
      },
      undefined,
      () => 'fallback-1',
    );

    await expect(consumeTemporaryMarkdownDocument(id)).resolves.toEqual({
      url: 'file:///Users/qiyu/Desktop/fallback.md',
      name: 'fallback.md',
      source: '# Fallback',
      createdAt: 456,
    });

    vi.unstubAllGlobals();
  });

  it('stores metadata for temporary documents whose source is not available inline', async () => {
    const storage = createStorage();
    const document = {
      url: 'file:///Users/qiyu/Desktop/huge.md',
      name: 'huge.md',
      sourceSize: 108 * 1024 * 1024,
      sourceAvailable: false,
      createdAt: 123,
    };

    const id = await saveTemporaryMarkdownDocument(document, storage, () => 'huge-1');

    await expect(consumeTemporaryMarkdownDocument(id, storage)).resolves.toEqual(document);
  });
});
