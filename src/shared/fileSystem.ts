import type { FileTreeNode, MarkdownFileEntry } from './types';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkdn', '.mdtxt', '.mdtext']);
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.cache']);

export function isMarkdownFile(name: string): boolean {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf('.');

  if (dot < 0) {
    return false;
  }

  return MARKDOWN_EXTENSIONS.has(lower.slice(dot));
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
  return tree.flatMap((node) => {
    if (node.type === 'directory') {
      return flattenMarkdownFiles(node.children);
    }

    return isMarkdownFile(node.name) ? [{ name: node.name, path: node.path }] : [];
  });
}

export function selectDefaultDocument(tree: FileTreeNode[]): string | null {
  const files = flattenMarkdownFiles(sortTree(tree));

  return (
    files.find((file) => file.name.toLowerCase() === 'readme.md')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.md')?.path ??
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
