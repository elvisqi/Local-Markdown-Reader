import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

describe('htmlPreviewSandbox', () => {
  const sandboxHtml = readFileSync(resolve(process.cwd(), 'html-preview-sandbox.html'), 'utf8');
  const sandboxScript = extractInlineSandboxScript(sandboxHtml);

  it('renders posted HTML into an isolated preview iframe so page scripts can run without sharing the sandbox page origin', async () => {
    const dom = createSandboxDom();

    dom.window.eval(sandboxScript);
    dom.renderHtml({
      html: '<!doctype html><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script>',
    });

    expect(dom.messages).toContainEqual({
      type: 'local-markdown-reader:html-preview-ready',
    });
    expect(dom.preview).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals');
    expect(dom.preview).not.toHaveAttribute('sandbox', expect.stringContaining('allow-same-origin'));
    expect(dom.preview.srcdoc).toContain('id="roleSelect"');

    const innerDom = new JSDOM(dom.preview.srcdoc, {
      url: 'https://preview.local/',
      runScripts: 'dangerously',
    });

    await new Promise<void>((resolve) => {
      innerDom.window.addEventListener('load', () => resolve(), { once: true });
    });

    expect(innerDom.window.document.querySelector('#roleSelect')?.textContent).toContain('管理层');
    innerDom.window.close();
  });

  it('removes CSP meta tags before rendering the isolated preview srcdoc', async () => {
    const dom = createSandboxDom();

    dom.window.eval(sandboxScript);
    dom.renderHtml({
      html: '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src none"></head><body><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script></body></html>',
    });

    expect(dom.preview.srcdoc).not.toMatch(/http-equiv=["']Content-Security-Policy["']/i);

    const innerDom = new JSDOM(dom.preview.srcdoc, {
      url: 'https://preview.local/',
      runScripts: 'dangerously',
    });

    await new Promise<void>((resolve) => {
      innerDom.window.addEventListener('load', () => resolve(), { once: true });
    });

    expect(innerDom.window.document.querySelector('#roleSelect')?.textContent).toContain('管理层');
    innerDom.window.close();
  });

  it('keeps the sandbox runtime inline so sandboxed pages do not need cross-origin module loading', () => {
    expect(sandboxHtml).not.toMatch(/<script[^>]+type="module"/i);
    expect(sandboxHtml).not.toMatch(/src=["'][^"']+htmlPreviewSandbox/i);
    expect(sandboxScript).toContain('local-markdown-reader:html-preview-ready');
  });

  it('keeps navigation authority in a token-protected isolated preview bridge', () => {
    const dom = createSandboxDom();

    dom.window.eval(sandboxScript);
    dom.renderHtml({
      html: '<!doctype html><a data-reader-link-id="link-1" href="./target.html">Target</a>',
      headingIds: ['title'],
    });
    const token = extractPreviewBridgeToken(dom.preview.srcdoc);

    dom.dispatchPreviewMessage({
      type: 'local-markdown-reader:navigate-html-link',
      linkId: 'link-1',
      token: 'stolen-token',
    });

    expect(dom.messages).not.toContainEqual({
      type: 'local-markdown-reader:navigate-html-link',
      linkId: 'link-1',
    });

    dom.dispatchPreviewMessage({
      type: 'local-markdown-reader:navigate-html-link',
      linkId: 'link-1',
      token,
    });

    expect(dom.messages).toContainEqual({
      type: 'local-markdown-reader:navigate-html-link',
      linkId: 'link-1',
    });
  });

  it('routes heading scroll through the isolated preview bridge', () => {
    const dom = createSandboxDom();
    const scrollTo = vi.fn();

    Object.defineProperty(dom.window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    dom.window.eval(sandboxScript);
    dom.renderHtml({
      html: '<!doctype html><h1>Intro</h1><h2>Details</h2>',
      headingIds: ['intro', 'details'],
    });
    const token = extractPreviewBridgeToken(dom.preview.srcdoc);

    dom.scrollToHeading('details');
    dom.dispatchPreviewMessage({
      type: 'local-markdown-reader:scroll-html-preview-target',
      top: 160,
      token,
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 160 });
  });

  it('updates active headings from token-protected preview bridge messages', () => {
    const dom = createSandboxDom();

    dom.window.eval(sandboxScript);
    dom.renderHtml({
      html: '<!doctype html><h1>Intro</h1><h2>Details</h2>',
      headingIds: ['intro', 'details'],
    });
    const token = extractPreviewBridgeToken(dom.preview.srcdoc);

    dom.messages.length = 0;
    dom.dispatchPreviewMessage({
      type: 'local-markdown-reader:active-html-heading',
      id: 'details',
      token,
    });

    expect(dom.messages).toContainEqual({
      type: 'local-markdown-reader:active-html-heading',
      id: 'details',
    });
  });

  it('sends sandbox page viewport updates to the isolated preview bridge', () => {
    const dom = createSandboxDom();
    const postMessage = vi.spyOn(dom.preview.contentWindow!, 'postMessage');

    dom.window.eval(sandboxScript);
    dom.renderHtml({
      html: '<!doctype html><h1>Intro</h1><h2>Details</h2>',
      headingIds: ['intro', 'details'],
    });
    vi.spyOn(dom.preview, 'getBoundingClientRect').mockReturnValue({
      top: -150,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: -150,
      toJSON: () => ({}),
    });

    dom.window.dispatchEvent(new dom.window.Event('scroll'));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'local-markdown-reader:update-html-preview-viewport',
        previewTop: -150,
      }),
      '*',
    );
  });
});

function extractInlineSandboxScript(html: string): string {
  const match = html.match(/<script>([\s\S]+)<\/script>/i);
  if (!match) {
    throw new Error('html-preview-sandbox.html does not contain an inline sandbox runtime script.');
  }

  return match[1];
}

function extractPreviewBridgeToken(srcdoc: string): string {
  const match = srcdoc.match(/"token":"([^"]+)"/);
  if (!match) {
    throw new Error('Preview bridge token was not embedded in the isolated srcdoc.');
  }

  return match[1];
}

function createSandboxDom() {
  const dom = new JSDOM('<!doctype html><body><iframe id="preview"></iframe></body>', {
    url: 'https://reader.local/html-preview-sandbox.html',
    runScripts: 'dangerously',
  });
  const messages: unknown[] = [];

  Object.defineProperty(dom.window, 'parent', {
    configurable: true,
    value: {
      postMessage: (message: unknown) => messages.push(message),
    },
  });

  const preview = dom.window.document.querySelector<HTMLIFrameElement>('#preview');
  if (!preview) {
    throw new Error('Missing preview iframe.');
  }

  return {
    window: dom.window,
    preview,
    messages,
    renderHtml: (payload: { html: string; headingIds?: string[] }) => {
      dom.window.dispatchEvent(
        new dom.window.MessageEvent('message', {
          source: dom.window.parent,
          data: {
            type: 'local-markdown-reader:render-html-preview',
            ...payload,
          },
        }),
      );
    },
    scrollToHeading: (id: string) => {
      dom.window.dispatchEvent(
        new dom.window.MessageEvent('message', {
          source: dom.window.parent,
          data: {
            type: 'local-markdown-reader:scroll-html-preview',
            id,
          },
        }),
      );
    },
    dispatchPreviewMessage: (data: Record<string, unknown>) => {
      dom.window.dispatchEvent(
        new dom.window.MessageEvent('message', {
          source: preview.contentWindow,
          data,
        }),
      );
    },
  };
}
