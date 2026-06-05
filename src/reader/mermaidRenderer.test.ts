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
    window.sessionStorage.clear();
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

  it('keeps zoom controls out of the inline Mermaid diagram view', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';

    await renderMermaidBlocks(root, api);

    const wrapper = root.querySelector<HTMLElement>('.mermaid-fullscreen');

    expect(wrapper).not.toHaveAttribute('data-mermaid-zoom');
    expect(root.querySelector('.mermaid-zoom__controls')).toBeNull();
  });

  it('adds zoom controls to fullscreen Mermaid diagrams', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';
    document.body.append(root);

    await renderMermaidBlocks(root, api);

    root.querySelector<HTMLButtonElement>('.mermaid-fullscreen__trigger')?.click();

    const dialog = document.querySelector<HTMLElement>('.mermaid-fullscreen__overlay')!;
    const wrapper = dialog.querySelector<HTMLElement>('.mermaid-fullscreen__body .mermaid-fullscreen');
    const svg = dialog.querySelector<SVGElement>('.mermaid-diagram svg');
    const zoomOut = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="out"]');
    const zoomIn = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="in"]');
    const reset = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="reset"]');
    const value = dialog.querySelector<HTMLElement>('.mermaid-zoom__value');

    expect(wrapper).toHaveAttribute('data-mermaid-zoom', '1');
    expect(svg?.style.width).toBe('100%');
    expect(zoomOut).toHaveAccessibleName('缩小图表');
    expect(zoomIn).toHaveAccessibleName('放大图表');
    expect(reset).toHaveAccessibleName('重置图表缩放');
    expect(value).toHaveTextContent('100%');

    document.querySelector<HTMLButtonElement>('.table-fullscreen__close')?.click();
  });

  it('fits tall fullscreen Mermaid diagrams to the available height by default', async () => {
    const api = createMermaidApi();
    api.render.mockResolvedValueOnce({
      svg: '<svg id="tall" role="img" viewBox="0 0 800 1600"><text>tall diagram</text></svg>',
      diagramType: 'flowchart',
    });
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    getBoundingClientRect.mockImplementation(function getMockRect(this: HTMLElement) {
      if (this.classList.contains('mermaid-diagram')) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 400,
          right: 800,
          width: 800,
          height: 400,
          toJSON: () => ({}),
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">graph TD\nA-->B</code></pre>';
    document.body.append(root);

    await renderMermaidBlocks(root, api);

    root.querySelector<HTMLButtonElement>('.mermaid-fullscreen__trigger')?.click();

    const dialog = document.querySelector<HTMLElement>('.mermaid-fullscreen__overlay')!;
    const wrapper = dialog.querySelector<HTMLElement>('.mermaid-fullscreen__body .mermaid-fullscreen')!;
    const svg = dialog.querySelector<SVGElement>('.mermaid-diagram svg')!;
    const value = dialog.querySelector<HTMLElement>('.mermaid-zoom__value')!;

    expect(wrapper).toHaveAttribute('data-mermaid-zoom', '0.25');
    expect(svg.style.width).toBe('25%');
    expect(value).toHaveTextContent('25%');

    document.querySelector<HTMLButtonElement>('.table-fullscreen__close')?.click();
    getBoundingClientRect.mockRestore();
  });

  it('updates fullscreen Mermaid diagram size with clamped zoom controls', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';
    document.body.append(root);

    await renderMermaidBlocks(root, api);

    root.querySelector<HTMLButtonElement>('.mermaid-fullscreen__trigger')?.click();

    const dialog = document.querySelector<HTMLElement>('.mermaid-fullscreen__overlay')!;
    const wrapper = dialog.querySelector<HTMLElement>('.mermaid-fullscreen__body .mermaid-fullscreen')!;
    const svg = dialog.querySelector<SVGElement>('.mermaid-diagram svg')!;
    const zoomOut = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="out"]')!;
    const zoomIn = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="in"]')!;
    const reset = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="reset"]')!;
    const value = dialog.querySelector<HTMLElement>('.mermaid-zoom__value')!;

    for (let index = 0; index < 4; index += 1) {
      zoomOut.click();
    }

    expect(wrapper).toHaveAttribute('data-mermaid-zoom', '0.1');
    expect(svg.style.width).toBe('10%');
    expect(value).toHaveTextContent('10%');
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).not.toBeDisabled();

    for (let index = 0; index < 20; index += 1) {
      zoomIn.click();
    }

    expect(wrapper).toHaveAttribute('data-mermaid-zoom', '5');
    expect(svg.style.width).toBe('500%');
    expect(value).toHaveTextContent('500%');
    expect(zoomIn).toBeDisabled();
    expect(zoomOut).not.toBeDisabled();

    reset.click();

    expect(wrapper).toHaveAttribute('data-mermaid-zoom', '1');
    expect(svg.style.width).toBe('100%');
    expect(value).toHaveTextContent('100%');
    expect(zoomOut).not.toBeDisabled();
    expect(zoomIn).not.toBeDisabled();

    document.querySelector<HTMLButtonElement>('.table-fullscreen__close')?.click();
  });

  it('drags fullscreen Mermaid diagrams and resets their position', async () => {
    const api = createMermaidApi();
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">graph LR\nA-->B</code></pre>';
    document.body.append(root);

    await renderMermaidBlocks(root, api);

    root.querySelector<HTMLButtonElement>('.mermaid-fullscreen__trigger')?.click();

    const dialog = document.querySelector<HTMLElement>('.mermaid-fullscreen__overlay')!;
    const wrapper = dialog.querySelector<HTMLElement>('.mermaid-fullscreen__body .mermaid-fullscreen')!;
    const svg = dialog.querySelector<SVGElement>('.mermaid-diagram svg')!;
    const reset = dialog.querySelector<HTMLButtonElement>('.mermaid-zoom__button[data-mermaid-zoom-action="reset"]')!;

    svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 30, pointerId: 1 }));
    svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 65, clientY: 70, pointerId: 1 }));
    svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 65, clientY: 70, pointerId: 1 }));

    expect(wrapper).toHaveAttribute('data-mermaid-pan-x', '45');
    expect(wrapper).toHaveAttribute('data-mermaid-pan-y', '40');
    expect(svg.style.transform).toBe('translate(45px, 40px)');

    reset.click();

    expect(wrapper).toHaveAttribute('data-mermaid-pan-x', '0');
    expect(wrapper).toHaveAttribute('data-mermaid-pan-y', '0');
    expect(svg.style.transform).toBe('translate(0px, 0px)');

    document.querySelector<HTMLButtonElement>('.table-fullscreen__close')?.click();
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

  it('reloads the reader once when Mermaid dynamic diagram chunks are stale', async () => {
    const api = createMermaidApi();
    const reloadPage = vi.fn();
    const storage = window.sessionStorage;
    const staleChunkUrl = 'chrome-extension://reader/assets/flowDiagram-old.js';
    api.render.mockRejectedValueOnce(new TypeError(`Failed to fetch dynamically imported module: ${staleChunkUrl}`));
    const root = document.createElement('div');
    root.innerHTML = '<pre><code class="language-mermaid">flowchart TD\nA-->B</code></pre>';

    await renderMermaidBlocks(root, api, { reloadPage, storage });

    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(storage.getItem(`localMarkdownReader.mermaidDynamicImportReload.${staleChunkUrl}`)).toBe('true');
    expect(root.querySelector('.mermaid-diagram__error')).toBeNull();
    expect(root.querySelector('pre')).toHaveTextContent('flowchart TD');
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
