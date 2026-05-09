import type { FileTreeNode } from './types';
import {
  flattenMarkdownFiles,
  isMarkdownFile,
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

  it('selects README, then index, then sorted first Markdown file', () => {
    const treeWithReadme: FileTreeNode[] = [
      { type: 'file', name: 'guide.md', path: 'guide.md' },
      { type: 'file', name: 'README.md', path: 'README.md' },
    ];
    const treeWithIndex: FileTreeNode[] = [
      { type: 'file', name: 'guide.md', path: 'guide.md' },
      { type: 'file', name: 'index.md', path: 'index.md' },
    ];
    const treeNested: FileTreeNode[] = [
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'api.md', path: 'docs/api.md' }],
      },
    ];

    expect(selectDefaultDocument(treeWithReadme)).toBe('README.md');
    expect(selectDefaultDocument(treeWithIndex)).toBe('index.md');
    expect(selectDefaultDocument(treeNested)).toBe('docs/api.md');
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
});
