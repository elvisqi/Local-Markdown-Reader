import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { RenderedMarkdownContent } from './RenderedMarkdownContent';
import * as mermaidRenderer from './mermaidRenderer';

function Host() {
  const [tick, setTick] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setTick((current) => current + 1)}>
        rerender {tick}
      </button>
      <RenderedMarkdownContent html='<p>First <span data-marker="hit">match</span></p>' mermaidEnabled />
    </>
  );
}

describe('RenderedMarkdownContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps rendered markdown DOM stable across unrelated parent rerenders', async () => {
    const user = userEvent.setup();
    const { container } = render(<Host />);
    const firstMatchNode = container.querySelector('[data-marker="hit"]');

    await user.click(screen.getByRole('button', { name: /rerender/i }));

    expect(container.querySelector('[data-marker="hit"]')).toBe(firstMatchNode);
  });

  it('renders Mermaid blocks after markdown HTML is mounted', () => {
    const renderMermaidBlocks = vi.spyOn(mermaidRenderer, 'renderMermaidBlocks').mockResolvedValue(undefined);

    const { container } = render(
      <RenderedMarkdownContent html='<pre><code class="language-mermaid">graph LR&#10;A--&gt;B</code></pre>' mermaidEnabled />,
    );

    expect(renderMermaidBlocks).toHaveBeenCalledWith(container.firstElementChild);
  });

  it('skips Mermaid rendering when disabled', () => {
    const renderMermaidBlocks = vi.spyOn(mermaidRenderer, 'renderMermaidBlocks').mockResolvedValue(undefined);

    render(<RenderedMarkdownContent html='<pre><code class="language-mermaid">graph LR&#10;A--&gt;B</code></pre>' mermaidEnabled={false} />);

    expect(renderMermaidBlocks).not.toHaveBeenCalled();
  });
});
