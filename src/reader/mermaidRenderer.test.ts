import {
  renderMermaidBlocks,
  resetMermaidRendererForTests,
  type MermaidRendererApi,
} from './mermaidRenderer';

type MockMermaidApi = {
  initialize: MermaidRendererApi['initialize'] & ReturnType<typeof vi.fn>;
  render: MermaidRendererApi['render'] & ReturnType<typeof vi.fn>;
};

function createMermaidApi(): MockMermaidApi {
  return {
    initialize: vi.fn() as MockMermaidApi['initialize'],
    render: vi.fn(async (id: string, source: string) => ({
      svg: `<svg id="${id}" role="img"><text>${source}</text></svg>`,
      diagramType: 'flowchart',
    })) as MockMermaidApi['render'],
  };
}

describe('renderMermaidBlocks', () => {
  beforeEach(() => {
    resetMermaidRendererForTests();
    document.body.innerHTML = '';
  });

  it('renders Mermaid fenced code blocks into SVG diagrams', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';

    await renderMermaidBlocks(root, api);

    expect(api.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        startOnLoad: false,
      }),
    );
    expect(api.render).toHaveBeenCalledWith('mermaid-diagram-1', 'graph LR\nA-->B');
    expect(root.querySelector('pre')).toBeNull();
    expect(root.querySelector('.mermaid-diagram')).toHaveClass('is-rendered');
    expect(root.querySelector('svg')).toHaveTextContent('graph LR A-->B');
  });

  it('adds an outside fullscreen button to rendered Mermaid diagrams', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.className = 'reader-app theme-dark style-paper width-wide';
    root.innerHTML = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';
    document.body.append(root);

    await renderMermaidBlocks(root, api);

    const button = root.querySelector<HTMLButtonElement>('.mermaid-fullscreen__trigger');

    expect(root.querySelector('.mermaid-fullscreen')).not.toBeNull();
    expect(button).not.toBeNull();
    expect(button).toHaveAttribute('aria-label', '最大化图表');
    expect(button).toHaveAttribute('title', '最大化图表');
    expect(button?.textContent).toBe('');
    expect(button?.closest('.mermaid-fullscreen__actions')).not.toBeNull();

    button?.click();

    const dialog = document.querySelector<HTMLElement>('.mermaid-fullscreen__overlay');
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-label', '最大化图表');
    expect(dialog).toHaveClass('reader-app');
    expect(dialog).toHaveClass('theme-dark');
    expect(dialog).toHaveClass('style-paper');
    expect(dialog).toHaveClass('width-wide');
    expect(dialog).toHaveTextContent('graph LR A-->B');
    expect(dialog?.querySelector('.mermaid-fullscreen__trigger')).toBeNull();

    document.querySelector<HTMLButtonElement>('.table-fullscreen__close')?.click();

    expect(document.querySelector('.mermaid-fullscreen__overlay')).toBeNull();
  });

  it('keeps the code block visible when Mermaid rendering fails', async () => {
    const api = createMermaidApi();
    api.render.mockRejectedValueOnce(new Error('Invalid Mermaid'));
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">bad diagram</code></pre>';

    await renderMermaidBlocks(root, api);

    expect(root.querySelector('.mermaid-diagram')).toHaveClass('has-error');
    expect(root.querySelector('.mermaid-diagram__error')).toHaveTextContent('Mermaid 图表渲染失败');
    expect(root.querySelector('pre')).toHaveTextContent('bad diagram');
  });

  it('does not initialize Mermaid when no Mermaid code blocks exist', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-ts">const value = 1;</code></pre>';

    await renderMermaidBlocks(root, api);

    expect(api.initialize).not.toHaveBeenCalled();
    expect(api.render).not.toHaveBeenCalled();
    expect(root.querySelector('pre')).toHaveTextContent('const value = 1;');
  });
});
