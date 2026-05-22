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
    expect(resolveLocalAssetPath('https://example.com/app.js', 'docs/pages/report.html')).toBeNull();
    expect(resolveLocalAssetPath('data:image/png;base64,aaa', 'docs/pages/report.html')).toBeNull();
    expect(resolveLocalAssetPath('#section', 'docs/pages/report.html')).toBeNull();
  });
});
