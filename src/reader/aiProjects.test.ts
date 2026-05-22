import {
  clearAiProjectState,
  loadAiProjectState,
  mergeAiProjectDirectory,
  mergeAiProjectScan,
  saveAiProjectState,
  scanAiProjects,
  type AiProjectState,
} from './aiProjects';
import type { ReaderStateStore } from './recentDocument';

type FakeFileHandle = {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
};

type FakeDirectoryHandle = {
  kind: 'directory';
  name: string;
  entries: () => AsyncIterableIterator<[string, FakeDirectoryHandle | FakeFileHandle]>;
};

function file(name: string, text: string): FakeFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([text], name, { lastModified: 1700000000000 }),
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

function memoryStore(): ReaderStateStore {
  const values = new Map<string, unknown>();

  return {
    get: async (key) => values.get(key),
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
}

describe('aiProjects', () => {
  it('scans Codex workspace paths from global state and sessions', async () => {
    const root = dir('.codex', [
      file('.codex-global-state.json.bak', JSON.stringify({
        'electron-saved-workspace-roots': [
          '/Users/qiyu/Github/md-viewer',
          '/Users/qiyu/.codex/cache',
        ],
      })),
      dir('sessions', [
        dir('2026', [
          file('rollout.jsonl', [
            JSON.stringify({ timestamp: '2026-05-22', type: 'session_meta', payload: { cwd: '/Users/qiyu/Gitlab/agent-skills' } }),
            JSON.stringify({ type: 'turn_context' }),
          ].join('\n')),
        ]),
      ]),
    ]);

    const result = await scanAiProjects('codex', root as unknown as FileSystemDirectoryHandle);

    expect(result.projects.map((project) => project.expectedPath).sort()).toEqual([
      '/Users/qiyu/Github/md-viewer',
      '/Users/qiyu/Gitlab/agent-skills',
    ]);
    expect(result.projects.find((project) => project.name === 'md-viewer')?.provider).toBe('codex');
  });

  it('scans Claude Code project paths from cwd metadata and encoded directory names', async () => {
    const root = dir('.claude', [
      dir('projects', [
        dir('-Users-qiyu-Gitlab-prd-doc', [
          file('session.jsonl', JSON.stringify({ cwd: '/Users/qiyu/Gitlab/prd-doc' })),
        ]),
        dir('-Users-qiyu-Github-md-viewer', []),
      ]),
    ]);

    const result = await scanAiProjects('claude', root as unknown as FileSystemDirectoryHandle);

    expect(result.projects.map((project) => project.expectedPath).sort()).toEqual([
      '/Users/qiyu/Github/md-viewer',
      '/Users/qiyu/Gitlab/prd-doc',
    ]);
    expect(result.projects.find((project) => project.expectedPath === '/Users/qiyu/Gitlab/prd-doc')?.name).toBe(
      'prd-doc',
    );
  });

  it('merges scans while preserving existing project directory authorization', () => {
    const project = {
      id: 'codex:/Users/qiyu/Github/md-viewer',
      provider: 'codex' as const,
      name: 'md-viewer',
      expectedPath: '/Users/qiyu/Github/md-viewer',
      discoveredAt: 123,
    };
    const rootHandle = { kind: 'directory', name: '.codex' } as FileSystemDirectoryHandle;
    const projectHandle = { kind: 'directory', name: 'md-viewer' } as FileSystemDirectoryHandle;
    const withScan = mergeAiProjectScan({ sources: {}, projects: [] }, 'codex', rootHandle, [project]);
    const withDirectory = mergeAiProjectDirectory(withScan, project, projectHandle);
    const rescanned = mergeAiProjectScan(withDirectory, 'codex', rootHandle, [{ ...project, discoveredAt: 456 }]);

    expect(rescanned.projects[0]).toMatchObject({
      expectedPath: '/Users/qiyu/Github/md-viewer',
      directoryHandle: projectHandle,
      directoryName: 'md-viewer',
    });
  });

  it('saves, loads, and clears AI project state', async () => {
    const store = memoryStore();
    const state: AiProjectState = {
      sources: {},
      projects: [
        {
          id: 'codex:/Users/qiyu/Github/md-viewer',
          provider: 'codex',
          name: 'md-viewer',
          expectedPath: '/Users/qiyu/Github/md-viewer',
          discoveredAt: 123,
        },
      ],
    };

    await saveAiProjectState(state, store);

    await expect(loadAiProjectState(store)).resolves.toEqual(state);

    await clearAiProjectState(store);

    await expect(loadAiProjectState(store)).resolves.toEqual({ sources: {}, projects: [] });
  });
});
