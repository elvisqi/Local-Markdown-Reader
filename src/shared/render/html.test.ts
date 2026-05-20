import { renderHtmlDocument } from './html';

describe('renderHtmlDocument', () => {
  it('sanitizes scripts and extracts outline metadata', async () => {
    const result = await renderHtmlDocument(
      '<!doctype html><html><head><title>Report</title><script>alert(1)</script></head><body><h1>Overview</h1><h2 id="details">Details</h2><p onclick="bad()">Text</p></body></html>',
    );

    expect(result.title).toBe('Report');
    expect(result.outline).toEqual([
      {
        id: 'overview',
        text: 'Overview',
        depth: 1,
        children: [{ id: 'details', text: 'Details', depth: 2, children: [] }],
      },
    ]);
    expect(result.html).toContain('<h1 id="overview">Overview</h1>');
    expect(result.html).not.toContain('Report');
    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('onclick');
  });

  it('drops arbitrary HTML classes so document content cannot reuse reader UI styles', async () => {
    const result = await renderHtmlDocument(
      '<h1 class="reader-toolbar table-fullscreen__overlay">Title</h1><pre><code class="language-js table-fullscreen__trigger">const a = 1;</code></pre>',
    );

    expect(result.html).toContain('<h1 id="title">Title</h1>');
    expect(result.html).toContain('<code class="language-js">');
    expect(result.html).not.toContain('reader-toolbar');
    expect(result.html).not.toContain('table-fullscreen__overlay');
    expect(result.html).not.toContain('table-fullscreen__trigger');
  });

  it('opens external links in a separate context', async () => {
    const result = await renderHtmlDocument('<a href="https://example.com">Example</a><a href="#local">Local</a>');

    expect(result.html).toContain('href="https://example.com"');
    expect(result.html).toContain('target="_blank"');
    expect(result.html).toContain('rel="noreferrer noopener"');
    expect(result.html).toContain('href="#local"');
  });
});
