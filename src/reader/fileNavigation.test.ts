import type { FileTreeNode } from '../shared/types';
import { selectSiblingDocumentNavigation } from './fileNavigation';

describe('selectSiblingDocumentNavigation', () => {
  const tree: FileTreeNode[] = [
    { type: 'file', name: 'README.md', path: 'README.md' },
    { type: 'file', name: 'overview.html', path: 'overview.html' },
    {
      type: 'directory',
      name: 'docs',
      path: 'docs',
      children: [
        { type: 'file', name: '01-intro.md', path: 'docs/01-intro.md' },
        { type: 'file', name: '02-design.md', path: 'docs/02-design.md' },
        { type: 'file', name: '03-api.md', path: 'docs/03-api.md' },
      ],
    },
    {
      type: 'directory',
      name: 'other',
      path: 'other',
      children: [{ type: 'file', name: 'notes.md', path: 'other/notes.md' }],
    },
  ];

  it('selects previous and next document files from the same folder', () => {
    expect(selectSiblingDocumentNavigation(tree, 'docs/02-design.md')).toEqual({
      previous: { name: '01-intro.md', path: 'docs/01-intro.md' },
      next: { name: '03-api.md', path: 'docs/03-api.md' },
    });
  });

  it('does not cross folder boundaries at the first or last sibling', () => {
    expect(selectSiblingDocumentNavigation(tree, 'docs/01-intro.md')).toEqual({
      previous: null,
      next: { name: '02-design.md', path: 'docs/02-design.md' },
    });
    expect(selectSiblingDocumentNavigation(tree, 'other/notes.md')).toEqual({
      previous: null,
      next: null,
    });
  });

  it('supports root-level document siblings', () => {
    expect(selectSiblingDocumentNavigation(tree, 'README.md')).toEqual({
      previous: null,
      next: { name: 'overview.html', path: 'overview.html' },
    });
  });

  it('returns empty navigation when the active path is missing', () => {
    expect(selectSiblingDocumentNavigation(tree, 'missing.md')).toEqual({
      previous: null,
      next: null,
    });
  });
});
