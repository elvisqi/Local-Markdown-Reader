# Local-First Markdown Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working local-first Chrome/Edge MV3 Markdown reader with an extension reader page, recursive folder navigation, document outline, and core Markdown rendering.

**Architecture:** Create a Vite + React + TypeScript MV3 extension. Keep behavior-heavy code in tested shared modules, then wire those modules into reader, popup, options, background, and content-script surfaces.

**Tech Stack:** Vite 8, TypeScript 6, React 19, @crxjs/vite-plugin, Vitest, Testing Library, unified/remark/rehype, Shiki, Mermaid.

---

## File Structure

- `package.json`: scripts and current stable npm dependencies.
- `vite.config.ts`: MV3 build configuration.
- `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `src/test/setup.ts`: TypeScript and test setup.
- `src/manifest.ts`: typed MV3 manifest.
- `src/background/index.ts`: extension action setup and message handling.
- `src/shared/types.ts`: shared types for settings, render results, files, and diagnostics.
- `src/shared/settings.ts`: default settings and chrome storage helpers.
- `src/shared/fileSystem.ts`: Markdown file filtering, recursive tree building, ignored directory rules, and path helpers.
- `src/shared/render/markdown.ts`: unified render pipeline.
- `src/shared/render/links.ts`: relative Markdown/image link resolution helpers.
- `src/reader/*`: reader app, file drawer, file tree, outline, toolbar, and styles.
- `src/popup/*`: lightweight popup app.
- `src/options/*`: settings app.
- `src/content/fileCompat.ts`: `file://` compatibility entry.
- `src/**/*.test.ts(x)`: tests for behavior and components.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `reader.html`
- Create: `popup.html`
- Create: `options.html`
- Create: `src/test/setup.ts`
- Create: `src/manifest.ts`
- Create: `src/background/index.ts`
- Create: `src/reader/main.tsx`
- Create: `src/popup/main.tsx`
- Create: `src/options/main.tsx`
- Create: `src/content/fileCompat.ts`

- [ ] **Step 1: Create project configuration and empty extension entries**

Create a Vite React TypeScript extension scaffold with one reader page, one popup page, one options page, one service worker, and one content script.

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Verify baseline build and tests**

Run:

```bash
npm run typecheck
npm test -- --run
npm run build
```

Expected: all commands pass with the empty scaffold.

- [ ] **Step 4: Commit scaffold**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json vitest.config.ts index.html reader.html popup.html options.html src
git commit -m "chore: scaffold mv3 reader extension"
```

## Task 2: Shared Types And Settings

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/settings.ts`
- Test: `src/shared/settings.test.ts`

- [ ] **Step 1: Write failing tests for default settings and merge behavior**

Tests must assert that defaults include reading, rendering, and UI settings, and that partial stored settings merge without dropping new defaults.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- --run src/shared/settings.test.ts
```

Expected: fails because `settings.ts` does not exist or exports are missing.

- [ ] **Step 3: Implement shared types and settings helpers**

Implement typed defaults and helpers:

- `DEFAULT_SETTINGS`
- `mergeSettings(input)`
- `loadSettings(area?)`
- `saveSettings(settings, area?)`

The storage helpers must work when `chrome.storage` is unavailable by returning defaults and no-op saving, so unit tests can run outside an extension.

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm test -- --run src/shared/settings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit settings module**

```bash
git add src/shared/types.ts src/shared/settings.ts src/shared/settings.test.ts
git commit -m "feat: add typed reader settings"
```

## Task 3: File System Tree Helpers

**Files:**
- Create: `src/shared/fileSystem.ts`
- Test: `src/shared/fileSystem.test.ts`

- [ ] **Step 1: Write failing tests for Markdown filtering and tree construction**

Tests must cover:

- accepted extensions: `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mdtxt`, `.mdtext`
- rejected `.mdx`
- ignored directories: hidden directories, `.git`, `node_modules`, `dist`, `build`, `coverage`, `.cache`
- default document selection prefers `README.md`, then `index.md`, then sorted first file
- path normalization with `/`

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- --run src/shared/fileSystem.test.ts
```

Expected: fails because helpers are missing.

- [ ] **Step 3: Implement file-system helpers**

Implement pure helpers:

- `isMarkdownFile(name: string): boolean`
- `shouldIgnoreDirectory(name: string): boolean`
- `normalizePath(parts: string[]): string`
- `sortFileEntries(entries: FileTreeNode[]): FileTreeNode[]`
- `selectDefaultDocument(tree: FileTreeNode[]): string | null`
- `flattenMarkdownFiles(tree: FileTreeNode[]): MarkdownFileEntry[]`

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm test -- --run src/shared/fileSystem.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit file-system helpers**

```bash
git add src/shared/fileSystem.ts src/shared/fileSystem.test.ts
git commit -m "feat: add markdown file tree helpers"
```

## Task 4: Markdown Render Pipeline

**Files:**
- Create: `src/shared/render/markdown.ts`
- Create: `src/shared/render/links.ts`
- Test: `src/shared/render/markdown.test.ts`
- Test: `src/shared/render/links.test.ts`

- [ ] **Step 1: Write failing render tests**

Tests must assert:

- GFM table output contains a table.
- Task list output contains checkboxes.
- YAML frontmatter title is extracted and removed from HTML.
- Headings create outline entries with stable slugs.
- Duplicate headings get unique slugs.
- Mermaid fenced blocks keep a detectable `language-mermaid` code block.
- Relative Markdown links are detected in `links`.

- [ ] **Step 2: Write failing link resolution tests**

Tests must assert:

- `docs/api.md#install` resolves to path `docs/api.md` and hash `install`.
- `#intro` resolves as a same-file hash.
- `../README.md` normalizes relative to the current file directory.
- non-Markdown links are classified as external.

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
npm test -- --run src/shared/render/markdown.test.ts src/shared/render/links.test.ts
```

Expected: fails because render modules are missing.

- [ ] **Step 4: Implement render and link modules**

Implement:

- `renderMarkdown(markdown: string, options?: RenderOptions): Promise<RenderResult>`
- `resolveMarkdownHref(href: string, currentPath: string): ResolvedLink`

Use unified/remark/rehype with `rehype-sanitize`. Extract outline from mdast headings before HTML conversion.

- [ ] **Step 5: Verify render tests pass**

Run:

```bash
npm test -- --run src/shared/render/markdown.test.ts src/shared/render/links.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit render pipeline**

```bash
git add src/shared/render src/shared/types.ts
git commit -m "feat: add markdown render pipeline"
```

## Task 5: Reader UI Shell

**Files:**
- Create: `src/reader/App.tsx`
- Create: `src/reader/App.css`
- Create: `src/reader/components/FileDrawer.tsx`
- Create: `src/reader/components/FileTree.tsx`
- Create: `src/reader/components/OutlinePanel.tsx`
- Create: `src/reader/components/ReaderToolbar.tsx`
- Modify: `src/reader/main.tsx`
- Test: `src/reader/components/FileTree.test.tsx`
- Test: `src/reader/components/OutlinePanel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Tests must assert:

- `FileTree` renders nested folders/files and calls `onSelect(path)` when a Markdown file is clicked.
- `OutlinePanel` renders nested heading anchors and calls `onNavigate(slug)` when clicked.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- --run src/reader/components/FileTree.test.tsx src/reader/components/OutlinePanel.test.tsx
```

Expected: fails because components are missing.

- [ ] **Step 3: Implement reader components and shell**

Build a polished reader shell:

- toolbar at top
- file drawer opened by button
- main reading column
- right outline panel on desktop
- responsive drawer behavior on mobile
- empty state with "Open Folder" button

- [ ] **Step 4: Verify component tests pass**

Run:

```bash
npm test -- --run src/reader/components/FileTree.test.tsx src/reader/components/OutlinePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit reader UI shell**

```bash
git add src/reader
git commit -m "feat: add reader shell"
```

## Task 6: Browser File-System Integration

**Files:**
- Create: `src/reader/fileSystemAccess.ts`
- Modify: `src/reader/App.tsx`
- Test: `src/reader/fileSystemAccess.test.ts`

- [ ] **Step 1: Write failing tests for directory handle scanning**

Use lightweight fake directory handles to test recursive scanning, ignored directories, and Markdown-only results.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- --run src/reader/fileSystemAccess.test.ts
```

Expected: fails because scanner is missing.

- [ ] **Step 3: Implement File System Access wrapper**

Implement:

- `openDirectory(): Promise<FileSystemDirectoryHandle>`
- `scanMarkdownDirectory(handle): Promise<FileTreeNode[]>`
- `readMarkdownFile(handle, path): Promise<string>`
- `readAssetBlobUrl(handle, path): Promise<string | null>`

Guard all browser-only APIs with clear unsupported errors.

- [ ] **Step 4: Wire scanner into reader**

Reader can open a folder, scan files, choose default document, read Markdown, render it, and switch files from the drawer.

- [ ] **Step 5: Verify tests pass**

Run:

```bash
npm test -- --run src/reader/fileSystemAccess.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit file-system integration**

```bash
git add src/reader src/shared
git commit -m "feat: connect reader to local folders"
```

## Task 7: Popup, Options, Background, Content Compatibility

**Files:**
- Create: `src/popup/App.tsx`
- Create: `src/popup/App.css`
- Create: `src/options/App.tsx`
- Create: `src/options/App.css`
- Modify: `src/background/index.ts`
- Modify: `src/content/fileCompat.ts`
- Modify: `src/manifest.ts`

- [ ] **Step 1: Implement popup quick controls**

Popup includes open reader, theme, width, raw/html, outline, auto reload, and options link.

- [ ] **Step 2: Implement options page**

Options page includes rendering toggles for syntax, Mermaid, MathJax, emoji, and a custom CSS textarea that saves to settings.

- [ ] **Step 3: Implement background action behavior**

Background opens reader when needed and exposes any simple runtime messages required by popup/content.

- [ ] **Step 4: Implement file compatibility content script**

For compatible `file://` Markdown documents, inject a small banner that opens the reader and explains that folder navigation requires opening a folder in the reader.

- [ ] **Step 5: Verify build**

Run:

```bash
npm run typecheck
npm test -- --run
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit extension surfaces**

```bash
git add src popup.html options.html reader.html vite.config.ts
git commit -m "feat: add extension popup options and file entry"
```

## Task 8: Final Verification And Documentation

**Files:**
- Create: `README.md`
- Create: `fixtures/sample-docs/README.md`
- Create: `fixtures/sample-docs/docs/guide.md`
- Create: `fixtures/sample-docs/docs/api.md`
- Create: `fixtures/sample-docs/assets/example.svg`

- [ ] **Step 1: Add README and sample docs**

Document:

- install dependencies
- build extension
- load `dist/` as unpacked extension
- open reader
- authorize `fixtures/sample-docs`
- verify file tree, outline, links, Mermaid, MathJax, and code blocks

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run typecheck
npm test -- --run
npm run build
```

Expected: all pass.

- [ ] **Step 3: Inspect built manifest**

Run:

```bash
node -e "const m=require('./dist/manifest.json'); console.log(m.manifest_version, m.name, m.permissions)"
```

Expected: prints Manifest V3 and the expected minimal permissions.

- [ ] **Step 4: Commit docs and fixtures**

```bash
git add README.md fixtures
git commit -m "docs: add local reader verification guide"
```

## Self-Review

- Spec coverage: the plan covers scaffold, settings, file tree, render pipeline, reader layout, local folder access, popup/options/content compatibility, and verification docs.
- Intentional deferral: full custom CSS editing, persistent directory handle restoration, and deep Mermaid/MathJax runtime error boundaries can be improved after the first working vertical slice if they are too large for the initial implementation.
- Placeholder scan: no placeholder tasks remain; every task has concrete files, commands, and expected outcomes.
