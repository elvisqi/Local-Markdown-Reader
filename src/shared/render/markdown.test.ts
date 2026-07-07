import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders GFM tables', async () => {
    const result = await renderMarkdown('| A | B |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |');

    expect(result.html).toContain('<table class="markdown-table">');
    expect(result.html).toContain('class="table-fullscreen"');
    expect(result.html).toContain('class="table-fullscreen__table"');
    expect(result.html).toContain('class="table-fullscreen__row-count"');
    expect(result.html).toContain('2 行');
    expect(result.html.indexOf('table-fullscreen__row-count')).toBeLessThan(result.html.indexOf('table-fullscreen__trigger'));
    expect(result.html).toContain('class="table-fullscreen__trigger"');
    expect(result.html).toContain('aria-label="最大化表格"');
  });

  it('renders task list checkboxes', async () => {
    const result = await renderMarkdown('- [x] Done\n- [ ] Open');

    expect(result.html).toContain('type="checkbox"');
    expect(result.html).toContain('checked');
  });

  it('extracts YAML frontmatter title and removes frontmatter from HTML', async () => {
    const result = await renderMarkdown('---\ntitle: Example Doc\n---\n\n# Heading');

    expect(result.title).toBe('Example Doc');
    expect(result.html).not.toContain('title: Example Doc');
    expect(result.html).toContain('Heading');
  });

  it('creates nested outline entries with stable slugs', async () => {
    const result = await renderMarkdown('# Intro\n\n## Install\n\n### CLI\n\n## Usage');

    expect(result.outline).toEqual([
      {
        id: 'intro',
        text: 'Intro',
        depth: 1,
        children: [
          {
            id: 'install',
            text: 'Install',
            depth: 2,
            children: [
              {
                id: 'cli',
                text: 'CLI',
                depth: 3,
                children: [],
              },
            ],
          },
          {
            id: 'usage',
            text: 'Usage',
            depth: 2,
            children: [],
          },
        ],
      },
    ]);
    expect(result.html).toContain('id="intro"');
  });

  it('keeps rendered heading text from becoming a same-page link', async () => {
    const result = await renderMarkdown('# Intro');

    expect(result.html).toContain('<h1 id="intro" class="markdown-heading markdown-heading--h1">Intro</h1>');
    expect(result.html).not.toContain('href="#intro"');
  });

  it('creates unique slugs for duplicate headings', async () => {
    const result = await renderMarkdown('# API\n\n# API');

    expect(result.outline.map((item) => item.id)).toEqual(['api', 'api-1']);
  });

  it('keeps Mermaid fenced blocks detectable', async () => {
    const result = await renderMarkdown('```mermaid\ngraph LR\nA-->B\n```');

    expect(result.html).toContain('language-mermaid');
  });

  it('collects relative Markdown links', async () => {
    const result = await renderMarkdown('[Guide](docs/guide.md#intro)');

    expect(result.links).toEqual([{ href: 'docs/guide.md#intro', text: 'Guide' }]);
  });

  it('renders chunk markdown with expensive decorations disabled', async () => {
    const result = await renderMarkdown('# Chunk', { chunkMode: true });

    expect(result.html).toContain('<h1 id="chunk" class="markdown-heading markdown-heading--h1">Chunk</h1>');
    expect(result.html).not.toContain('href="#chunk"');
  });

  it('adds semantic classes for theme CSS hooks', async () => {
    const result = await renderMarkdown([
      '# Heading',
      '',
      'Paragraph with [external](https://example.com) and #theme tags.',
      '',
      '> Quote',
      '',
      '- [x] Done',
      '- [ ] Open',
      '',
      '```ts',
      'const reader = "focused";',
      '```',
      '',
      '| Name | State |',
      '| --- | --- |',
      '| Theme | Ready |',
    ].join('\n'));

    expect(result.html).toContain('class="markdown-heading markdown-heading--h1"');
    expect(result.html).toContain('class="markdown-paragraph"');
    expect(result.html).toContain('class="markdown-link markdown-link--external"');
    expect(result.html).toContain('class="markdown-tag" data-tag="theme"');
    expect(result.html).toContain('class="markdown-quote"');
    expect(result.html).toMatch(/class="[^"]*markdown-task[^"]*markdown-task--checked/);
    expect(result.html).toMatch(/class="[^"]*markdown-task[^"]*markdown-task--open/);
    expect(result.html).toContain('class="markdown-code-block"');
    expect(result.html).toContain('class="language-ts markdown-code markdown-code--block"');
    expect(result.html).toContain('class="markdown-table"');
    expect(result.html).toContain('class="markdown-table-cell markdown-table-cell--head"');
    expect(result.html).toContain('class="markdown-table-cell"');
  });

  it('renders Obsidian callouts with semantic theme hooks', async () => {
    const result = await renderMarkdown('> [!tip]+ Custom title\n> This is content\n>\n> - item');

    expect(result.html).toContain('class="markdown-quote callout callout-tip"');
    expect(result.html).toContain('data-callout="tip"');
    expect(result.html).toContain('data-callout-fold="+"');
    expect(result.html).toContain('<div class="callout-title">Custom title</div>');
    expect(result.html).toContain('<div class="callout-content">');
    expect(result.html).not.toContain('[!tip]');
    expect(result.html).toContain('This is content');
    expect(result.html).toContain('<li class="markdown-list-item">item</li>');
  });
});
