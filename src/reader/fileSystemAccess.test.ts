import {
  openMarkdownFile,
  openDocumentFile,
  readMarkdownFile,
  readMarkdownFileSlice,
  readMarkdownFileSnapshot,
  scanMarkdownDirectory,
} from './fileSystemAccess';

type FakeFileHandle = {
  kind: 'file';
  name: string;
  getFile: () => Promise<{ text: () => Promise<string>; type: string; name?: string; size?: number; lastModified?: number; slice?: File['slice'] }>;
};

type FakeDirectoryHandle = {
  kind: 'directory';
  name: string;
  entries: () => AsyncIterableIterator<[string, FakeDirectoryHandle | FakeFileHandle]>;
};

function file(name: string, text = ''): FakeFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => ({
      text: async () => text,
      type: 'text/markdown',
    }),
  };
}

function realFile(name: string, text: string): FakeFileHandle {
  const value = new File([text], name, {
    type: 'text/markdown',
    lastModified: 1700000000000,
  });

  return {
    kind: 'file',
    name,
    getFile: async () => value,
  };
}

function dir(name: string, entries: Array<FakeDirectoryHandle | FakeFileHandle>): FakeDirectoryHandle {
  return {
    kind: 'directory',
    name,
    async *entries() {
      for (const entry of entries) {
        yield [entry.name, entry];
      }
    },
  };
}

describe('fileSystemAccess', () => {
  it('recursively scans Markdown and HTML files and ignores generated directories', async () => {
    const root = dir('root', [
      file('README.md'),
      file('report.html'),
      file('component.mdx'),
      dir('docs', [file('guide.md'), file('image.svg')]),
      dir('node_modules', [file('ignored.md')]),
      dir('.git', [file('ignored.md')]),
    ]);

    await expect(scanMarkdownDirectory(root as unknown as FileSystemDirectoryHandle)).resolves.toEqual([
      {
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
      },
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: 'report.html', path: 'report.html' },
    ]);
  });

  it('reads a nested Markdown file by path', async () => {
    const root = dir('root', [dir('docs', [file('guide.md', '# Guide')])]);

    await expect(readMarkdownFile(root as unknown as FileSystemDirectoryHandle, 'docs/guide.md')).resolves.toBe(
      '# Guide',
    );
  });

  it('reads a markdown file snapshot without reading the full text', async () => {
    const root = dir('root', [realFile('big.md', '# Big\ncontent')]);

    const snapshot = await readMarkdownFileSnapshot(root as unknown as FileSystemDirectoryHandle, 'big.md');

    expect(snapshot).toMatchObject({
      path: 'big.md',
      name: 'big.md',
      size: 13,
      type: 'text/markdown',
      lastModified: 1700000000000,
    });
    expect(snapshot.file).toBeInstanceOf(File);
  });

  it('reads a byte slice from a markdown File', async () => {
    const source = new File(['line 1\nline 2\nline 3'], 'big.md', { type: 'text/markdown' });

    await expect(readMarkdownFileSlice(source, 7, 13)).resolves.toBe('line 2');
  });

  it('opens a standalone document file through the file picker', async () => {
    const selected = new File(['<h1>Standalone</h1>'], 'standalone.html', {
      type: 'text/html',
      lastModified: 1700000000000,
    });
    const getFile = vi.fn(async () => selected);
    const showOpenFilePicker = vi.fn(async () => [{ getFile }]);
    vi.stubGlobal('showOpenFilePicker', showOpenFilePicker);

    await expect(openDocumentFile()).resolves.toMatchObject({
      path: 'standalone.html',
      name: 'standalone.html',
      size: 19,
      type: 'text/html',
      lastModified: 1700000000000,
      file: selected,
    });

    expect(showOpenFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        multiple: false,
      }),
    );

    vi.unstubAllGlobals();
  });

  it('keeps the legacy standalone markdown picker alias', async () => {
    const selected = new File(['# Standalone'], 'standalone.md', {
      type: 'text/markdown',
      lastModified: 1700000000000,
    });
    vi.stubGlobal('showOpenFilePicker', vi.fn(async () => [{ getFile: async () => selected }]));

    await expect(openMarkdownFile()).resolves.toMatchObject({
      path: 'standalone.md',
      name: 'standalone.md',
    });

    vi.unstubAllGlobals();
  });

  it('throws a useful error when a path cannot be found', async () => {
    const root = dir('root', []);

    await expect(readMarkdownFile(root as unknown as FileSystemDirectoryHandle, 'missing.md')).rejects.toThrow(
      'File not found: missing.md',
    );
  });
});
