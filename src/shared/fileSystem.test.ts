import type { FileTreeNode } from './types';
import {
  flattenDocumentFiles,
  flattenMarkdownFiles,
  getDocumentFileKind,
  isHtmlFile,
  isMarkdownFile,
  isReadableDocumentFile,
  normalizePath,
  selectDefaultDocument,
  shouldIgnoreDirectory,
  sortFileEntries,
} from './fileSystem';

describe('file system helpers', () => {
  it('accepts Markdown extensions and rejects mdx', () => {
    expect(isMarkdownFile('README.md')).toBe(true);
    expect(isMarkdownFile('guide.markdown')).toBe(true);
    expect(isMarkdownFile('notes.mdown')).toBe(true);
    expect(isMarkdownFile('spec.mkdn')).toBe(true);
    expect(isMarkdownFile('draft.mdtxt')).toBe(true);
    expect(isMarkdownFile('draft.mdtext')).toBe(true);
    expect(isMarkdownFile('component.mdx')).toBe(false);
    expect(isMarkdownFile('image.svg')).toBe(false);
  });

  it('accepts HTML as a readable document type', () => {
    expect(isHtmlFile('report.html')).toBe(true);
    expect(isHtmlFile('report.htm')).toBe(true);
    expect(isHtmlFile('README.md')).toBe(false);
    expect(isReadableDocumentFile('README.md')).toBe(true);
    expect(isReadableDocumentFile('report.html')).toBe(true);
    expect(getDocumentFileKind('report.htm')).toBe('html');
    expect(getDocumentFileKind('README.md')).toBe('markdown');
    expect(getDocumentFileKind('image.svg')).toBeNull();
  });

  it('ignores hidden and generated directories', () => {
    expect(shouldIgnoreDirectory('.git')).toBe(true);
    expect(shouldIgnoreDirectory('.notes')).toBe(true);
    expect(shouldIgnoreDirectory('node_modules')).toBe(true);
    expect(shouldIgnoreDirectory('dist')).toBe(true);
    expect(shouldIgnoreDirectory('build')).toBe(true);
    expect(shouldIgnoreDirectory('coverage')).toBe(true);
    expect(shouldIgnoreDirectory('.cache')).toBe(true);
    expect(shouldIgnoreDirectory('docs')).toBe(false);
  });

  it('normalizes path parts with forward slashes', () => {
    expect(normalizePath(['docs', 'guide.md'])).toBe('docs/guide.md');
    expect(normalizePath(['', 'docs/', '/api.md'])).toBe('docs/api.md');
  });

  it('sorts directories before files and alphabetically', () => {
    const sorted = sortFileEntries([
      { type: 'file', name: 'z.md', path: 'z.md' },
      { type: 'directory', name: 'docs', path: 'docs', children: [] },
      { type: 'file', name: 'a.md', path: 'a.md' },
    ]);

    expect(sorted.map((entry) => entry.name)).toEqual(['docs', 'a.md', 'z.md']);
  });

  it('selects README Markdown, README HTML, then index files, then sorted first document file', () => {
    const treeWithReadme: FileTreeNode[] = [
      { type: 'file', name: 'guide.md', path: 'guide.md' },
      { type: 'file', name: 'README.md', path: 'README.md' },
    ];
    const treeWithIndex: FileTreeNode[] = [
      { type: 'file', name: 'guide.md', path: 'guide.md' },
      { type: 'file', name: 'index.md', path: 'index.md' },
    ];
    const treeWithReadmeHtml: FileTreeNode[] = [
      { type: 'file', name: 'guide.html', path: 'guide.html' },
      { type: 'file', name: 'README.html', path: 'README.html' },
      { type: 'file', name: 'index.html', path: 'index.html' },
    ];
    const treeNested: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'api.html', path: 'docs/api.html' }],
      },
    ];
    const treeWithIndexHtml: FileTreeNode[] = [
      { type: 'file', name: 'guide.html', path: 'guide.html' },
      { type: 'file', name: 'index.html', path: 'index.html' },
    ];

    expect(selectDefaultDocument(treeWithReadme)).toBe('README.md');
    expect(selectDefaultDocument(treeWithReadmeHtml)).toBe('README.html');
    expect(selectDefaultDocument(treeWithIndex)).toBe('index.md');
    expect(selectDefaultDocument(treeWithIndexHtml)).toBe('index.html');
    expect(selectDefaultDocument(treeNested)).toBe('docs/api.html');
  });

  it('flattens Markdown files from a nested tree', () => {
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: 'api.md', path: 'docs/api.md' },
          { type: 'file', name: 'image.svg', path: 'docs/image.svg' },
        ],
      },
    ];

    expect(flattenMarkdownFiles(tree)).toEqual([
      { name: 'README.md', path: 'README.md' },
      { name: 'api.md', path: 'docs/api.md' },
    ]);
  });

  it('flattens readable document files from a nested tree', () => {
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'README.md', path: 'README.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: 'api.html', path: 'docs/api.html' },
          { type: 'file', name: 'image.svg', path: 'docs/image.svg' },
        ],
      },
    ];

    expect(flattenDocumentFiles(tree)).toEqual([
      { name: 'README.md', path: 'README.md' },
      { name: 'api.html', path: 'docs/api.html' },
    ]);
  });
});
