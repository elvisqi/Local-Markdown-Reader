import type { RenderResult } from '../shared/types';

type ReloadCurrentDocumentOptions = {
  directoryHandle: FileSystemDirectoryHandle | null;
  activePath: string | null;
  scrollY: number;
  readDocumentFile: (handle: FileSystemDirectoryHandle, path: string) => Promise<string>;
  renderDocument: (source: string) => Promise<RenderResult>;
  setMarkdown: (markdown: string) => void;
  setRendered: (rendered: RenderResult) => void;
  setStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
  scrollTo: (options: ScrollToOptions) => void;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
};

export async function reloadCurrentDocument({
  directoryHandle,
  activePath,
  scrollY,
  readDocumentFile,
  renderDocument,
  setMarkdown,
  setRendered,
  setStatus,
  setError,
  scrollTo,
  requestAnimationFrame,
}: ReloadCurrentDocumentOptions): Promise<void> {
  if (!directoryHandle || !activePath) {
    return;
  }

  setError(null);
  setStatus(`正在重载 ${activePath}`);

  try {
    const source = await readDocumentFile(directoryHandle, activePath);
    const result = await renderDocument(source);

    setMarkdown(source);
    setRendered(result);
    requestAnimationFrame(() => {
      scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    });
    setStatus(null);
  } catch (err) {
    setStatus(null);
    setError(err instanceof Error ? err.message : `无法重载 ${activePath}。`);
  }
}
