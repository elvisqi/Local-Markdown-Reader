import { resolveMarkdownHref } from './links';

describe('resolveMarkdownHref', () => {
  it('resolves a relative Markdown file and hash', () => {
    expect(resolveMarkdownHref('docs/api.md#install', 'README.md')).toEqual({
      kind: 'document',
      path: 'docs/api.md',
      hash: 'install',
    });
  });

  it('resolves a relative HTML file and hash', () => {
    expect(resolveMarkdownHref('docs/report.html#install', 'README.md')).toEqual({
      kind: 'document',
      path: 'docs/report.html',
      hash: 'install',
    });
  });

  it('resolves same-file hash links', () => {
    expect(resolveMarkdownHref('#intro', 'docs/guide.md')).toEqual({
      kind: 'hash',
      path: 'docs/guide.md',
      hash: 'intro',
    });
  });

  it('normalizes parent directory segments', () => {
    expect(resolveMarkdownHref('../README.md', 'docs/guide.md')).toEqual({
      kind: 'document',
      path: 'README.md',
      hash: null,
    });
  });

  it('classifies non-Markdown and absolute links as external', () => {
    expect(resolveMarkdownHref('assets/logo.svg', 'README.md')).toEqual({
      kind: 'external',
      href: 'assets/logo.svg',
    });
    expect(resolveMarkdownHref('https://example.com/readme.md', 'README.md')).toEqual({
      kind: 'external',
      href: 'https://example.com/readme.md',
    });
  });
});
