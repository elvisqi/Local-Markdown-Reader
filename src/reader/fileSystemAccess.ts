import {
  isReadableDocumentFile,
  normalizePath,
  shouldIgnoreDirectory,
  sortFileEntries,
} from '../shared/fileSystem';
import type { FileTreeNode } from '../shared/types';

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
        description: 'Markdown 或 HTML 文件',
        accept: {
          'text/markdown': ['.md', '.markdown', '.mdown', '.mkdn', '.mdtxt', '.mdtext'],
          'text/html': ['.html', '.htm'],
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
  const fileHandle = await getFileHandle(handle, path);
  if (!fileHandle) {
    return null;
  }

  return URL.createObjectURL(await fileHandle.getFile());
}

function createDocumentFileSnapshot(path: string, file: File): DocumentFileSnapshot {
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
