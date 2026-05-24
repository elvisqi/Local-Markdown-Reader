import { createHtmlPreviewDocument, resolveLocalAssetPath } from './htmlPreview';

describe('htmlPreview', () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  let objectUrlIndex = 0;
  let createdBlobs: Blob[];

  beforeEach(() => {
    objectUrlIndex = 0;
    createdBlobs = [];
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      createdBlobs.push(blob as Blob);
      objectUrlIndex += 1;
      return `blob:test-${objectUrlIndex}`;
    });
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it('rewrites local HTML resources to blob URLs and keeps scripts in the preview document', async () => {
    const files = new Map<string, File>([
      ['app.js', new File(['window.loaded = true'], 'app.js', { type: 'text/javascript' })],
      ['styles/site.css', new File(['body{background:url("../img/bg.png")}'], 'site.css', { type: 'text/css' })],
      ['img/bg.png', new File(['image'], 'bg.png', { type: 'image/png' })],
    ]);

    const preview = await createHtmlPreviewDocument(
      '<!doctype html><html><head><link rel="stylesheet" href="./styles/site.css"><script src="app.js"></script></head><body><img src="img/bg.png"></body></html>',
      'index.html',
      async (path) => files.get(path) ?? null,
    );

    expect(preview.url).toBe('blob:test-4');
    expect(preview.objectUrls).toEqual(['blob:test-1', 'blob:test-2', 'blob:test-3', 'blob:test-4']);
    const html = await createdBlobs.at(-1)?.text();
    expect(html).toContain('<script src="blob:test-1">');
    expect(html).toContain('<link rel="stylesheet" href="blob:test-3">');
    expect(html).toContain('<img src="blob:test-2">');
    expect(await createdBlobs[2].text()).toContain('url("blob:test-2")');
  });

  it('resolves relative asset paths against the current HTML file', () => {
    expect(resolveLocalAssetPath('../assets/app.js?v=1#main', 'docs/pages/report.html')).toBe('docs/assets/app.js');
    expect(resolveLocalAssetPath('/root.css', 'docs/pages/report.html')).toBe('root.css');
    expect(resolveLocalAssetPath('../../../README.md', 'docs/pages/report.html')).toBeNull();
    expect(resolveLocalAssetPath('https://example.com/app.js', 'docs/pages/report.html')).toBeNull();
    expect(resolveLocalAssetPath('data:image/png;base64,aaa', 'docs/pages/report.html')).toBeNull();
    expect(resolveLocalAssetPath('#section', 'docs/pages/report.html')).toBeNull();
  });

  it('rewrites local anchor links for sandbox-owned navigation without exposing a navigation secret', async () => {
    const preview = await createHtmlPreviewDocument(
      '<!doctype html><html><body><a href="./当前有效资产清单.html#main">当前有效资产清单</a><a href="./README.md">README</a><a href="/README.md">Root</a><a href="./image.png">Image</a><a href="#local">Local</a><a href="https://example.com">External</a></body></html>',
      '项目总览.html',
      async () => null,
      {
        sandboxPageUrl: 'chrome-extension://extension/html-preview-sandbox.html',
      },
    );

    expect(preview.html).toContain('data-reader-link-id="link-1"');
    expect(preview.html).toContain('data-reader-link-id="link-2"');
    expect(preview.html).toContain('data-reader-link-id="link-3"');
    expect(preview.navigationLinks).toEqual({
      'link-1': { path: '当前有效资产清单.html', hash: 'main' },
      'link-2': { path: 'README.md', hash: null },
      'link-3': { path: '项目总览.html', hash: 'local' },
    });
    expect(preview.html).not.toContain('data-reader-link-path');
    expect(preview.html).not.toContain('data-reader-link-hash');
    expect(preview.html).toContain('href="/README.md"');
    expect(preview.html).toContain('href="./image.png"');
    expect(preview.html).toContain('href="https://example.com"');
    expect(preview.html).not.toContain('htmlPreviewBridge.js');
    expect(preview.html).not.toContain('window.parent.postMessage');
  });

  it('removes document CSP meta tags from sandboxed HTML previews so page scripts can run', async () => {
    const preview = await createHtmlPreviewDocument(
      '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src none"></head><body><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script></body></html>',
      'critical_page_preview.html',
      async () => null,
      {
        sandboxPageUrl: 'chrome-extension://extension/html-preview-sandbox.html',
      },
    );

    expect(preview.html).not.toMatch(/http-equiv=["']Content-Security-Policy["']/i);
    expect(preview.html).toContain('document.getElementById("roleSelect").innerHTML');
  });

  it('uses an isolated data URL for HTML previews with executable inline scripts', async () => {
    const preview = await createHtmlPreviewDocument(
      '<!doctype html><html><body><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script></body></html>',
      'critical_page_preview.html',
      async () => null,
      {
        sandboxPageUrl: 'chrome-extension://extension/html-preview-sandbox.html',
      },
    );

    expect(preview.url).toBe('chrome-extension://extension/html-preview-sandbox.html');
    expect(preview.objectUrls).toEqual([]);
    expect(preview.html).toContain('document.getElementById("roleSelect").innerHTML');
    expect(preview.html).not.toContain('htmlPreviewBridge.js');
  });

  it('targets the sandbox renderer and preserves inline scripts for CSP-safe HTML previews', async () => {
    const preview = await createHtmlPreviewDocument(
      '<!doctype html><html><body><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>";</script></body></html>',
      'critical_page_preview.html',
      async () => null,
      {
        sandboxPageUrl: 'chrome-extension://extension/html-preview-sandbox.html',
      },
    );

    expect(preview.url).toBe('chrome-extension://extension/html-preview-sandbox.html');
    expect(preview.objectUrls).toEqual([]);
    expect(preview.html).toContain('document.getElementById("roleSelect").innerHTML');
    expect(preview.html).not.toContain('htmlPreviewBridge.js');
  });

  it('does not install the local navigation bridge for standalone HTML previews', async () => {
    const preview = await createHtmlPreviewDocument(
      '<!doctype html><html><body><a href="./README.md">README</a></body></html>',
      '项目总览.html',
    );

    const html = await createdBlobs.at(-1)?.text();

    expect(preview.navigationLinks).toEqual({});
    expect(html).not.toContain('data-reader-link-path');
    expect(html).not.toContain('htmlPreviewBridge.js');
  });
});
