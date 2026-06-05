# React Arborist Lazy File Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recursive file tree with a React Arborist based lazy-loading file tree that can manage folders with up to 100,000 total reachable nodes without blocking open, reload, expand, or selection flows.

**Architecture:** The file-system layer will expose single-directory scanning and path hydration APIs instead of always recursively scanning the full root. A dedicated lazy tree model will track loaded directories, loading/error state, expanded IDs, and active file paths. React Arborist will own virtualized tree rendering and keyboard/tree interactions through a small local wrapper so the rest of the reader is isolated from the third-party component.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, File System Access API, `react-arborist@3.8.0`, existing reader state in `src/reader/App.tsx`.

---

## Scope And Constraints

- First 2.0 implementation supports read-only file trees only: no drag/drop, rename, create, delete, multi-select, or in-tree search.
- File tree data is lazy: opening a folder scans only the root level; expanding a directory scans that directory's direct children once.
- Directories are shown even when they have no readable descendants, because descendant checks would require recursive scanning.
- Readable files remain Markdown, HTML, and JSON files, using existing `isReadableDocumentFile`.
- Ignored directories continue to use existing `shouldIgnoreDirectory`, including hidden directories, `node_modules`, build output, and cache directories.
- Existing recursive APIs can stay temporarily for tests or non-migrated code, but the folder drawer and AI project drawer should use lazy APIs when the migration is complete.
- Release packaging is out of scope for this plan; implementation completion should run tests, typecheck, and build.

## Verified React Arborist Contracts

- `react-arborist@3.8.0` exports `Tree`, `NodeApi`, `TreeApi`, `NodeRendererProps`, and `RowRendererProps`.
- `TreeProps.openByDefault` is a boolean, not an open-state map, and Arborist defaults it to `true`. Set `openByDefault={false}`, use `initialOpenState: Record<string, boolean>` for first render, and synchronize later external expansion changes with `treeRef.current.open(id, false)` and `treeRef.current.close(id, false)`.
- `TreeApi.open`, `TreeApi.close`, and `NodeApi.toggle` call `onToggle(id)`. Synchronization effects must guard against feeding their own imperative open/close calls back into `onExpandedPathsChange`.
- `childrenAccessor="children"` makes any node with `children: []` an internal directory. File nodes must omit `children`.
- Arborist recursively creates node metadata for every object supplied in `data`, independent of whether a parent is currently open. Unloaded directories must therefore keep `children: []`; do not pre-materialize hidden descendants as placeholder data.
- Arborist's default row renderer already owns `role="treeitem"`, `aria-level`, `aria-selected`, and `aria-expanded`. Custom node content must not add another `role="treeitem"`; use a custom `renderRow` when row-level ARIA such as `aria-current="page"` is needed.
- Arborist uses `react-window` and requires a numeric `height`. The wrapper must measure the available drawer height with `ResizeObserver` and provide a deterministic fallback for tests and browsers without `ResizeObserver`.
- Arborist flattens currently visible open nodes before virtual rendering. This is acceptable only because our data layer loads directories lazily; do not pass a fully recursive 100,000-node tree to Arborist.

## File Structure

- `package.json`, `package-lock.json`: add `react-arborist`.
- `src/shared/types.ts`: add `LazyFileTreeNode`, `LazyDirectoryLoadState`, and helper types while keeping legacy `FileTreeNode` during migration.
- `src/shared/fileSystem.ts`: add path ancestor helpers and lazy-tree sorting helpers.
- `src/shared/fileSystem.test.ts`: cover lazy helper behavior.
- `src/reader/fileSystemAccess.ts`: add one-level directory scan and path hydration helpers.
- `src/reader/fileSystemAccess.test.ts`: prove lazy scan does not recursively traverse children.
- `src/reader/lazyFileTree.ts`: pure reducer/model for loading, error, expansion, active path, reload, and tree updates.
- `src/reader/lazyFileTree.test.ts`: reducer/model tests.
- `src/reader/components/ArboristFileTree.tsx`: React Arborist wrapper with local node rendering.
- `src/reader/components/ArboristFileTree.test.tsx`: component interaction tests with Arborist mocked only where needed.
- `src/reader/components/FileTree.tsx`: keep as a compatibility wrapper or delete after callers migrate.
- `src/reader/components/FileDrawer.tsx`: use `ArboristFileTree` props for folder and AI project panels.
- `src/reader/components/FileDrawer.test.tsx`: update drawer expectations.
- `src/reader/App.tsx`: replace full tree state with lazy tree state and lazy loading operations.
- `src/reader/App.test.tsx`: update folder, reload, restore, AI project, and navigation tests.
- `src/reader/fileNavigation.ts`: add navigation support for loaded lazy trees.
- `src/reader/fileNavigation.test.ts`: cover loaded-branch sibling navigation.
- `src/reader/App.css`: update tree row, indentation, loading, error, active, and focus styles.
- `src/reader/tableLayoutStyles.test.ts`: update CSS rule expectations for Arborist classes.

---

### Task 1: Add React Arborist Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependency**

Run:

```bash
npm install react-arborist@3.8.0
```

Expected: `package.json` includes `"react-arborist": "^3.8.0"` and `package-lock.json` includes `react-arborist` plus its transitive dependencies.

- [ ] **Step 2: Verify dependency metadata**

Run:

```bash
npm ls react-arborist
npm ls react-window react-dnd react-dnd-html5-backend redux use-sync-external-store
```

Expected: output contains `react-arborist@3.8.0` and the required transitive runtime dependencies, and both commands exit 0.

- [ ] **Step 3: Commit dependency**

Run:

```bash
git add package.json package-lock.json
git commit -m "chore: add react arborist dependency"
```

Expected: commit succeeds with only dependency files staged.

---

### Task 2: Define Lazy File Tree Types And Pure Helpers

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/fileSystem.ts`
- Modify: `src/shared/fileSystem.test.ts`

- [ ] **Step 1: Write failing helper tests**

Update the top-level imports in `src/shared/fileSystem.test.ts`, then append the `describe('lazy file tree helpers', ...)` block below the existing tests:

```ts
import type { LazyFileTreeNode } from './types';
import {
  selectPathAncestors,
  sortLazyFileTreeNodes,
  selectDefaultLoadedDocument,
  selectRememberedLoadedDocument,
} from './fileSystem';

describe('lazy file tree helpers', () => {
  it('selects directory ancestors for a document path', () => {
    expect(selectPathAncestors('docs/guides/install.md')).toEqual(['docs', 'docs/guides']);
    expect(selectPathAncestors('README.md')).toEqual([]);
  });

  it('sorts lazy directories before files using existing name collation', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'z.md', type: 'file', name: 'z.md', path: 'z.md' },
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
      { id: 'a.md', type: 'file', name: 'a.md', path: 'a.md' },
    ];

    expect(sortLazyFileTreeNodes(nodes).map((node) => node.name)).toEqual(['docs', 'a.md', 'z.md']);
  });

  it('selects a default file from loaded lazy nodes only', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ];

    expect(selectDefaultLoadedDocument(nodes)).toBe('README.md');
  });

  it('keeps a remembered file when that file exists in loaded lazy nodes', () => {
    const nodes: LazyFileTreeNode[] = [
      {
        id: 'docs',
        type: 'directory',
        name: 'docs',
        path: 'docs',
        children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
        loadState: 'loaded',
      },
    ];

    expect(selectRememberedLoadedDocument(nodes, 'docs/guide.md')).toBe('docs/guide.md');
  });

  it('falls back to the default loaded document when the remembered file is missing', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
    ];

    expect(selectRememberedLoadedDocument(nodes, 'missing.md')).toBe('README.md');
  });
});
```

Run:

```bash
npm test -- src/shared/fileSystem.test.ts --run
```

Expected: FAIL because the lazy types and helper exports do not exist.

- [ ] **Step 2: Add lazy types**

Add to `src/shared/types.ts` after `FileTreeNode`:

```ts
export type LazyDirectoryLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';

export type LazyFileTreeNode =
  | {
      id: string;
      type: 'directory';
      name: string;
      path: string;
      children: LazyFileTreeNode[];
      loadState: LazyDirectoryLoadState;
      errorMessage?: string;
    }
  | {
      id: string;
      type: 'file';
      name: string;
      path: string;
    };
```

- [ ] **Step 3: Add helper implementations**

Add imports and functions to `src/shared/fileSystem.ts`:

```ts
import type { DocumentFileEntry, DocumentFileKind, FileTreeNode, LazyFileTreeNode, MarkdownFileEntry } from './types';
```

Add near the existing helper exports:

```ts
export function selectPathAncestors(path: string): string[] {
  const parts = normalizePath([path]).split('/').filter(Boolean);
  if (parts.length <= 1) {
    return [];
  }

  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

export function sortLazyFileTreeNodes(entries: LazyFileTreeNode[]): LazyFileTreeNode[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function selectDefaultLoadedDocument(tree: LazyFileTreeNode[]): string | null {
  return selectDefaultDocumentFromFiles(flattenLoadedDocumentFiles(tree));
}

export function selectRememberedLoadedDocument(tree: LazyFileTreeNode[], rememberedPath: string): string | null {
  const files = flattenLoadedDocumentFiles(tree);
  return files.some((file) => file.path === rememberedPath)
    ? rememberedPath
    : selectDefaultDocumentFromFiles(files);
}

export function flattenLoadedDocumentFiles(tree: LazyFileTreeNode[]): DocumentFileEntry[] {
  return sortLazyFileTreeNodes(tree).flatMap((node) => {
    if (node.type === 'directory') {
      return node.loadState === 'loaded' ? flattenLoadedDocumentFiles(node.children) : [];
    }

    return isReadableDocumentFile(node.name) ? [{ name: node.name, path: node.path }] : [];
  });
}
```

- [ ] **Step 4: Verify helper tests pass**

Run:

```bash
npm test -- src/shared/fileSystem.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit helpers**

Run:

```bash
git add src/shared/types.ts src/shared/fileSystem.ts src/shared/fileSystem.test.ts
git commit -m "feat: add lazy file tree helpers"
```

Expected: commit succeeds.

---

### Task 3: Add Single-Level Directory Scanning APIs

**Files:**
- Modify: `src/reader/fileSystemAccess.ts`
- Modify: `src/reader/fileSystemAccess.test.ts`

- [ ] **Step 1: Write failing lazy scan tests**

Update the import in `src/reader/fileSystemAccess.test.ts`:

```ts
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
```

Add this test inside `describe('fileSystemAccess', () => { ... })`:

```ts
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
```

Run:

```bash
npm test -- src/reader/fileSystemAccess.test.ts --run
```

Expected: FAIL because `createDirectoryScanSession` and `scanDirectoryChildren` are not exported.

- [ ] **Step 2: Implement one-level scan**

Add `LazyFileTreeNode` to the type import:

```ts
import type { FileTreeNode, LazyFileTreeNode } from '../shared/types';
```

Add `sortLazyFileTreeNodes` to the helper import:

```ts
  sortLazyFileTreeNodes,
```

Add this function after `scanDocumentDirectory`:

```ts
export type DirectoryScanSession = {
  scanChildren: (directoryPath: string) => Promise<LazyFileTreeNode[]>;
};

export function isStaleLoadedDirectoryError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('Directory handle not loaded: ');
}

export function createDirectoryScanSession(rootHandle: DirectoryLike): DirectoryScanSession {
  const handlesByPath = new Map<string, DirectoryLike>([['', rootHandle]]);

  return {
    async scanChildren(directoryPath: string) {
      const normalizedPath = normalizePath([directoryPath]);
      const directoryHandle = handlesByPath.get(normalizedPath);
      if (!directoryHandle) {
        throw new Error(`Directory handle not loaded: ${normalizedPath}`);
      }

      const { children, childHandles } = await scanDirectoryHandleChildren(directoryHandle, normalizedPath);

      childHandles.forEach((childHandle, path) => handlesByPath.set(path, childHandle));

      return children;
    },
  };
}

export async function scanDirectoryChildren(handle: DirectoryLike, directoryPath: string): Promise<LazyFileTreeNode[]> {
  return createDirectoryScanSession(handle).scanChildren(directoryPath);
}

async function scanDirectoryHandleChildren(
  directoryHandle: DirectoryLike,
  directoryPath: string,
): Promise<{ children: LazyFileTreeNode[]; childHandles: Map<string, DirectoryLike> }> {
  if (!directoryHandle) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  const parentParts = directoryPath.split('/').filter(Boolean);
  const nodes: LazyFileTreeNode[] = [];
  const childHandles = new Map<string, DirectoryLike>();

  for await (const [, entry] of directoryHandle.entries()) {
    const path = normalizePath([...parentParts, entry.name]);

    if (entry.kind === 'directory') {
      if (shouldIgnoreDirectory(entry.name)) {
        continue;
      }

      nodes.push({
        id: path,
        type: 'directory',
        name: entry.name,
        path,
        children: [],
        loadState: 'unloaded',
      });
      childHandles.set(path, entry as DirectoryLike);
    } else if (entry.kind === 'file' && isReadableDocumentFile(entry.name)) {
      nodes.push({
        id: path,
        type: 'file',
        name: entry.name,
        path,
      });
    }
  }

  return { children: sortLazyFileTreeNodes(nodes), childHandles };
}
```

Do not use `scanDirectoryChildren(root, 'docs/deep')` in production paths after this task. That compatibility export creates a fresh session and therefore only works for `''`; callers that need nested lazy expansion must hold one `DirectoryScanSession` per opened folder/project.

- [ ] **Step 3: Verify file system tests pass**

Run:

```bash
npm test -- src/reader/fileSystemAccess.test.ts --run
```

Expected: PASS.

- [ ] **Step 4: Commit lazy scan API**

Run:

```bash
git add src/reader/fileSystemAccess.ts src/reader/fileSystemAccess.test.ts
git commit -m "feat: scan file tree directories lazily"
```

Expected: commit succeeds.

---

### Task 4: Build Lazy File Tree State Model

**Files:**
- Create: `src/reader/lazyFileTree.ts`
- Create: `src/reader/lazyFileTree.test.ts`

- [ ] **Step 1: Write reducer/model tests**

Create `src/reader/lazyFileTree.test.ts`:

```ts
import type { LazyFileTreeNode } from '../shared/types';
import {
  clearDirectoryError,
  createEmptyLazyFileTree,
  markDirectoryLoading,
  pruneExpandedPaths,
  replaceDirectoryChildren,
  selectDirectoryNode,
  selectLoadedDocumentExists,
  upsertLoadedPath,
} from './lazyFileTree';

const rootChildren: LazyFileTreeNode[] = [
  { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
  { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
];

describe('lazyFileTree', () => {
  it('replaces root children without losing directory metadata', () => {
    const tree = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);

    expect(tree.nodes).toEqual(rootChildren);
    expect(tree.loadedDirectoryPaths).toContain('');
  });

  it('marks a directory loading and then loaded with children', () => {
    const withRoot = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
    const withExpanded = { ...withRoot, expandedPaths: new Set(['docs']) };
    const loading = markDirectoryLoading(withExpanded, 'docs');

    expect(selectDirectoryNode(loading.nodes, 'docs')).toMatchObject({ loadState: 'loading' });

    const loaded = replaceDirectoryChildren(loading, 'docs', [
      { id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' },
    ]);

    expect(selectDirectoryNode(loaded.nodes, 'docs')).toMatchObject({
      loadState: 'loaded',
      children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
    });
    expect([...loaded.expandedPaths]).toEqual(['docs']);
  });

  it('can upsert loaded ancestors for a remembered document path', () => {
    const tree = upsertLoadedPath(createEmptyLazyFileTree(), 'docs/guides/install.md', [
      {
        path: '',
        children: [{ id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs',
        children: [{ id: 'docs/guides', type: 'directory', name: 'guides', path: 'docs/guides', children: [], loadState: 'loaded' }],
      },
      {
        path: 'docs/guides',
        children: [{ id: 'docs/guides/install.md', type: 'file', name: 'install.md', path: 'docs/guides/install.md' }],
      },
    ]);

    expect(selectLoadedDocumentExists(tree.nodes, 'docs/guides/install.md')).toBe(true);
    expect([...tree.expandedPaths]).toEqual(['docs', 'docs/guides']);
  });

  it('clears a directory error without clearing children', () => {
    const withRoot = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
    const loading = markDirectoryLoading(withRoot, 'docs');
    const cleared = clearDirectoryError(loading, 'docs');

    expect(selectDirectoryNode(cleared.nodes, 'docs')).toMatchObject({ loadState: 'unloaded' });
  });

  it('prunes expanded paths that no longer exist after reload', () => {
    const withRoot = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
    const expanded = {
      ...withRoot,
      expandedPaths: new Set(['docs', 'missing', 'docs/missing']),
    };

    expect([...pruneExpandedPaths(expanded).expandedPaths]).toEqual(['docs']);
  });
});
```

Run:

```bash
npm test -- src/reader/lazyFileTree.test.ts --run
```

Expected: FAIL because `lazyFileTree.ts` does not exist.

- [ ] **Step 2: Implement lazy tree state**

Create `src/reader/lazyFileTree.ts`:

```ts
import { selectPathAncestors, sortLazyFileTreeNodes } from '../shared/fileSystem';
import type { LazyFileTreeNode } from '../shared/types';

export type LazyFileTreeState = {
  nodes: LazyFileTreeNode[];
  expandedPaths: Set<string>;
  loadedDirectoryPaths: Set<string>;
};

export type LoadedPathSegment = {
  path: string;
  children: LazyFileTreeNode[];
};

export function createEmptyLazyFileTree(): LazyFileTreeState {
  return {
    nodes: [],
    expandedPaths: new Set(),
    loadedDirectoryPaths: new Set(),
  };
}

export function replaceDirectoryChildren(
  state: LazyFileTreeState,
  directoryPath: string,
  children: LazyFileTreeNode[],
): LazyFileTreeState {
  const sortedChildren = sortLazyFileTreeNodes(children);
  const loadedDirectoryPaths = new Set(state.loadedDirectoryPaths).add(directoryPath);

  if (!directoryPath) {
    return {
      ...state,
      nodes: sortedChildren,
      loadedDirectoryPaths,
    };
  }

  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      children: sortedChildren,
      loadState: 'loaded',
      errorMessage: undefined,
    })),
    loadedDirectoryPaths,
  };
}

export function markDirectoryLoading(state: LazyFileTreeState, directoryPath: string): LazyFileTreeState {
  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      loadState: 'loading',
      errorMessage: undefined,
    })),
  };
}

export function markDirectoryError(
  state: LazyFileTreeState,
  directoryPath: string,
  errorMessage: string,
): LazyFileTreeState {
  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      loadState: 'error',
      errorMessage,
    })),
  };
}

export function clearDirectoryError(state: LazyFileTreeState, directoryPath: string): LazyFileTreeState {
  return {
    ...state,
    nodes: updateDirectory(state.nodes, directoryPath, (node) => ({
      ...node,
      loadState: 'unloaded',
      errorMessage: undefined,
    })),
  };
}

export function setExpandedPaths(state: LazyFileTreeState, paths: Iterable<string>): LazyFileTreeState {
  return {
    ...state,
    expandedPaths: new Set(paths),
  };
}

export function pruneExpandedPaths(state: LazyFileTreeState): LazyFileTreeState {
  const existingDirectoryPaths = collectDirectoryPaths(state.nodes);
  return {
    ...state,
    expandedPaths: new Set([...state.expandedPaths].filter((path) => existingDirectoryPaths.has(path))),
  };
}

export function upsertLoadedPath(
  state: LazyFileTreeState,
  documentPath: string,
  segments: LoadedPathSegment[],
): LazyFileTreeState {
  const expandedPaths = new Set(state.expandedPaths);
  selectPathAncestors(documentPath).forEach((path) => expandedPaths.add(path));

  const nextState = segments.reduce(
    (current, segment) => replaceDirectoryChildren(current, segment.path, segment.children),
    state,
  );

  return { ...nextState, expandedPaths };
}

export function selectDirectoryNode(nodes: LazyFileTreeNode[], path: string): Extract<LazyFileTreeNode, { type: 'directory' }> | null {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === path) {
      return node;
    }

    const child = selectDirectoryNode(node.children, path);
    if (child) {
      return child;
    }
  }

  return null;
}

export function selectLoadedDocumentExists(nodes: LazyFileTreeNode[], path: string): boolean {
  return nodes.some((node) => {
    if (node.type === 'file') {
      return node.path === path;
    }

    return selectLoadedDocumentExists(node.children, path);
  });
}

function collectDirectoryPaths(nodes: LazyFileTreeNode[], paths = new Set<string>()): Set<string> {
  nodes.forEach((node) => {
    if (node.type !== 'directory') {
      return;
    }

    paths.add(node.path);
    collectDirectoryPaths(node.children, paths);
  });

  return paths;
}

function updateDirectory(
  nodes: LazyFileTreeNode[],
  directoryPath: string,
  update: (node: Extract<LazyFileTreeNode, { type: 'directory' }>) => LazyFileTreeNode,
): LazyFileTreeNode[] {
  return nodes.map((node) => {
    if (node.type !== 'directory') {
      return node;
    }

    if (node.path === directoryPath) {
      return update(node) as LazyFileTreeNode;
    }

    return {
      ...node,
      children: updateDirectory(node.children, directoryPath, update),
    };
  });
}
```

- [ ] **Step 3: Verify reducer/model tests pass**

Run:

```bash
npm test -- src/reader/lazyFileTree.test.ts --run
```

Expected: PASS.

- [ ] **Step 4: Commit lazy model**

Run:

```bash
git add src/reader/lazyFileTree.ts src/reader/lazyFileTree.test.ts
git commit -m "feat: add lazy file tree state model"
```

Expected: commit succeeds.

---

### Task 5: Wrap React Arborist As A Read-Only File Tree

**Files:**
- Create: `src/reader/components/ArboristFileTree.tsx`
- Create: `src/reader/components/ArboristFileTree.test.tsx`
- Modify: `src/reader/App.css`
- Modify: `src/reader/tableLayoutStyles.test.ts`

- [ ] **Step 1: Write component interaction tests**

Create `src/reader/components/ArboristFileTree.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArboristFileTree } from './ArboristFileTree';
import type { LazyFileTreeNode } from '../../shared/types';

const tree: LazyFileTreeNode[] = [
  {
    id: 'docs',
    type: 'directory',
    name: 'docs',
    path: 'docs',
    loadState: 'loaded',
    children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
  },
  { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
];

describe('ArboristFileTree', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders files and activates a selected file', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    const onExpandedPathsChange = vi.fn();

    render(
      <ArboristFileTree
        nodes={tree}
        activePath="README.md"
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={onSelectFile}
      />,
    );

    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'README.md' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('treeitem', { name: 'guide.md' }));

    expect(onSelectFile).toHaveBeenCalledWith('docs/guide.md');
    expect(onSelectFile).toHaveBeenCalledOnce();
    expect(screen.getByRole('treeitem', { name: 'guide.md' })).toHaveAttribute('aria-selected', 'true');
  });

  it('loads an unloaded directory when it is opened', async () => {
    const user = userEvent.setup();
    const onLoadDirectory = vi.fn();
    const onExpandedPathsChange = vi.fn();
    const unloaded: LazyFileTreeNode[] = [
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', loadState: 'unloaded', children: [] },
    ];

    render(
      <ArboristFileTree
        nodes={unloaded}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={onLoadDirectory}
        onSelectFile={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('treeitem', { name: 'docs' }));

    expect(onLoadDirectory).toHaveBeenCalledWith('docs');
    expect(onExpandedPathsChange).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded directories closed unless their path is externally expanded', () => {
    render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('treeitem', { name: 'docs' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: 'guide.md' })).not.toBeInTheDocument();
  });

  it('syncs externally controlled expanded paths without reporting a user toggle', () => {
    const onExpandedPathsChange = vi.fn();
    const { rerender } = render(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    rerender(
      <ArboristFileTree
        nodes={tree}
        activePath={null}
        expandedPaths={new Set(['docs'])}
        onExpandedPathsChange={onExpandedPathsChange}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(onExpandedPathsChange).not.toHaveBeenCalled();
  });

  it('shows loading and error state on directory rows', () => {
    const nodes: LazyFileTreeNode[] = [
      { id: 'loading', type: 'directory', name: 'loading', path: 'loading', loadState: 'loading', children: [] },
      {
        id: 'broken',
        type: 'directory',
        name: 'broken',
        path: 'broken',
        loadState: 'error',
        errorMessage: 'No permission',
        children: [],
      },
    ];

    render(
      <ArboristFileTree
        nodes={nodes}
        activePath={null}
        expandedPaths={new Set()}
        onExpandedPathsChange={vi.fn()}
        onLoadDirectory={vi.fn()}
        onSelectFile={vi.fn()}
      />,
    );

    expect(screen.getByText('正在加载')).toBeInTheDocument();
    expect(screen.getByText('No permission')).toBeInTheDocument();
  });
});
```

Run:

```bash
npm test -- src/reader/components/ArboristFileTree.test.tsx --run
```

Expected: FAIL because the component does not exist.

- [ ] **Step 2: Implement Arborist wrapper**

Create `src/reader/components/ArboristFileTree.tsx`:

```tsx
import { type MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Tree,
  type NodeApi,
  type NodeRendererProps,
  type RowRendererProps,
  type TreeApi,
} from 'react-arborist';

import type { LazyFileTreeNode } from '../../shared/types';

type ArboristFileTreeProps = {
  nodes: LazyFileTreeNode[];
  activePath: string | null;
  expandedPaths: Set<string>;
  onExpandedPathsChange: (paths: Set<string>) => void;
  onLoadDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
};

const ROW_HEIGHT = 28;
const INDENT = 18;
const FALLBACK_TREE_HEIGHT = 500;

export function ArboristFileTree({
  nodes,
  activePath,
  expandedPaths,
  onExpandedPathsChange,
  onLoadDirectory,
  onSelectFile,
}: ArboristFileTreeProps) {
  const treeRef = useRef<TreeApi<LazyFileTreeNode> | undefined>(undefined);
  const containerRef = useRef<HTMLElement | null>(null);
  const syncingOpenStateRef = useRef(false);
  const [treeHeight, setTreeHeight] = useState(FALLBACK_TREE_HEIGHT);
  const initialOpenStateRef = useRef<Record<string, boolean> | null>(null);

  if (!initialOpenStateRef.current) {
    initialOpenStateRef.current = Object.fromEntries([...expandedPaths].map((path) => [path, true]));
  }

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = Math.max(ROW_HEIGHT, Math.floor(entry.contentRect.height));
      setTreeHeight(nextHeight || FALLBACK_TREE_HEIGHT);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) {
      return;
    }

    syncingOpenStateRef.current = true;
    const next = new Set(expandedPaths);
    const currentOpenIds = new Set(Object.entries(tree.openState).filter(([, open]) => open).map(([id]) => id));

    for (const path of expandedPaths) {
      tree.open(path, false);
    }
    for (const path of currentOpenIds) {
      if (!next.has(path)) {
        tree.close(path, false);
      }
    }
    tree.redrawList();
    syncingOpenStateRef.current = false;
  }, [expandedPaths, nodes]);

  const handleToggle = useCallback((id: string) => {
    if (syncingOpenStateRef.current) {
      return;
    }

    const next = new Set(expandedPaths);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      const directory = findDirectory(nodes, id);
      if (directory?.loadState === 'unloaded' || directory?.loadState === 'error') {
        onLoadDirectory(id);
      }
    }
    onExpandedPathsChange(next);
  }, [expandedPaths, nodes, onExpandedPathsChange, onLoadDirectory]);

  const handleActivate = useCallback((node: NodeApi<LazyFileTreeNode>) => {
    if (node.data.type === 'file') {
      onSelectFile(node.data.path);
    }
  }, [onSelectFile]);

  if (!nodes.length) {
    return <p className="empty-note">当前目录层级没有可显示的文件或子目录。</p>;
  }

  return (
    <nav ref={containerRef} aria-label="文档文件" className="file-tree file-tree--arborist">
      <Tree<LazyFileTreeNode>
        ref={treeRef}
        data={nodes}
        idAccessor="id"
        childrenAccessor="children"
        rowHeight={ROW_HEIGHT}
        height={treeHeight}
        width="100%"
        indent={INDENT}
        overscanCount={12}
        openByDefault={false}
        initialOpenState={initialOpenStateRef.current ?? {}}
        disableDrag
        disableDrop
        disableEdit
        disableMultiSelection
        selection={activePath ?? undefined}
        onActivate={handleActivate}
        onToggle={handleToggle}
        renderRow={(props) => (
          <FileTreeRowContainer
            {...props}
            activePath={activePath}
          />
        )}
      >
        {(props) => (
          <FileTreeNode
            {...props}
            expandedPaths={expandedPaths}
          />
        )}
      </Tree>
    </nav>
  );
}

type FileTreeRowContainerProps = RowRendererProps<LazyFileTreeNode> & {
  activePath: string | null;
};

function FileTreeRowContainer({ node, attrs, innerRef, children, activePath }: FileTreeRowContainerProps) {
  const active = node.data.type === 'file' && node.data.path === activePath;

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    node.handleClick(event);

    if (node.data.type === 'directory') {
      node.toggle();
    }
  }

  return (
    <div
      {...attrs}
      ref={innerRef}
      aria-current={active ? 'page' : undefined}
      className={`file-tree__row file-tree__row--${node.data.type}${active ? ' is-active' : ''}${node.isSelected ? ' is-selected' : ''}`}
      onClick={handleClick}
      onFocus={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

type FileTreeNodeProps = NodeRendererProps<LazyFileTreeNode> & {
  expandedPaths: Set<string>;
};

function FileTreeNode({ node, style, dragHandle, expandedPaths }: FileTreeNodeProps) {
  const data = node.data;
  const open = data.type === 'directory' && expandedPaths.has(data.path);

  return (
    <div
      ref={dragHandle}
      style={style}
      className="file-tree__node"
    >
      {data.type === 'directory' && (
        <span className="file-tree__disclosure" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      )}
      <span className="file-tree__name">{data.name}</span>
      {data.type === 'directory' && data.loadState === 'loading' && (
        <span className="file-tree__state">正在加载</span>
      )}
      {data.type === 'directory' && data.loadState === 'error' && (
        <span className="file-tree__state is-error">{data.errorMessage}</span>
      )}
    </div>
  );
}

function findDirectory(nodes: LazyFileTreeNode[], path: string): Extract<LazyFileTreeNode, { type: 'directory' }> | null {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === path) {
      return node;
    }

    const child = findDirectory(node.children, path);
    if (child) {
      return child;
    }
  }

  return null;
}
```

- [ ] **Step 3: Add CSS for Arborist rows**

Add to `src/reader/App.css` near existing `.file-tree` rules:

```css
.file-tree--arborist {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.file-tree__row {
  align-items: center;
  border-radius: 6px;
  color: inherit;
  cursor: default;
  display: flex;
  font-size: 0.88rem;
  gap: 0.35rem;
  min-width: 0;
  padding: 0 0.4rem;
}

.file-tree__node {
  align-items: center;
  display: flex;
  gap: 0.35rem;
  height: 100%;
  min-width: 0;
}

.file-tree__row:hover {
  background: color-mix(in srgb, var(--reader-link) 10%, transparent);
}

.file-tree__row.is-active {
  background: color-mix(in srgb, var(--reader-link) 16%, transparent);
  color: var(--reader-link);
  font-weight: 600;
}

.file-tree__row:active {
  transform: translateY(1px);
}

.file-tree__disclosure {
  flex: 0 0 1rem;
  text-align: center;
}

.file-tree__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-tree__state {
  color: var(--reader-muted);
  flex: 0 0 auto;
  font-size: 0.75rem;
  margin-left: auto;
}

.file-tree__state.is-error {
  color: color-mix(in srgb, #d92d20 80%, var(--reader-text));
}
```

Update `src/reader/tableLayoutStyles.test.ts` to assert `.file-tree__row` has `display: flex`, `.file-tree__row:active` has `transform: translateY(1px)`, and `.file-tree__name` has `text-overflow: ellipsis`.

- [ ] **Step 4: Verify component and CSS tests pass**

Run:

```bash
npm test -- src/reader/components/ArboristFileTree.test.tsx src/reader/tableLayoutStyles.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit wrapper**

Run:

```bash
git add src/reader/components/ArboristFileTree.tsx src/reader/components/ArboristFileTree.test.tsx src/reader/App.css src/reader/tableLayoutStyles.test.ts
git commit -m "feat: add arborist file tree wrapper"
```

Expected: commit succeeds.

---

### Task 6: Migrate Folder Drawer To Lazy Tree State

**Files:**
- Modify: `src/reader/App.tsx`
- Modify: `src/reader/components/FileDrawer.tsx`
- Modify: `src/reader/components/FileDrawer.test.tsx`
- Modify: `src/reader/App.test.tsx`

- [ ] **Step 1: Write folder lazy open/reload tests**

In `src/reader/App.test.tsx`, update the file-system mock to include `createDirectoryScanSession`.

Add these entries to the existing `vi.mock('./fileSystemAccess', ...)` return object before adding the tests:

```ts
    createDirectoryScanSession: vi.fn(),
    hydrateDirectoryPath: vi.fn(),
```

Add tests:

```tsx
it('opens a folder by scanning only root children', async () => {
  const user = userEvent.setup();
  const directoryHandle = { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle;
  const scanChildren = vi.fn().mockResolvedValue([
    { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
    { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
  ]);
  vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
  vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue({ scanChildren });

  render(<App />);

  await user.click(screen.getByRole('button', { name: /打开文件夹/ }));

  expect(fileSystemAccess.createDirectoryScanSession).toHaveBeenCalledWith(directoryHandle);
  expect(scanChildren).toHaveBeenCalledWith('');
  expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
});

it('loads a folder branch when the user expands it', async () => {
  const user = userEvent.setup();
  const directoryHandle = { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle;
  const scanChildren = vi.fn()
    .mockResolvedValueOnce([
      { id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' },
    ])
    .mockResolvedValueOnce([
      { id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' },
    ]);
  vi.mocked(fileSystemAccess.openDirectory).mockResolvedValue(directoryHandle);
  vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue({ scanChildren });

  render(<App />);

  await user.click(screen.getByRole('button', { name: /打开文件夹/ }));
  await user.click(screen.getByRole('treeitem', { name: 'docs' }));

  expect(scanChildren).toHaveBeenLastCalledWith('docs');
  expect(await screen.findByRole('treeitem', { name: 'guide.md' })).toBeInTheDocument();
});
```

Run:

```bash
npm test -- src/reader/App.test.tsx --run
```

Expected: FAIL because `App` still uses recursive `scanMarkdownDirectory`.

- [ ] **Step 2: Update FileDrawer props**

Change `src/reader/components/FileDrawer.tsx`:

```ts
import type { LazyFileTreeNode } from '../../shared/types';
import { ArboristFileTree } from './ArboristFileTree';
```

Change folder props:

```ts
  tree: LazyFileTreeNode[];
  expandedPaths: Set<string>;
  onFolderExpandedPathsChange: (paths: Set<string>) => void;
  onLoadFolderDirectory: (path: string) => void;
```

Replace the folder `FileTree` usage:

```tsx
<ArboristFileTree
  nodes={tree}
  activePath={activePath}
  expandedPaths={expandedPaths}
  onExpandedPathsChange={onFolderExpandedPathsChange}
  onLoadDirectory={onLoadFolderDirectory}
  onSelectFile={onSelect}
/>
```

- [ ] **Step 3: Update App folder state**

In `src/reader/App.tsx`:

```ts
import {
  selectDefaultLoadedDocument,
  selectRememberedLoadedDocument,
} from '../shared/fileSystem';
import {
  createEmptyLazyFileTree,
  markDirectoryError,
  markDirectoryLoading,
  pruneExpandedPaths,
  selectLoadedDocumentExists,
  replaceDirectoryChildren,
  setExpandedPaths as setLazyExpandedPaths,
} from './lazyFileTree';
import {
  createDirectoryScanSession,
  isStaleLoadedDirectoryError,
  type DirectoryScanSession,
} from './fileSystemAccess';
import type { LazyFileTreeNode } from '../shared/types';
```

Remove `selectRememberedDocumentPath` from the existing `./recentDocument` import because restored lazy trees use `selectRememberedLoadedDocument` instead.

Change state:

```ts
const [folderTree, setFolderTree] = useState(createEmptyLazyFileTree);
```

Remove the separate folder expanded-path state because expansion now lives in `folderTree.expandedPaths`:

```ts
// Delete this state:
const [folderExpandedPaths, setFolderExpandedPaths] = useState<string[]>([]);
```

Add a scan session ref next to the existing reader refs:

```ts
const folderScanSessionRef = useRef<DirectoryScanSession | null>(null);
```

Add handlers:

```ts
async function loadFolderDirectory(path: string) {
  const scanSession = folderScanSessionRef.current;
  if (!scanSession) {
    return;
  }

  setFolderTree((current) => markDirectoryLoading(current, path));

  try {
    const children = await scanSession.scanChildren(path);
    if (folderScanSessionRef.current !== scanSession) {
      return;
    }
    setFolderTree((current) => replaceDirectoryChildren(current, path, children));
  } catch (err) {
    if (folderScanSessionRef.current !== scanSession) {
      return;
    }
    setFolderTree((current) =>
      markDirectoryError(current, path, err instanceof Error ? err.message : '无法读取目录。'),
    );
  }
}
```

Update `openFolder` root loading. Keep the previous `folderScanSessionRef.current` installed until the new root scan succeeds, so a canceled or failed folder-open attempt does not break lazy expansion for the currently open folder:

```ts
const scanSession = createDirectoryScanSession(handle);
const rootChildren = await scanSession.scanChildren('');
if (!isCurrentOpenRequest(requestId)) {
  return;
}
const nextTree = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
const defaultPath = selectDefaultLoadedDocument(nextTree.nodes);

folderScanSessionRef.current = scanSession;
setFolderDirectoryHandle(handle);
setFolderTree(nextTree);
setFolderActivePath(defaultPath);
setDrawerOpen(true);
setStatus(nextTree.nodes.length ? null : '这个文件夹根目录没有可显示的文件或子目录。');

if (defaultPath) {
  await openFile(handle, defaultPath, true, { source: { type: 'folder', handle }, requestId });
} else {
  clearReaderForSource({ type: 'folder', handle });
}
```

Update `FileDrawer` props:

```tsx
tree={folderTree.nodes}
expandedPaths={folderTree.expandedPaths}
onFolderExpandedPathsChange={(paths) => setFolderTree((current) => setLazyExpandedPaths(current, paths))}
onLoadFolderDirectory={(path) => void loadFolderDirectory(path)}
```

- [ ] **Step 4: Update reload folder to refresh loaded directories**

Replace `reloadFolderTree` recursive scan with:

```ts
async function reloadFolderTree() {
  if (!folderDirectoryHandle) {
    setStatus('请先打开一个文件夹。');
    return;
  }

  const requestId = beginOpenRequest();
  setError(null);
  setStatus('正在重载目录');

  try {
    const directoriesToReload = [...new Set(['', ...folderTree.loadedDirectoryPaths])]
      .sort((a, b) => a.split('/').filter(Boolean).length - b.split('/').filter(Boolean).length);
    const scanSession = createDirectoryScanSession(folderDirectoryHandle);
    let nextTree = createEmptyLazyFileTree();

    for (const directoryPath of directoriesToReload) {
      let children: LazyFileTreeNode[];
      try {
        children = await scanSession.scanChildren(directoryPath);
      } catch (err) {
        if (directoryPath && isStaleLoadedDirectoryError(err)) {
          continue;
        }

        throw err;
      }

      if (!isCurrentOpenRequest(requestId)) {
        return;
      }
      nextTree = replaceDirectoryChildren(nextTree, directoryPath, children);
    }

    nextTree = pruneExpandedPaths(setLazyExpandedPaths(nextTree, folderTree.expandedPaths));
    folderScanSessionRef.current = scanSession;
    setFolderTree(nextTree);
    setStatus(null);
  } catch (err) {
    if (!isCurrentOpenRequest(requestId)) {
      return;
    }

    setStatus(null);
    setError(err instanceof Error ? err.message : '无法重载目录。');
  }
}
```

- [ ] **Step 5: Verify folder tests pass**

Before running tests, update `src/reader/components/FileDrawer.test.tsx` defaults and helper types from legacy trees to lazy trees:

```ts
import type { LazyFileTreeNode } from '../../shared/types';
import { createEmptyLazyFileTree, type LazyFileTreeState } from '../lazyFileTree';

// Change these existing defaultProps fields:
tree: [] as LazyFileTreeNode[],
expandedPaths: new Set<string>(),
aiProjectTrees: {} as Record<string, LazyFileTreeState>,

// Add these defaultProps fields:
onLoadFolderDirectory: vi.fn(),
onLoadProjectDirectory: vi.fn(),
```

Replace local `useState<Record<string, string[]>>({})` helpers with `useState<Record<string, Set<string>>>({})`, and update project tree fixtures to pass `createEmptyLazyFileTree()` with `replaceDirectoryChildren(...)` instead of `FileTreeNode[]`.

Run:

```bash
npm test -- src/reader/components/FileDrawer.test.tsx src/reader/App.test.tsx --run
```

Expected: PASS after updating existing tests from legacy `FileTreeNode[]` to `LazyFileTreeNode[]` where folder drawer is involved.

- [ ] **Step 6: Commit folder migration**

Run:

```bash
git add src/reader/App.tsx src/reader/components/FileDrawer.tsx src/reader/components/FileDrawer.test.tsx src/reader/App.test.tsx
git commit -m "feat: lazy load folder file tree"
```

Expected: commit succeeds.

---

### Task 7: Hydrate Remembered Paths Without Full Scans

**Files:**
- Modify: `src/reader/fileSystemAccess.ts`
- Modify: `src/reader/fileSystemAccess.test.ts`
- Modify: `src/reader/App.tsx`
- Modify: `src/reader/App.test.tsx`

- [ ] **Step 1: Write path hydration tests**

Update the import in `src/reader/fileSystemAccess.test.ts`:

```ts
hydrateDirectoryPath,
```

Add this test inside `describe('fileSystemAccess', () => { ... })`:

```ts
it('hydrates direct children along a remembered document path', async () => {
  const root = dir('root', [dir('docs', [dir('guides', [file('install.md')])])]);
  const scanSession = createDirectoryScanSession(root as unknown as FileSystemDirectoryHandle);

  await expect(hydrateDirectoryPath(scanSession, 'docs/guides/install.md')).resolves.toEqual([
    {
      path: '',
      children: [{ id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'unloaded' }],
    },
    {
      path: 'docs',
      children: [{ id: 'docs/guides', type: 'directory', name: 'guides', path: 'docs/guides', children: [], loadState: 'unloaded' }],
    },
    {
      path: 'docs/guides',
      children: [{ id: 'docs/guides/install.md', type: 'file', name: 'install.md', path: 'docs/guides/install.md' }],
    },
  ]);
});

it('returns loaded ancestors when a remembered directory no longer exists', async () => {
  const root = dir('root', [file('README.md')]);
  const scanSession = createDirectoryScanSession(root as unknown as FileSystemDirectoryHandle);

  await expect(hydrateDirectoryPath(scanSession, 'docs/guides/install.md')).resolves.toEqual([
    {
      path: '',
      children: [{ id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' }],
    },
  ]);
});
```

Run:

```bash
npm test -- src/reader/fileSystemAccess.test.ts --run
```

Expected: FAIL because `hydrateDirectoryPath` does not exist.

- [ ] **Step 2: Implement path hydration**

Use the `isStaleLoadedDirectoryError` helper added in Task 3, then add to `src/reader/fileSystemAccess.ts`:

```ts
export type HydratedDirectorySegment = {
  path: string;
  children: LazyFileTreeNode[];
};

export async function hydrateDirectoryPath(
  scanSession: DirectoryScanSession,
  documentPath: string,
): Promise<HydratedDirectorySegment[]> {
  const parts = documentPath.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return [{ path: '', children: await scanSession.scanChildren('') }];
  }

  const segments: HydratedDirectorySegment[] = [];
  const directoryPaths = parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));

  segments.push({ path: '', children: await scanSession.scanChildren('') });

  for (const directoryPath of directoryPaths) {
    try {
      segments.push({ path: directoryPath, children: await scanSession.scanChildren(directoryPath) });
    } catch (err) {
      if (!isStaleLoadedDirectoryError(err)) {
        throw err;
      }

      break;
    }
  }

  return segments;
}
```

- [ ] **Step 3: Use hydration in restore last document**

In `src/reader/App.tsx`, replace recursive restore scan usage around `restoreLastDocument`:

```ts
const scanSession = createDirectoryScanSession(record.directoryHandle);
const hydrated = await hydrateDirectoryPath(scanSession, record.path);
const nextTree = upsertLoadedPath(createEmptyLazyFileTree(), record.path, hydrated);
```

Then set folder or AI project tree state from `nextTree` before `openFile`, and keep the same scan session for later lazy expansion:

```ts
const rememberedPath = selectRememberedLoadedDocument(nextTree.nodes, record.path);
const source: DocumentSource = record.source === 'ai-project' && record.aiProjectId
  ? { type: 'ai-project', projectId: record.aiProjectId, handle: record.directoryHandle }
  : { type: 'folder', handle: record.directoryHandle };

if (source.type === 'ai-project') {
  aiProjectScanSessionsRef.current = {
    ...aiProjectScanSessionsRef.current,
    [source.projectId]: scanSession,
  };
  setActiveAiProjectId(source.projectId);
  setAiProjectTrees((current) => ({ ...current, [source.projectId]: nextTree }));
  setAiProjectActivePaths((current) => ({ ...current, [source.projectId]: rememberedPath }));
  setDrawerTab('ai-projects');
} else {
  folderScanSessionRef.current = scanSession;
  setFolderDirectoryHandle(record.directoryHandle);
  setFolderTree(nextTree);
  setFolderActivePath(rememberedPath);
  setActiveAiProjectId(null);
}
```

- [ ] **Step 4: Add App restore regression**

In `src/reader/App.test.tsx`, add this test inside `describe('App file navigation and drawer behavior', ...)`:

```tsx
it('restores the remembered folder document without recursively scanning the full directory', async () => {
  const record = {
    directoryHandle: { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle,
    directoryName: 'Docs',
    path: 'docs/guides/install.md',
    updatedAt: Date.now(),
    source: 'folder',
  };
  const scanSession = { scanChildren: vi.fn() };
  vi.mocked(recentDocument.loadLastDocument).mockResolvedValue(record);
  vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue(scanSession);
  vi.mocked(fileSystemAccess.hydrateDirectoryPath).mockResolvedValue([
    { path: '', children: [{ id: 'docs', type: 'directory', name: 'docs', path: 'docs', children: [], loadState: 'loaded' }] },
    { path: 'docs', children: [{ id: 'docs/guides', type: 'directory', name: 'guides', path: 'docs/guides', children: [], loadState: 'loaded' }] },
    { path: 'docs/guides', children: [{ id: 'docs/guides/install.md', type: 'file', name: 'install.md', path: 'docs/guides/install.md' }] },
  ]);
  const file = new File(['# Install'], 'install.md', { type: 'text/markdown' });
  vi.mocked(fileSystemAccess.readDocumentFileSnapshot).mockResolvedValue({
    path: 'docs/guides/install.md',
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    file,
  });

  render(<App />);

  expect(await screen.findByText('上次打开：Docs/docs/guides/install.md')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '恢复上次文档' }));

  expect(fileSystemAccess.createDirectoryScanSession).toHaveBeenCalledWith(record.directoryHandle);
  expect(fileSystemAccess.hydrateDirectoryPath).toHaveBeenCalledWith(scanSession, 'docs/guides/install.md');
  expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Verify restore tests pass**

Run:

```bash
npm test -- src/reader/fileSystemAccess.test.ts src/reader/App.test.tsx --run
```

Expected: PASS.

- [ ] **Step 6: Commit remembered path hydration**

Run:

```bash
git add src/reader/fileSystemAccess.ts src/reader/fileSystemAccess.test.ts src/reader/App.tsx src/reader/App.test.tsx
git commit -m "feat: hydrate remembered file tree paths lazily"
```

Expected: commit succeeds.

---

### Task 8: Migrate AI Project Trees To Lazy Loading

**Files:**
- Modify: `src/reader/App.tsx`
- Modify: `src/reader/components/FileDrawer.tsx`
- Modify: `src/reader/components/FileDrawer.test.tsx`
- Modify: `src/reader/App.test.tsx`

- [ ] **Step 1: Write AI project lazy tests**

In `src/reader/App.test.tsx`, update the `vi.mock('./aiProjects', ...)` return object so permission checks can be controlled by tests:

```ts
    requestAiProjectDirectoryPermission: vi.fn(async () => true),
```

Add this test inside `describe('App file navigation and drawer behavior', ...)`:

```tsx
it('opens an AI project by loading only the project root directory', async () => {
  const user = userEvent.setup();
  const projectHandle = { kind: 'directory', name: 'AI Docs' } as FileSystemDirectoryHandle;
  const project = {
    id: 'project-1',
    provider: 'codex' as const,
    name: 'AI Docs',
    expectedPath: '/AI Docs',
    directoryHandle: projectHandle,
    directoryName: 'AI Docs',
    discoveredAt: 1,
  };
  vi.mocked(aiProjects.loadAiProjectState).mockResolvedValue({
    projects: [project],
    sources: {},
  });
  vi.mocked(aiProjects.requestAiProjectDirectoryPermission).mockResolvedValue(true);
  const scanChildren = vi.fn().mockResolvedValue([
    { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md' },
  ]);
  vi.mocked(fileSystemAccess.createDirectoryScanSession).mockReturnValue({ scanChildren });

  render(<App />);

  await user.click(screen.getByRole('tab', { name: 'AI 项目' }));
  await user.click(await screen.findByRole('button', { name: /AI Docs/ }));

  expect(fileSystemAccess.createDirectoryScanSession).toHaveBeenCalledWith(projectHandle);
  expect(scanChildren).toHaveBeenCalledWith('');
  expect(fileSystemAccess.scanMarkdownDirectory).not.toHaveBeenCalled();
});
```

Run:

```bash
npm test -- src/reader/App.test.tsx --run
```

Expected: FAIL until AI project code uses lazy scan.

- [ ] **Step 2: Change AI project state to lazy tree state**

In `src/reader/App.tsx`, change:

```ts
const [aiProjectTrees, setAiProjectTrees] = useState<Record<string, LazyFileTreeState>>({});
```

Remove the separate AI project expanded-path state because each project tree owns its `expandedPaths`:

```ts
// Delete this state:
const [aiProjectExpandedPaths, setAiProjectExpandedPaths] = useState<Record<string, string[]>>({});
```

Add a project scan session ref near the folder scan session ref:

```ts
const aiProjectScanSessionsRef = useRef<Record<string, DirectoryScanSession>>({});
```

Update `clearAiProjects` to clear project scan sessions alongside tree state:

```ts
aiProjectScanSessionsRef.current = {};
```

Update `activateAiProject` root loading. As with folders, keep the previous project scan session installed until the new root scan succeeds:

```ts
const scanSession = createDirectoryScanSession(handle);
const rootChildren = await scanSession.scanChildren('');
const nextTree = replaceDirectoryChildren(createEmptyLazyFileTree(), '', rootChildren);
aiProjectScanSessionsRef.current = { ...aiProjectScanSessionsRef.current, [project.id]: scanSession };
setAiProjectTrees((current) => ({ ...current, [project.id]: nextTree }));
```

Update the rest of `activateAiProject` to use lazy tree nodes instead of recursive tree analysis:

```ts
setActiveAiProjectId(project.id);
setDrawerTab('ai-projects');
openFileDrawer();
setAiProjectStatus(nextTree.nodes.length ? null : '这个项目根目录没有可显示的文件或子目录。');

const projectActivePath = aiProjectActivePaths[project.id] ?? null;
const activeFileExists = projectActivePath
  ? selectLoadedDocumentExists(nextTree.nodes, projectActivePath)
  : false;
const defaultPath = selectDefaultLoadedDocument(nextTree.nodes);
const source: DocumentSource = { type: 'ai-project', projectId: project.id, handle };
const pathToOpen = activeFileExists ? projectActivePath : defaultPath;
```

Add:

```ts
async function loadAiProjectDirectory(project: AiProjectEntry, path: string) {
  const scanSession = aiProjectScanSessionsRef.current[project.id];
  if (!scanSession) {
    return;
  }

  setAiProjectTrees((current) => ({
    ...current,
    [project.id]: markDirectoryLoading(current[project.id] ?? createEmptyLazyFileTree(), path),
  }));

  try {
    const children = await scanSession.scanChildren(path);
    if (aiProjectScanSessionsRef.current[project.id] !== scanSession) {
      return;
    }
    setAiProjectTrees((current) => ({
      ...current,
      [project.id]: replaceDirectoryChildren(current[project.id] ?? createEmptyLazyFileTree(), path, children),
    }));
  } catch (err) {
    if (aiProjectScanSessionsRef.current[project.id] !== scanSession) {
      return;
    }
    setAiProjectTrees((current) => ({
      ...current,
      [project.id]: markDirectoryError(
        current[project.id] ?? createEmptyLazyFileTree(),
        path,
        err instanceof Error ? err.message : '无法读取目录。',
      ),
    }));
  }
}
```

Update `FileDrawer` props from `App`:

```tsx
aiProjectTrees={aiProjectTrees}
onAiProjectExpandedPathsChange={(project, paths) =>
  setAiProjectTrees((current) => ({
    ...current,
    [project.id]: setLazyExpandedPaths(current[project.id] ?? createEmptyLazyFileTree(), paths),
  }))
}
onLoadProjectDirectory={(project, path) => void loadAiProjectDirectory(project, path)}
```

Remove the old `aiProjectExpandedPaths={aiProjectExpandedPaths}` prop from the `FileDrawer` call.

- [ ] **Step 3: Update FileDrawer AI panel**

In `src/reader/components/FileDrawer.tsx`, add the lazy tree state type import:

```ts
import type { LazyFileTreeState } from '../lazyFileTree';
```

Change `AiProjectsPanelProps` project trees type to `Record<string, LazyFileTreeState>`.

Remove `aiProjectExpandedPaths` and `projectExpandedPaths` from `FileDrawerProps`, `AiProjectsPanelProps`, destructuring, and the `AiProjectsPanel` call. Expansion now comes from each `LazyFileTreeState`.

Render:

```tsx
<ArboristFileTree
  nodes={tree.nodes}
  activePath={activePath}
  expandedPaths={tree.expandedPaths}
  onExpandedPathsChange={(paths) => onProjectExpandedPathsChange(project, paths)}
  onLoadDirectory={(path) => onLoadProjectDirectory(project, path)}
  onSelectFile={(path) => onSelectProjectFile(project, path)}
/>
```

Change `onProjectExpandedPathsChange` prop type to `(project: AiProjectEntry, paths: Set<string>) => void`.

Add `onLoadProjectDirectory` prop.

- [ ] **Step 4: Verify AI project tests pass**

Run:

```bash
npm test -- src/reader/components/FileDrawer.test.tsx src/reader/App.test.tsx --run
```

Expected: PASS.

- [ ] **Step 5: Commit AI migration**

Run:

```bash
git add src/reader/App.tsx src/reader/components/FileDrawer.tsx src/reader/components/FileDrawer.test.tsx src/reader/App.test.tsx
git commit -m "feat: lazy load ai project file trees"
```

Expected: commit succeeds.

---

### Task 9: Preserve File Navigation With Loaded Lazy Trees

**Files:**
- Modify: `src/reader/fileNavigation.ts`
- Modify: `src/reader/fileNavigation.test.ts`
- Modify: `src/reader/App.tsx`

- [ ] **Step 1: Write lazy navigation tests**

Update the top-level imports in `src/reader/fileNavigation.test.ts`, then add this test inside the existing `describe('selectSiblingDocumentNavigation', ...)` block:

```ts
import type { LazyFileTreeNode } from '../shared/types';
import { selectSiblingDocumentNavigationFromLazyTree } from './fileNavigation';

it('selects sibling document navigation from loaded lazy directory branches', () => {
  const tree: LazyFileTreeNode[] = [
    {
      id: 'docs',
      type: 'directory',
      name: 'docs',
      path: 'docs',
      loadState: 'loaded',
      children: [
        { id: 'docs/a.md', type: 'file', name: 'a.md', path: 'docs/a.md' },
        { id: 'docs/b.md', type: 'file', name: 'b.md', path: 'docs/b.md' },
      ],
    },
  ];

  expect(selectSiblingDocumentNavigationFromLazyTree(tree, 'docs/b.md')).toEqual({
    previous: { name: 'a.md', path: 'docs/a.md' },
    next: null,
  });
});
```

Run:

```bash
npm test -- src/reader/fileNavigation.test.ts --run
```

Expected: FAIL because the lazy navigation export does not exist.

- [ ] **Step 2: Implement lazy navigation**

Add to `src/reader/fileNavigation.ts`:

```ts
import type { DocumentFileEntry, FileTreeNode, LazyFileTreeNode } from '../shared/types';
```

Add:

```ts
export function selectSiblingDocumentNavigationFromLazyTree(
  tree: LazyFileTreeNode[],
  activePath: string | null,
): FileNavigation {
  if (!activePath) {
    return { previous: null, next: null };
  }

  const activeDirectory = getDirectoryPath(activePath);
  const directory = activeDirectory ? findLazyDirectory(tree, activeDirectory) : tree;
  const files = directory
    .filter((node): node is Extract<LazyFileTreeNode, { type: 'file' }> => node.type === 'file' && isReadableDocumentFile(node.name))
    .map((node) => ({ name: node.name, path: node.path }));

  return selectAround(files, activePath);
}

function findLazyDirectory(nodes: LazyFileTreeNode[], directoryPath: string): LazyFileTreeNode[] {
  for (const node of nodes) {
    if (node.type !== 'directory') {
      continue;
    }

    if (node.path === directoryPath) {
      return node.children;
    }

    const nested = findLazyDirectory(node.children, directoryPath);
    if (nested.length) {
      return nested;
    }
  }

  return [];
}

function selectAround(files: DocumentFileEntry[], activePath: string): FileNavigation {
  const index = files.findIndex((file) => file.path === activePath);
  if (index < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: files[index - 1] ?? null,
    next: files[index + 1] ?? null,
  };
}
```

Refactor the existing function to reuse `selectAround` instead of duplicating previous/next logic.

- [ ] **Step 3: Wire App navigation to lazy tree**

In `src/reader/App.tsx`, replace the old navigation import:

```ts
import { selectSiblingDocumentNavigationFromLazyTree } from './fileNavigation';
```

Then set `activeNavigationTree` to lazy nodes:

```ts
const activeNavigationTree = useMemo(() => {
  if (activeDocumentSource?.type === 'ai-project') {
    return aiProjectTrees[activeDocumentSource.projectId]?.nodes ?? [];
  }

  return activeDocumentSource?.type === 'folder' ? folderTree.nodes : [];
}, [activeDocumentSource, aiProjectTrees, folderTree.nodes]);

const fileNavigation = useMemo(
  () => selectSiblingDocumentNavigationFromLazyTree(activeNavigationTree, activePath),
  [activeNavigationTree, activePath],
);
```

- [ ] **Step 4: Verify navigation tests pass**

Run:

```bash
npm test -- src/reader/fileNavigation.test.ts src/reader/App.test.tsx --run
```

Expected: PASS.

- [ ] **Step 5: Commit navigation support**

Run:

```bash
git add src/reader/fileNavigation.ts src/reader/fileNavigation.test.ts src/reader/App.tsx
git commit -m "feat: support navigation in lazy file trees"
```

Expected: commit succeeds.

---

### Task 10: Remove Legacy FileTree Usage And Tighten Tests

**Files:**
- Delete: `src/reader/components/FileTree.tsx`
- Delete: `src/reader/components/FileTree.test.tsx`
- Modify: `src/reader/components/FileDrawer.tsx`
- Modify: `src/reader/App.test.tsx`

- [ ] **Step 1: Search for legacy usage**

Run:

```bash
rg "FileTree|FileTreeNode|scanMarkdownDirectory|folderExpandedPaths|aiProjectExpandedPaths" src/reader src/shared
```

Expected: production `FileTree` imports are gone. Legacy `FileTreeNode` type and recursive scan tests may remain only for compatibility APIs outside the drawer UI.

- [ ] **Step 2: Delete legacy component**

Delete the legacy recursive component after `FileDrawer` and tests have migrated:

```bash
git rm src/reader/components/FileTree.tsx src/reader/components/FileTree.test.tsx
```

- [ ] **Step 3: Update tests to Arborist**

Move active-scroll and collapse behavior coverage into `src/reader/components/ArboristFileTree.test.tsx`:

```tsx
it('lets users collapse the directory containing the active file', async () => {
  const user = userEvent.setup();
  const nodes: LazyFileTreeNode[] = [
    {
      id: 'docs',
      type: 'directory',
      name: 'docs',
      path: 'docs',
      loadState: 'loaded',
      children: [{ id: 'docs/guide.md', type: 'file', name: 'guide.md', path: 'docs/guide.md' }],
    },
  ];
  const onExpandedPathsChange = vi.fn();

  render(
    <ArboristFileTree
      nodes={nodes}
      activePath="docs/guide.md"
      expandedPaths={new Set(['docs'])}
      onExpandedPathsChange={onExpandedPathsChange}
      onLoadDirectory={vi.fn()}
      onSelectFile={vi.fn()}
    />,
  );

  await user.click(screen.getByRole('treeitem', { name: 'docs' }));

  expect(onExpandedPathsChange).toHaveBeenCalledWith(new Set());
});
```

- [ ] **Step 4: Verify no legacy production dependency remains**

Run:

```bash
rg "from './FileTree'|from \"./FileTree\"" src
```

Expected: no output.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/reader/components/ArboristFileTree.test.tsx src/reader/components/FileDrawer.test.tsx src/reader/App.test.tsx --run
```

Expected: PASS.

- [ ] **Step 6: Commit cleanup**

Run:

```bash
git add src/reader/components src/reader/App.test.tsx
git commit -m "refactor: replace legacy file tree component"
```

Expected: commit succeeds.

---

### Task 11: Performance Guardrails For 100,000 Reachable Nodes

**Files:**
- Create: `src/reader/components/ArboristFileTree.performance.test.tsx`
- Modify: `src/reader/components/ArboristFileTree.tsx`

- [ ] **Step 1: Write a virtual rendering guard test**

Create `src/reader/components/ArboristFileTree.performance.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArboristFileTree } from './ArboristFileTree';
import type { LazyFileTreeNode } from '../../shared/types';

function createLargeLoadedTree(count: number): LazyFileTreeNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `file-${index}.md`,
    type: 'file',
    name: `file-${index}.md`,
    path: `file-${index}.md`,
  }));
}

function createUnloadedDirectoryRoots(directoryCount: number): LazyFileTreeNode[] {
  return Array.from({ length: directoryCount }, (_, directoryIndex) => ({
    id: `dir-${directoryIndex}`,
    type: 'directory',
    name: `dir-${directoryIndex}`,
    path: `dir-${directoryIndex}`,
    loadState: 'unloaded',
    children: [],
  }));
}

describe('ArboristFileTree performance guardrails', () => {
  it('does not mount every row for a very large loaded root', () => {
    render(
      <div style={{ height: 420 }}>
        <ArboristFileTree
          nodes={createLargeLoadedTree(100_000)}
          activePath={null}
          expandedPaths={new Set()}
          onExpandedPathsChange={vi.fn()}
          onLoadDirectory={vi.fn()}
          onSelectFile={vi.fn()}
        />
      </div>,
    );

    expect(screen.getAllByRole('treeitem').length).toBeLessThan(200);
  });

  it('keeps reachable descendants out of Arborist data until a directory is loaded', async () => {
    const user = userEvent.setup();
    const onLoadDirectory = vi.fn();

    render(
      <div style={{ height: 420 }}>
        <ArboristFileTree
          nodes={createUnloadedDirectoryRoots(1_000)}
          activePath={null}
          expandedPaths={new Set()}
          onExpandedPathsChange={vi.fn()}
          onLoadDirectory={onLoadDirectory}
          onSelectFile={vi.fn()}
        />
      </div>,
    );

    expect(screen.getAllByRole('treeitem').length).toBeLessThan(200);
    expect(screen.queryByRole('treeitem', { name: 'file-0.md' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('treeitem', { name: 'dir-0' }));

    expect(onLoadDirectory).toHaveBeenCalledWith('dir-0');
    expect(screen.queryByRole('treeitem', { name: 'file-0.md' })).not.toBeInTheDocument();
  });
});
```

Run:

```bash
npm test -- src/reader/components/ArboristFileTree.performance.test.tsx --run
```

Expected: PASS. The wrapper already provides `FALLBACK_TREE_HEIGHT`, so this test must not depend on jsdom layout measurement.

- [ ] **Step 2: Commit performance guard**

Run:

```bash
git add src/reader/components/ArboristFileTree.performance.test.tsx src/reader/components/ArboristFileTree.tsx
git commit -m "test: guard large file tree virtualization"
```

Expected: commit succeeds.

---

### Task 12: Final Verification

**Files:**
- No planned source changes unless verification finds defects.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test -- --run
```

Expected: all test files pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: exits 0. Existing Vite/chunk warnings are acceptable only if they match pre-existing warnings and no new error appears.

- [ ] **Step 4: Manual browser smoke test**

Run:

```bash
npm run dev
```

Expected:
- Opening a large folder renders root entries quickly.
- Clicking a directory shows loading feedback and then children.
- Re-clicking an expanded directory collapses it.
- Opening a file from the tree does not jump the file drawer.
- Reload directory refreshes loaded directories without freezing the UI.
- Restoring the last document opens the file and expands the loaded ancestor path.

- [ ] **Step 5: Commit final fixes if needed**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: stabilize lazy arborist file tree"
```

Expected: commit succeeds only if there are actual changes.

---

## Rollback Strategy

- Keep legacy recursive scanner functions until all folder and AI project flows pass with lazy APIs.
- If Arborist integration has blocking browser behavior, revert only the component wrapper and keep the lazy file-system/model work; the lazy model can still feed a custom virtual tree using `@tanstack/react-virtual`.
- If lazy restore introduces edge cases, keep direct file opening by path and temporarily skip visual tree hydration for the remembered path rather than falling back to full recursive scans.

## Self-Review

- Spec coverage: The plan covers Arborist dependency, lazy scanning, lazy state, component rendering, folder migration, remembered document hydration, AI project migration, navigation, legacy cleanup, performance guardrails, and final verification.
- Completeness scan: No incomplete markers or intentionally unfinished implementation steps remain.
- Type consistency: The plan consistently uses `LazyFileTreeNode`, `LazyFileTreeState`, `DirectoryScanSession`, `hydrateDirectoryPath`, and `ArboristFileTree`.
- Scope check: The implementation is focused on read-only file trees. Editing, drag/drop, global search, and deep recursive refresh are intentionally excluded from 2.0.
- P0/P1 review risks addressed: Arborist expansion uses `openByDefault={false}` plus the verified `initialOpenState`/`TreeApi` contract instead of relying on Arborist's default-open behavior; row-level ARIA stays on Arborist rows instead of nested `treeitem` nodes; nested lazy loading uses per-root `DirectoryScanSession` handle caches instead of repeatedly walking from the root; reload orders loaded directories by path depth and prunes stale expanded paths; stale loaded paths are distinguished from real permission/I/O failures; and performance tests cover both virtual DOM count and the requirement that unloaded reachable descendants are not supplied to Arborist.
