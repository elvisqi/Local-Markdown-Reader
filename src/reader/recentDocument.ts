import { flattenMarkdownFiles, selectDefaultDocument } from '../shared/fileSystem';
import type { FileTreeNode } from '../shared/types';

const DB_NAME = 'local-markdown-reader';
const DB_VERSION = 1;
const STORE_NAME = 'readerState';
const LAST_DOCUMENT_KEY = 'lastDocument';

export type LastDocumentRecord = {
  directoryHandle: FileSystemDirectoryHandle;
  directoryName: string;
  path: string;
  updatedAt: number;
};

export type ReaderStateStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

type PermissionAwareDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: FileSystemReadPermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (descriptor?: FileSystemReadPermissionDescriptor) => Promise<PermissionState>;
};

type FileSystemReadPermissionDescriptor = {
  mode?: 'read' | 'readwrite';
};

export async function saveLastDocument(
  record: LastDocumentRecord,
  store: ReaderStateStore | null = createIndexedDbReaderStateStore(),
): Promise<void> {
  if (!store) {
    return;
  }

  await store.set(LAST_DOCUMENT_KEY, record);
}

export async function loadLastDocument(
  store: ReaderStateStore | null = createIndexedDbReaderStateStore(),
): Promise<LastDocumentRecord | null> {
  if (!store) {
    return null;
  }

  const record = await store.get(LAST_DOCUMENT_KEY);
  return isLastDocumentRecord(record) ? record : null;
}

export async function clearLastDocument(
  store: ReaderStateStore | null = createIndexedDbReaderStateStore(),
): Promise<void> {
  if (!store) {
    return;
  }

  await store.remove(LAST_DOCUMENT_KEY);
}

export function selectRememberedDocumentPath(tree: FileTreeNode[], rememberedPath: string): string | null {
  const rememberedFile = flattenMarkdownFiles(tree).find((file) => file.path === rememberedPath);

  return rememberedFile?.path ?? selectDefaultDocument(tree);
}

export async function canReadDirectory(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const permission = await queryReadPermission(handle);
  return permission === 'granted';
}

export async function requestDirectoryReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const permissionAwareHandle = handle as PermissionAwareDirectoryHandle;

  if (!permissionAwareHandle.requestPermission) {
    return true;
  }

  return (await permissionAwareHandle.requestPermission({ mode: 'read' })) === 'granted';
}

function createIndexedDbReaderStateStore(indexedDB: IDBFactory | undefined = globalThis.indexedDB): ReaderStateStore | null {
  if (!indexedDB) {
    return null;
  }

  return {
    get: async (key) => {
      const db = await openReaderStateDb(indexedDB);
      return runStoreRequest(db, 'readonly', (store) => store.get(key));
    },
    set: async (key, value) => {
      const db = await openReaderStateDb(indexedDB);
      await runStoreRequest(db, 'readwrite', (store) => store.put(value, key));
    },
    remove: async (key) => {
      const db = await openReaderStateDb(indexedDB);
      await runStoreRequest(db, 'readwrite', (store) => store.delete(key));
    },
  };
}

function openReaderStateDb(indexedDB: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = createRequest(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function queryReadPermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  const permissionAwareHandle = handle as PermissionAwareDirectoryHandle;

  if (!permissionAwareHandle.queryPermission) {
    return 'granted';
  }

  return permissionAwareHandle.queryPermission({ mode: 'read' });
}

function isLastDocumentRecord(value: unknown): value is LastDocumentRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'directoryHandle' in value &&
    'directoryName' in value &&
    'path' in value &&
    'updatedAt' in value
  );
}
