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

  it('classifies parent directory links that escape the authorized root as external', () => {
    expect(resolveMarkdownHref('../../../README.md', 'docs/pages/report.md')).toEqual({
      kind: 'external',
      href: '../../../README.md',
    });
  });

  it('decodes hash fragments on relative document links', () => {
    expect(resolveMarkdownHref('../docs/api.md#%E5%AE%89%E8%A3%85', 'guides/intro.md')).toEqual({
      kind: 'document',
      path: 'docs/api.md',
      hash: '安装',
    });
  });

  it('decodes URL-encoded path segments on relative document links', () => {
    expect(resolveMarkdownHref('%E4%B8%9A%E5%8A%A1%E9%9C%80%E6%B1%82.md', 'README.md')).toEqual({
      kind: 'document',
      path: '业务需求.md',
      hash: null,
    });
  });

  it('keeps malformed hash fragments without throwing', () => {
    expect(resolveMarkdownHref('#bad%zz', 'docs/guide.md')).toEqual({
      kind: 'hash',
      path: 'docs/guide.md',
      hash: 'bad%zz',
    });
    expect(resolveMarkdownHref('../docs/api.md#bad%zz', 'guides/intro.md')).toEqual({
      kind: 'document',
      path: 'docs/api.md',
      hash: 'bad%zz',
    });
  });

  it('classifies root-relative document paths as external', () => {
    expect(resolveMarkdownHref('/docs/api.md', 'README.md')).toEqual({
      kind: 'external',
      href: '/docs/api.md',
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
