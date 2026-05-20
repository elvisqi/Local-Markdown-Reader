import { reloadCurrentDocument } from './currentDocumentReload';

describe('reloadCurrentDocument', () => {
  it('re-reads the active document and restores the scroll position after rendering', async () => {
    const readDocumentFile = vi.fn(async () => '# Updated');
    const renderDocument = vi.fn(async () => ({
      html: '<h1 id="updated">Updated</h1>',
      outline: [{ id: 'updated', text: 'Updated', depth: 1, children: [] }],
      title: 'Updated',
      links: [],
      diagnostics: [],
    }));
    const setMarkdown = vi.fn();
    const setRendered = vi.fn();
    const setStatus = vi.fn();
    const setError = vi.fn();
    const scrollTo = vi.fn();
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    await reloadCurrentDocument({
      directoryHandle: { kind: 'directory', name: 'docs' } as FileSystemDirectoryHandle,
      activePath: 'README.md',
      scrollY: 480,
      readDocumentFile,
      renderDocument,
      setMarkdown,
      setRendered,
      setStatus,
      setError,
      scrollTo,
      requestAnimationFrame,
    });

    expect(readDocumentFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'docs' }), 'README.md');
    expect(renderDocument).toHaveBeenCalledWith('# Updated');
    expect(setMarkdown).toHaveBeenCalledWith('# Updated');
    expect(setRendered).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 480, left: 0, behavior: 'instant' });
    expect(setStatus).toHaveBeenLastCalledWith(null);
    expect(setError).toHaveBeenCalledWith(null);
  });
});
