import { isMarkdownFile } from './fileSystem';

const TEMPORARY_DOCUMENT_KEY_PREFIX = 'temporaryMarkdownDocument:';

export type TemporaryMarkdownDocument = {
  url: string;
  name: string;
  source?: string;
  createdAt: number;
};

export type TemporaryDocumentStorage = Pick<chrome.storage.StorageArea, 'get' | 'set' | 'remove'>;

export function isMarkdownFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'file:' && isMarkdownFile(parsed.pathname);
  } catch {
    return false;
  }
}

export function createTemporaryMarkdownDocumentName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').filter(Boolean).at(-1);
    return filename ? decodeURIComponent(filename) : '临时 Markdown 文件';
  } catch {
    return '临时 Markdown 文件';
  }
}

export async function saveTemporaryMarkdownDocument(
  document: TemporaryMarkdownDocument,
  storage: TemporaryDocumentStorage | undefined = getTemporaryDocumentStorage(),
  createId: () => string = () => crypto.randomUUID(),
): Promise<string | null> {
  if (!storage?.set) {
    return null;
  }

  const id = createId();
  await storage.set({ [createTemporaryDocumentKey(id)]: document });
  return id;
}

export async function consumeTemporaryMarkdownDocument(
  id: string | null | undefined,
  storage: TemporaryDocumentStorage | undefined = getTemporaryDocumentStorage(),
): Promise<TemporaryMarkdownDocument | null> {
  if (!id || !storage?.get || !storage.remove) {
    return null;
  }

  const key = createTemporaryDocumentKey(id);
  const stored = await storage.get(key);
  await storage.remove(key);

  const document = stored[key];
  return isTemporaryMarkdownDocument(document) ? document : null;
}

function createTemporaryDocumentKey(id: string): string {
  return `${TEMPORARY_DOCUMENT_KEY_PREFIX}${id}`;
}

function getTemporaryDocumentStorage(): TemporaryDocumentStorage | undefined {
  return globalThis.chrome?.storage?.session ?? globalThis.chrome?.storage?.local;
}

function isTemporaryMarkdownDocument(value: unknown): value is TemporaryMarkdownDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof value.url === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'number' &&
    (!('source' in value) || typeof value.source === 'string')
  );
}
