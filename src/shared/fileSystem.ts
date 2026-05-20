import type { DocumentFileEntry, DocumentFileKind, FileTreeNode, MarkdownFileEntry } from './types';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkdn', '.mdtxt', '.mdtext']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.cache']);

export function isMarkdownFile(name: string): boolean {
  return hasExtension(name, MARKDOWN_EXTENSIONS);
}

export function isHtmlFile(name: string): boolean {
  return hasExtension(name, HTML_EXTENSIONS);
}

export function isReadableDocumentFile(name: string): boolean {
  return isMarkdownFile(name) || isHtmlFile(name);
}

export function getDocumentFileKind(name: string): DocumentFileKind | null {
  if (isMarkdownFile(name)) {
    return 'markdown';
  }

  if (isHtmlFile(name)) {
    return 'html';
  }

  return null;
}

function hasExtension(name: string, extensions: Set<string>): boolean {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf('.');

  if (dot < 0) {
    return false;
  }

  return extensions.has(lower.slice(dot));
}

export function shouldIgnoreDirectory(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRECTORIES.has(name);
}

export function normalizePath(parts: string[]): string {
  return parts
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}

export function sortFileEntries(entries: FileTreeNode[]): FileTreeNode[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function flattenMarkdownFiles(tree: FileTreeNode[]): MarkdownFileEntry[] {
  return flattenDocumentFiles(tree).filter((file) => isMarkdownFile(file.name));
}

export function flattenDocumentFiles(tree: FileTreeNode[]): DocumentFileEntry[] {
  return tree.flatMap((node) => {
    if (node.type === 'directory') {
      return flattenDocumentFiles(node.children);
    }

    return isReadableDocumentFile(node.name) ? [{ name: node.name, path: node.path }] : [];
  });
}

export function selectDefaultDocument(tree: FileTreeNode[]): string | null {
  const files = flattenDocumentFiles(sortTree(tree));

  return (
    files.find((file) => file.name.toLowerCase() === 'readme.md')?.path ??
    files.find((file) => file.name.toLowerCase() === 'readme.html')?.path ??
    files.find((file) => file.name.toLowerCase() === 'readme.htm')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.md')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.html')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.htm')?.path ??
    files[0]?.path ??
    null
  );
}

function sortTree(tree: FileTreeNode[]): FileTreeNode[] {
  return sortFileEntries(tree).map((node) =>
    node.type === 'directory'
      ? {
          ...node,
          children: sortTree(node.children),
        }
      : node,
  );
}
