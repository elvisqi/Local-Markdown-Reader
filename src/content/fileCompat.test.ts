describe('fileCompat content script', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-markdown-reader-compatible');
    window.history.replaceState(null, '', '/Users/qiyu/Desktop/huge.md');
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends unavailable metadata instead of an empty inline source', async () => {
    await import('./fileCompat');

    document.querySelector('button')?.click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'openReader',
        sourceUrl: expect.stringContaining('huge.md'),
        source: undefined,
        sourceSize: 0,
        sourceAvailable: false,
      }),
    );
  });
});
