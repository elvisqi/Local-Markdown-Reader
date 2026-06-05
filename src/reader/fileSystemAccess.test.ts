import {
  createDirectoryScanSession,
  openMarkdownFile,
  openDocumentFile,
  readMarkdownFile,
  readMarkdownFileSlice,
  readMarkdownFileSnapshot,
  scanDirectoryChildren,
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
  it('recursively scans Markdown, HTML, and JSON files and ignores generated directories', async () => {
    const root = dir('root', [
      file('README.md'),
      file('report.html'),
      file('data.json'),
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
      { type: 'file', name: 'data.json', path: 'data.json' },
      { type: 'file', name: 'README.md', path: 'README.md' },
      { type: 'file', name: 'report.html', path: 'report.html' },
    ]);
  });

  it('scans only one directory level for lazy file trees', async () => {
    const nestedEntries = vi.fn(async function* () {
      yield ['deep.md', file('deep.md')] as [string, FakeFileHandle];
    });
    const nested = {
      kind: 'directory',
      name: 'nested',
      entries: nestedEntries,
    } satisfies FakeDirectoryHandle;
    const root = dir('root', [
      file('README.md'),
      file('asset.png'),
      dir('node_modules', [file('ignored.md')]),
      nested,
    ]);

    await expect(scanDirectoryChildren(root as unknown as FileSystemDirectoryHandle, '')).resolves.toEqual([
      { id: 'nested', type: 'directory', name: 'nested', path: 'nested', children: [], loadState: 'unloaded' },
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ]);
    expect(nestedEntries).not.toHaveBeenCalled();
  });

  it('caches directory handles while lazily scanning nested directories', async () => {
    const guidesEntries = vi.fn(async function* () {
      yield ['install.md', file('install.md')] as [string, FakeFileHandle];
    });
    const guides = {
      kind: 'directory',
      name: 'guides',
      entries: guidesEntries,
    } satisfies FakeDirectoryHandle;
    const docsEntries = vi.fn(async function* () {
      yield ['guides', guides] as [string, FakeDirectoryHandle];
    });
    const docs = {
      kind: 'directory',
      name: 'docs',
      entries: docsEntries,
    } satisfies FakeDirectoryHandle;
    const rootEntries = vi.fn(async function* () {
      yield ['docs', docs] as [string, FakeDirectoryHandle];
    });
    const root = {
      kind: 'directory',
      name: 'root',
      entries: rootEntries,
    } satisfies FakeDirectoryHandle;
    const session = createDirectoryScanSession(root as unknown as FileSystemDirectoryHandle);

    await session.scanChildren('');
    await session.scanChildren('docs');
    await session.scanChildren('docs/guides');

    expect(rootEntries).toHaveBeenCalledTimes(1);
    expect(docsEntries).toHaveBeenCalledTimes(1);
    expect(guidesEntries).toHaveBeenCalledTimes(1);
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
        types: [
          {
            description: 'Markdown、HTML 或 JSON 文件',
            accept: {
              'application/json': ['.json'],
              'text/html': ['.html', '.htm'],
              'text/markdown': ['.md', '.markdown', '.mdown', '.mkdn', '.mdtxt', '.mdtext'],
            },
          },
        ],
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
