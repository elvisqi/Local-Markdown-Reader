import {
  isReadableDocumentFile,
  normalizePath,
  shouldIgnoreDirectory,
  sortFileEntries,
  sortLazyFileTreeNodes,
} from '../shared/fileSystem';
import type { FileTreeNode, LazyFileTreeNode } from '../shared/types';

type DirectoryLike = Pick<FileSystemDirectoryHandle, 'kind' | 'name' | 'entries'>;
type FileLike = Pick<FileSystemFileHandle, 'kind' | 'name' | 'getFile'>;
type DirectoryNode = Extract<FileTreeNode, { type: 'directory' }>;

export type DocumentFileSnapshot = {
  path: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file: File;
};

export type MarkdownFileSnapshot = DocumentFileSnapshot;

export async function openDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = globalThis.showDirectoryPicker;
  if (!picker) {
    throw new Error('This browser does not support folder access.');
  }

  return picker({ mode: 'read' });
}

export async function openMarkdownFile(): Promise<MarkdownFileSnapshot> {
  return openDocumentFile();
}

export async function openDocumentFile(): Promise<DocumentFileSnapshot> {
  const picker = window.showOpenFilePicker;
  if (!picker) {
    throw new Error('This browser does not support file access.');
  }

  const [fileHandle] = await picker({
    multiple: false,
    types: [
      {
        description: 'Markdown、HTML、JSON、JSONL 或 YAML 文件',
        accept: {
          'application/json': ['.json'],
          'application/x-ndjson': ['.jsonl'],
          'text/markdown': ['.md', '.markdown', '.mdown', '.mkdn', '.mdtxt', '.mdtext'],
          'text/html': ['.html', '.htm'],
          'text/yaml': ['.yaml', '.yml'],
        },
      },
    ],
  });
  const file = await fileHandle.getFile();

  return createDocumentFileSnapshot(file.name, file);
}

export async function scanMarkdownDirectory(handle: DirectoryLike): Promise<FileTreeNode[]> {
  return scanDocumentDirectory(handle);
}

export async function scanDocumentDirectory(handle: DirectoryLike): Promise<FileTreeNode[]> {
  const nodes: FileTreeNode[] = [];

  for await (const [, entry] of handle.entries()) {
    if (entry.kind === 'directory') {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      const children = await scanDirectory(entry as DirectoryLike, [entry.name]);
      if (children.children.length > 0) {
        nodes.push(children);
      }
    } else if (entry.kind === 'file' && isReadableDocumentFile(entry.name)) {
      nodes.push({
        type: 'file',
        name: entry.name,
        path: entry.name,
      });
    }
  }

  return sortFileEntries(nodes);
}

export type DirectoryScanSession = {
  scanChildren: (directoryPath: string) => Promise<LazyFileTreeNode[]>;
};

export type HydratedDirectorySegment = {
  path: string;
  children: LazyFileTreeNode[];
};

export function isStaleLoadedDirectoryError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('Directory handle not loaded: ');
}

export function createDirectoryScanSession(rootHandle: DirectoryLike): DirectoryScanSession {
  const handlesByPath = new Map<string, DirectoryLike>([['', rootHandle]]);

  return {
    async scanChildren(directoryPath: string) {
      const normalizedPath = normalizePath([directoryPath]);
      const directoryHandle = handlesByPath.get(normalizedPath);
      if (!directoryHandle) {
        throw new Error(`Directory handle not loaded: ${normalizedPath}`);
      }

      const { children, childHandles } = await scanDirectoryHandleChildren(directoryHandle, normalizedPath);

      childHandles.forEach((childHandle, path) => handlesByPath.set(path, childHandle));

      return children;
    },
  };
}

export async function scanDirectoryChildren(handle: DirectoryLike, directoryPath: string): Promise<LazyFileTreeNode[]> {
  return createDirectoryScanSession(handle).scanChildren(directoryPath);
}

export async function hydrateDirectoryPath(
  scanSession: DirectoryScanSession,
  documentPath: string,
): Promise<HydratedDirectorySegment[]> {
  const parts = documentPath.split('/').filter(Boolean);
  const segments: HydratedDirectorySegment[] = [
    { path: '', children: await scanSession.scanChildren('') },
  ];

  const directoryPaths = parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
  for (const directoryPath of directoryPaths) {
    try {
      segments.push({ path: directoryPath, children: await scanSession.scanChildren(directoryPath) });
    } catch (err) {
      if (!isStaleLoadedDirectoryError(err)) {
        throw err;
      }

      break;
    }
  }

  return segments;
}

export async function readMarkdownFile(handle: DirectoryLike, path: string): Promise<string> {
  return readDocumentFile(handle, path);
}

export async function readDocumentFile(handle: DirectoryLike, path: string): Promise<string> {
  const fileHandle = await getFileHandle(handle, path);
  if (!fileHandle) {
    throw new Error(`File not found: ${path}`);
  }

  return (await fileHandle.getFile()).text();
}

export async function readMarkdownFileSnapshot(
  handle: DirectoryLike,
  path: string,
): Promise<MarkdownFileSnapshot> {
  return readDocumentFileSnapshot(handle, path);
}

export async function readDocumentFileSnapshot(
  handle: DirectoryLike,
  path: string,
): Promise<DocumentFileSnapshot> {
  const fileHandle = await getFileHandle(handle, path);
  if (!fileHandle) {
    throw new Error(`File not found: ${path}`);
  }

  return createDocumentFileSnapshot(path, await fileHandle.getFile());
}

export async function readMarkdownFileSlice(file: Blob, start: number, end: number): Promise<string> {
  return file.slice(start, end).text();
}

export async function readAssetBlobUrl(handle: DirectoryLike, path: string): Promise<string | null> {
  const file = await readAssetFile(handle, path);
  return file ? URL.createObjectURL(file) : null;
}

export async function readAssetFile(handle: DirectoryLike, path: string): Promise<File | null> {
  const fileHandle = await getFileHandle(handle, path);
  if (!fileHandle) {
    return null;
  }

  return fileHandle.getFile();
}

export function createDocumentFileSnapshot(path: string, file: File): DocumentFileSnapshot {
  return {
    path,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    file,
  };
}

async function scanDirectory(handle: DirectoryLike, pathParts: string[]): Promise<DirectoryNode> {
  const children: FileTreeNode[] = [];

  for await (const [, entry] of handle.entries()) {
    if (entry.kind === 'directory') {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      const child = await scanDirectory(entry as DirectoryLike, [...pathParts, entry.name]);
      if (child.children.length > 0) {
        children.push(child);
      }
    } else if (entry.kind === 'file' && isReadableDocumentFile(entry.name)) {
      children.push({
        type: 'file',
        name: entry.name,
        path: normalizePath([...pathParts, entry.name]),
      });
    }
  }

  return {
    type: 'directory',
    name: handle.name,
    path: normalizePath(pathParts),
    children: sortFileEntries(children),
  };
}

async function scanDirectoryHandleChildren(
  directoryHandle: DirectoryLike,
  directoryPath: string,
): Promise<{ children: LazyFileTreeNode[]; childHandles: Map<string, DirectoryLike> }> {
  if (!directoryHandle) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  const parentParts = directoryPath.split('/').filter(Boolean);
  const nodes: LazyFileTreeNode[] = [];
  const childHandles = new Map<string, DirectoryLike>();

  for await (const [, entry] of directoryHandle.entries()) {
    const path = normalizePath([...parentParts, entry.name]);

    if (entry.kind === 'directory') {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      nodes.push({
        id: path,
        type: 'directory',
        name: entry.name,
        path,
        children: [],
        loadState: 'unloaded',
      });
      childHandles.set(path, entry as DirectoryLike);
    } else if (entry.kind === 'file' && isReadableDocumentFile(entry.name)) {
      nodes.push({
        id: path,
        type: 'file',
        name: entry.name,
        path,
      });
    }
  }

  return { children: sortLazyFileTreeNodes(nodes), childHandles };
}

async function getFileHandle(handle: DirectoryLike, path: string): Promise<FileLike | null> {
  const parts = path.split('/').filter(Boolean);
  let current: DirectoryLike = handle;

  for (const [index, part] of parts.entries()) {
    const isLast = index === parts.length - 1;
    let found: DirectoryLike | FileLike | null = null;

    for await (const [name, entry] of current.entries()) {
      if (name === part) {
        found = entry as DirectoryLike | FileLike;
        break;
      }
    }

    if (!found) {
      return null;
    }

    if (isLast) {
      return found.kind === 'file' ? found : null;
    }

    if (found.kind !== 'directory') {
      return null;
    }

    current = found;
  }

  return null;
}
