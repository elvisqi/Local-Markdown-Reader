import type { FileTreeNode } from '../shared/types';
import {
  canReadDirectory,
  clearLastDocument,
  loadLastDocument,
  requestDirectoryReadPermission,
  saveLastDocument,
  selectRememberedDocumentPath,
  type LastDocumentRecord,
  type ReaderStateStore,
} from './recentDocument';

function memoryStore(): ReaderStateStore {
  const values = new Map<string, unknown>();

  return {
    get: async (key) => values.get(key),
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
}

describe('recentDocument', () => {
  it('saves and loads the last opened document', async () => {
    const store = memoryStore();
    const record: LastDocumentRecord = {
      directoryHandle: { kind: 'directory', name: 'docs' } as FileSystemDirectoryHandle,
      directoryName: 'docs',
      path: 'guide.md',
      updatedAt: 123,
    };

    await saveLastDocument(record, store);

    await expect(loadLastDocument(store)).resolves.toEqual(record);
  });

  it('clears the last opened document', async () => {
    const store = memoryStore();
    const record: LastDocumentRecord = {
      directoryHandle: { kind: 'directory', name: 'docs' } as FileSystemDirectoryHandle,
      directoryName: 'docs',
      path: 'guide.md',
      updatedAt: 123,
    };

    await saveLastDocument(record, store);
    await clearLastDocument(store);

    await expect(loadLastDocument(store)).resolves.toBeNull();
  });

  it('returns null when there is no available state store', async () => {
    await expect(loadLastDocument(null)).resolves.toBeNull();
    await expect(
      saveLastDocument(
        {
          directoryHandle: { kind: 'directory', name: 'docs' } as FileSystemDirectoryHandle,
          directoryName: 'docs',
          path: 'guide.md',
          updatedAt: 123,
        },
        null,
      ),
    ).resolves.toBeUndefined();
  });

  it('uses the remembered Markdown path when it still exists', () => {
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
    ];

    expect(selectRememberedDocumentPath(tree, 'docs/guide.md')).toBe('docs/guide.md');
  });

  it('falls back to the default document when the remembered path is gone', () => {
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: 'api.md', path: 'api.md' },
    ];

    expect(selectRememberedDocumentPath(tree, 'missing.md')).toBe('README.md');
  });

  it('checks and requests read permission for restored directories', async () => {
    const grantedHandle = {
      queryPermission: vi.fn(async () => 'granted' as PermissionState),
      requestPermission: vi.fn(async () => 'granted' as PermissionState),
    } as unknown as FileSystemDirectoryHandle;
    const promptHandle = {
      queryPermission: vi.fn(async () => 'prompt' as PermissionState),
      requestPermission: vi.fn(async () => 'denied' as PermissionState),
    } as unknown as FileSystemDirectoryHandle;

    await expect(canReadDirectory(grantedHandle)).resolves.toBe(true);
    await expect(canReadDirectory(promptHandle)).resolves.toBe(false);
    await expect(requestDirectoryReadPermission(grantedHandle)).resolves.toBe(true);
    await expect(requestDirectoryReadPermission(promptHandle)).resolves.toBe(false);
  });
});
