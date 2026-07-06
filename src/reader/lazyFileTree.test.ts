import type { LazyFileTreeNode } from '../shared/types';
import {
  clearDirectoryError,
  createEmptyLazyFileTree,
  markDirectoryLoading,
  pruneExpandedPaths,
  replaceDirectoryChildren,
  selectDirectoryNode,
  selectLoadedDocumentExists,
  upsertLoadedPath,
} from './lazyFileTree';

const rootChildren: LazyFileTreeNode[] = [
  { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
  { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
];

describe('lazyFileTree', () => {
  it('replaces root children without losing directory metadata', () => {
    const tree = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);

    expect(tree.nodes).toEqual(rootChildren);
    expect(tree.loadedDirectoryPaths).toContain('');
  });

  it('marks a directory loading and then loaded with children', () => {
    const withRoot = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
    const withExpanded = { ...withRoot, expandedPaths: new Set(['docs']) };
    const loading = markDirectoryLoading(withExpanded, 'docs');

    expect(selectDirectoryNode(loading.nodes, 'docs')).toMatchObject({ loadState: 'loading' });

    const loaded = replaceDirectoryChildren(loading, 'docs', [
      { id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' },
    ]);

    expect(selectDirectoryNode(loaded.nodes, 'docs')).toMatchObject({
      loadState: 'loaded',
      children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
    });
    expect([...loaded.expandedPaths]).toEqual(['docs']);
  });

  it('can upsert loaded ancestors for a remembered document path', () => {
    const tree = upsertLoadedPath(createEmptyLazyFileTree(), 'docs/guides/install.md', [
      {
        path: '',
        children: [{ id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs',
        children: [{ id: 'docs/guides', type: 'directory', name: 'guides', path: 'docs/guides', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs/guides',
        children: [{ id: 'docs/guides/install.md', type: 'file', name: 'install.md', path: 'docs/guides/install.md' }],
      },
    ]);

    expect(selectLoadedDocumentExists(tree.nodes, 'docs/guides/install.md')).toBe(true);
    expect([...tree.expandedPaths]).toEqual(['docs', 'docs/guides']);
  });

  it('clears a directory error without clearing children', () => {
    const withRoot = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
    const loading = markDirectoryLoading(withRoot, 'docs');
    const cleared = clearDirectoryError(loading, 'docs');

    expect(selectDirectoryNode(cleared.nodes, 'docs')).toMatchObject({ loadState: 'unloaded' });
  });

  it('prunes expanded paths that no longer exist after reload', () => {
    const withRoot = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
    const expanded = {
      ...withRoot,
      expandedPaths: new Set(['docs', 'missing', 'docs/missing']),
    };

    expect([...pruneExpandedPaths(expanded).expandedPaths]).toEqual(['docs']);
  });
});
