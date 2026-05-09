import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders GFM tables', async () => {
    const result = await renderMarkdown('| A | B |\n| - | - |\n| 1 | 2 |');

    expect(result.html).toContain('<table>');
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
});
