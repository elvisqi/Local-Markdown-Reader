import type { FileTreeNode, LazyFileTreeNode } from './types';
import {
  analyzeDocumentTree,
  flattenDocumentFiles,
  flattenMarkdownFiles,
  getDocumentFileKind,
  isHtmlFile,
  isMarkdownFile,
  isReadableDocumentFile,
  normalizePath,
  selectDefaultDocument,
  selectDefaultLoadedDocument,
  selectPathAncestors,
  selectRememberedLoadedDocument,
  shouldIgnoreDirectory,
  sortFileEntries,
  sortLazyFileTreeNodes,
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

  it('accepts JSON as a readable document type', () => {
    expect(isReadableDocumentFile('data.json')).toBe(true);
    expect(getDocumentFileKind('data.json')).toBe('json');
    expect(getDocumentFileKind('DATA.JSON')).toBe('json');
  });

  it('accepts YAML as a readable document type', () => {
    expect(isReadableDocumentFile('config.yaml')).toBe(true);
    expect(isReadableDocumentFile('compose.yml')).toBe(true);
    expect(getDocumentFileKind('config.yaml')).toBe('yaml');
    expect(getDocumentFileKind('COMPOSE.YML')).toBe('yaml');
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
    const treeWithIndexJson: FileTreeNode[] = [
      { type: 'file', name: 'config.json', path: 'config.json' },
      { type: 'file', name: 'index.json', path: 'index.json' },
    ];
    const treeWithIndexYaml: FileTreeNode[] = [
      { type: 'file', name: 'config.yaml', path: 'config.yaml' },
      { type: 'file', name: 'index.yml', path: 'index.yml' },
    ];

    expect(selectDefaultDocument(treeWithReadme)).toBe('README.md');
    expect(selectDefaultDocument(treeWithReadmeHtml)).toBe('README.html');
    expect(selectDefaultDocument(treeWithIndex)).toBe('index.md');
    expect(selectDefaultDocument(treeWithIndexHtml)).toBe('index.html');
    expect(selectDefaultDocument(treeWithIndexJson)).toBe('index.json');
    expect(selectDefaultDocument(treeWithIndexYaml)).toBe('index.yml');
    expect(selectDefaultDocument(treeNested)).toBe('docs/api.html');
  });

  it('analyzes document trees once for files, defaults, and path lookup', () => {
    const tree: FileTreeNode[] = [
      { type: 'file', name: 'z.md', path: 'z.md' },
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { type: 'file', name: 'guide.html', path: 'docs/guide.html' },
          { type: 'file', name: 'README.md', path: 'docs/README.md' },
          { type: 'file', name: 'image.svg', path: 'docs/image.svg' },
        ],
      },
    ];

    const analysis = analyzeDocumentTree(tree, 'docs/guide.html');

    expect(analysis.files).toEqual([
      { name: 'guide.html', path: 'docs/guide.html' },
      { name: 'README.md', path: 'docs/README.md' },
      { name: 'z.md', path: 'z.md' },
    ]);
    expect(analysis.defaultPath).toBe('docs/README.md');
    expect(analysis.containsPath).toBe(true);
    expect(analyzeDocumentTree(tree, 'missing.md').containsPath).toBe(false);
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
          { type: 'file', name: 'data.json', path: 'docs/data.json' },
          { type: 'file', name: 'image.svg', path: 'docs/image.svg' },
        ],
      },
    ];

    expect(flattenDocumentFiles(tree)).toEqual([
      { name: 'README.md', path: 'README.md' },
      { name: 'api.html', path: 'docs/api.html' },
      { name: 'data.json', path: 'docs/data.json' },
    ]);
  });
});

describe('lazy file tree helpers', () => {
  it('selects directory ancestors for a document path', () => {
    expect(selectPathAncestors('docs/guides/install.md')).toEqual(['docs', 'docs/guides']);
    expect(selectPathAncestors('README.md')).toEqual([]);
  });

  it('sorts lazy directories before files using existing name collation', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'z.md', type: 'file', name: 'z.md', path: 'z.md' },
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
      { id: 'a.md', type: 'file', name: 'a.md', path: 'a.md' },
    ];

    expect(sortLazyFileTreeNodes(nodes).map((node) => node.name)).toEqual(['docs', 'a.md', 'z.md']);
  });

  it('selects a default file from loaded lazy nodes only', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ];

    expect(selectDefaultLoadedDocument(nodes)).toBe('README.md');
  });

  it('keeps a remembered file when that file exists in loaded lazy nodes', () => {
    const nodes: LazyFileTreeNode[] = [
      {
        id: 'docs',
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
        loadState: 'loaded',
      },
    ];

    expect(selectRememberedLoadedDocument(nodes, 'docs/guide.md')).toBe('docs/guide.md');
  });

  it('falls back to the default loaded document when the remembered file is missing', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ];

    expect(selectRememberedLoadedDocument(nodes, 'missing.md')).toBe('README.md');
  });
});
