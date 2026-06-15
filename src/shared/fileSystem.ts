import type { DocumentFileEntry, DocumentFileKind, FileTreeNode, LazyFileTreeNode, MarkdownFileEntry } from './types';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkdn', '.mdtxt', '.mdtext']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const JSON_EXTENSIONS = new Set(['.json']);
const JSONL_EXTENSIONS = new Set(['.jsonl']);
const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.cache']);

export type DocumentTreeAnalysis = {
  files: DocumentFileEntry[];
  defaultPath: string | null;
  containsPath: boolean;
};

export function isMarkdownFile(name: string): boolean {
  return hasExtension(name, MARKDOWN_EXTENSIONS);
}

export function isHtmlFile(name: string): boolean {
  return hasExtension(name, HTML_EXTENSIONS);
}

export function isJsonFile(name: string): boolean {
  return hasExtension(name, JSON_EXTENSIONS);
}

export function isJsonLinesFile(name: string): boolean {
  return hasExtension(name, JSONL_EXTENSIONS);
}

export function isYamlFile(name: string): boolean {
  return hasExtension(name, YAML_EXTENSIONS);
}

export function isReadableDocumentFile(name: string): boolean {
  return isMarkdownFile(name) || isHtmlFile(name) || isJsonFile(name) || isJsonLinesFile(name) || isYamlFile(name);
}

export function getDocumentFileKind(name: string): DocumentFileKind | null {
  if (isMarkdownFile(name)) {
    return 'markdown';
  }

  if (isHtmlFile(name)) {
    return 'html';
  }

  if (isJsonFile(name)) {
    return 'json';
  }

  if (isJsonLinesFile(name)) {
    return 'jsonl';
  }

  if (isYamlFile(name)) {
    return 'yaml';
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

export function selectPathAncestors(path: string): string[] {
  const parts = normalizePath([path]).split('/').filter(Boolean);
  if (parts.length <= 1) {
    return [];
  }

  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

export function sortLazyFileTreeNodes(entries: LazyFileTreeNode[]): LazyFileTreeNode[] {
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
  return analyzeDocumentTree(tree).defaultPath;
}

export function selectDefaultLoadedDocument(tree: LazyFileTreeNode[]): string | null {
  return selectDefaultDocumentFromFiles(flattenLoadedDocumentFiles(tree));
}

export function selectRememberedLoadedDocument(tree: LazyFileTreeNode[], rememberedPath: string): string | null {
  const files = flattenLoadedDocumentFiles(tree);
  return files.some((file) => file.path === rememberedPath)
    ? rememberedPath
    : selectDefaultDocumentFromFiles(files);
}

export function flattenLoadedDocumentFiles(tree: LazyFileTreeNode[]): DocumentFileEntry[] {
  return sortLazyFileTreeNodes(tree).flatMap((node) => {
    if (node.type === 'directory') {
      return node.loadState === 'loaded' ? flattenLoadedDocumentFiles(node.children) : [];
    }

    return isReadableDocumentFile(node.name) ? [{ name: node.name, path: node.path }] : [];
  });
}

export function analyzeDocumentTree(tree: FileTreeNode[], lookupPath?: string | null): DocumentTreeAnalysis {
  const files = flattenSortedDocumentFiles(tree);

  return {
    files,
    defaultPath: selectDefaultDocumentFromFiles(files),
    containsPath: lookupPath ? files.some((file) => file.path === lookupPath) : false,
  };
}

function flattenSortedDocumentFiles(tree: FileTreeNode[]): DocumentFileEntry[] {
  return sortFileEntries(tree).flatMap((node) => {
    if (node.type === 'directory') {
      return flattenSortedDocumentFiles(node.children);
    }

    return isReadableDocumentFile(node.name) ? [{ name: node.name, path: node.path }] : [];
  });
}

function selectDefaultDocumentFromFiles(files: DocumentFileEntry[]): string | null {
  return (
    files.find((file) => file.name.toLowerCase() === 'readme.md')?.path ??
    files.find((file) => file.name.toLowerCase() === 'readme.html')?.path ??
    files.find((file) => file.name.toLowerCase() === 'readme.htm')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.md')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.html')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.htm')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.json')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.jsonl')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.yaml')?.path ??
    files.find((file) => file.name.toLowerCase() === 'index.yml')?.path ??
    files[0]?.path ??
    null
  );
}
