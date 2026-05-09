import { readMarkdownFile, scanMarkdownDirectory } from './fileSystemAccess';

type FakeFileHandle = {
  kind: 'file';
  name: string;
  getFile: () => Promise<{ text: () => Promise<string>; type: string }>;
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
  it('recursively scans Markdown files and ignores generated directories', async () => {
    const root = dir('root', [
      file('README.md'),
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
    ]);
  });

  it('reads a nested Markdown file by path', async () => {
    const root = dir('root', [dir('docs', [file('guide.md', '# Guide')])]);

    await expect(readMarkdownFile(root as unknown as FileSystemDirectoryHandle, 'docs/guide.md')).resolves.toBe(
      '# Guide',
    );
  });

  it('throws a useful error when a path cannot be found', async () => {
    const root = dir('root', []);

    await expect(readMarkdownFile(root as unknown as FileSystemDirectoryHandle, 'missing.md')).rejects.toThrow(
      'File not found: missing.md',
    );
  });
});
