# Local-First Markdown Reader Extension Design

## Summary

Build a local-first Chrome/Edge Manifest V3 extension for reading Markdown documents. The primary experience is an extension-owned reader page that can open a user-authorized local folder, recursively list Markdown files, render the current document, show the document outline, and let users switch between files quickly.

The existing `5.3_0` extension remains a reference for feature coverage, but the new implementation should use current npm packages instead of copied vendor files. Dependencies must be checked against the latest stable npm versions before implementation.

## Goals

- Render local Markdown files with a polished reading experience.
- Let users authorize a local folder and switch between Markdown files inside it.
- Support recursive file tree navigation for nested documentation folders.
- Show a document outline generated from headings in the current Markdown file.
- Support GFM tables/task lists, frontmatter title extraction, heading anchors, relative Markdown links, images, code highlighting, Mermaid, MathJax, custom CSS, themes, reading width, raw/html mode, and auto reload.
- Keep the popup lightweight and move low-frequency controls into a full options page.
- Keep host permissions small in the first version; arbitrary website Markdown support is out of scope.

## Non-Goals

- Editing, saving, renaming, deleting, or writing local files.
- Cloud sync, remote repository sync, or multi-workspace management.
- Full-text search.
- Previewing non-Markdown formats such as PDF, Word, or spreadsheets.
- General-purpose support for arbitrary remote Markdown URLs.

## Product Shape

### Reader Page

The reader page is the main product surface. Users open it from the popup, authorize a local folder, and read documents inside that folder.

The layout uses a file drawer plus a persistent outline panel:

- The file drawer lists Markdown files from the authorized folder as a recursive tree.
- The main content area renders the active Markdown document.
- The outline panel shows headings from the active document and stays visible on desktop.
- On narrow screens, the file drawer and outline collapse into modal or drawer surfaces.

### Popup

The popup is a quick-control surface:

- Open reader.
- Open current file in reader when invoked from a compatible `file://` Markdown tab.
- Toggle common reading preferences such as theme, width, raw/html mode, outline visibility, and auto reload.
- Link to options.

### Options Page

The options page is the complete settings center:

- Markdown rendering settings.
- Code highlighting settings.
- Mermaid, MathJax, emoji, and custom CSS settings.
- File access status and help.
- Extension UI theme and icon preferences.

### `file://` Compatibility Entry

The extension should still support users who directly open a local Markdown file in the browser. This path is a compatibility entry, not the main architecture.

For `file://*.md` pages, a content script can provide basic rendering and an affordance to open the file in the reader. It cannot enumerate sibling files from `file:///*` permission alone. Folder navigation requires user directory authorization through the File System Access API.

## Architecture

Use a Manifest V3 extension with a modern TypeScript build.

Recommended stack:

- Vite
- TypeScript
- React
- A Vite-compatible MV3 extension plugin, such as `@crxjs/vite-plugin`, if it remains current and well maintained at implementation time
- Vitest and Testing Library for unit and component tests
- Playwright or manual unpacked-extension checks for integration verification

Main modules:

- `background service worker`: extension entry points, default settings, messaging, context menus or action behavior if needed.
- `reader page`: folder authorization, file tree, document rendering, local navigation, scroll restoration.
- `popup`: lightweight quick controls.
- `options page`: full settings UI.
- `content script`: `file://` compatibility entry.
- `shared`: rendering pipeline, settings store, file-system helpers, path utilities, and types.

## Markdown Rendering Engine

Use the unified ecosystem as the primary Markdown engine because the reader needs structured document data, not only HTML output.

Recommended pipeline:

- `unified`
- `remark-parse`
- `remark-gfm`
- `remark-frontmatter`
- `remark-math`
- custom remark plugin for outline extraction and metadata
- `remark-rehype`
- `rehype-slug`
- `rehype-autolink-headings`
- `rehype-sanitize`
- `rehype-stringify`

The render pipeline should expose a pure API:

```ts
type RenderResult = {
  html: string;
  outline: OutlineItem[];
  title: string | null;
  links: MarkdownLink[];
  diagnostics: RenderDiagnostic[];
};
```

Mermaid, MathJax, and code highlighting are rendering enhancements layered around the Markdown pipeline:

- Mermaid code blocks are detected and rendered client-side after Markdown conversion.
- Math expressions are parsed through `remark-math` and rendered with MathJax.
- Code highlighting uses Shiki or another current high-quality highlighter selected during implementation. The implementation should prefer a good reading experience and theme integration over copying the reference extension's Prism vendor files.

## Local Folder Access

Folder navigation depends on the File System Access API, not on `file:///*` extension permissions.

Flow:

1. User opens `reader.html`.
2. Reader asks the user to open a folder with `showDirectoryPicker()`.
3. Reader receives a `FileSystemDirectoryHandle`.
4. Reader recursively scans the folder for Markdown files.
5. Reader builds a file tree and opens a default document.
6. Reader stores enough handle/state locally to try permission restoration in a later session.

File discovery:

- Include Markdown extensions such as `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mdtxt`, and `.mdtext`.
- Consider `.mdx` only if the implementation explicitly chooses how to handle JSX safely. Otherwise leave MDX out of the first release.
- Ignore hidden directories and common large/generated directories such as `.git`, `node_modules`, `dist`, `build`, `coverage`, and `.cache`.
- Show scan progress and a clear empty state when no Markdown files are found.

Default document selection:

1. `README.md`, case-insensitive.
2. `index.md`, case-insensitive.
3. First Markdown file in sorted tree order.

## Local Navigation Rules

Relative links are part of the core reading experience.

- Markdown links to other Markdown files open inside the reader.
- Link hashes such as `docs/api.md#install` open the target file and scroll to the heading anchor.
- Same-file hash links scroll inside the current document.
- Relative image links are resolved through the authorized folder handle and displayed as blob URLs.
- Missing Markdown links show a lightweight inline or toast error while keeping the original path visible.
- Non-Markdown file links remain as external/openable links for the first version.

## State And Persistence

Use `chrome.storage.sync` for user preferences that should follow the user:

- Theme
- Reading width
- Raw/html mode
- Outline visibility
- Rendering feature toggles
- Custom CSS metadata, with storage limits respected

Use `chrome.storage.local` or IndexedDB for local reader state:

- Directory handle references, if supported by browser storage constraints
- Last opened file path
- Expanded file tree nodes
- Per-file scroll positions
- Recent folder metadata

Permission restoration must be explicit and failure-tolerant. If a stored handle is no longer usable, the reader asks the user to choose the folder again.

## Components

- `FolderPicker`: requests folder authorization and handles permission failure states.
- `FileDrawer`: responsive drawer that contains file navigation.
- `FileTree`: recursive Markdown file tree with keyboard-accessible navigation.
- `DocumentReader`: renders trusted sanitized HTML and coordinates post-render enhancements.
- `OutlinePanel`: heading tree for the current document.
- `ReaderToolbar`: current file title, drawer button, theme/width controls, raw/html toggle.
- `RenderPipeline`: pure Markdown-to-render-result module.
- `SettingsStore`: typed access to extension settings.
- `FileSystemStore`: directory scanning, file reading, path resolution, and permission checks.

## Error Handling

- Directory permission denied: stay on an empty state with a clear button to try again.
- Directory permission lost: request permission again before reading or scanning.
- Large folder scan: show scanning status, skip ignored folders, and keep the UI responsive.
- Markdown render failure: show an error panel and provide raw Markdown view.
- Mermaid or MathJax block failure: show a localized error at that block, not a whole-page failure.
- Missing relative target: show a non-blocking error with the unresolved path.
- Image load failure: show a small placeholder with the image path.

## Security And Privacy

- Do not request broad remote host permissions in the first release.
- Do not upload local file contents.
- Sanitize rendered HTML with `rehype-sanitize` before injection.
- Treat custom CSS as user-provided local preference and enforce storage limits.
- Avoid evaluating Markdown content as JavaScript.
- Keep folder access user-initiated through browser permission prompts.

## Testing Strategy

Follow test-first implementation for behavior modules.

Unit tests:

- Markdown render pipeline outputs HTML, title, outline, links, and diagnostics.
- Heading slug generation and duplicate heading handling.
- Frontmatter title extraction.
- Relative Markdown link resolution.
- Image path resolution.
- File extension filtering and ignored directory rules.

Component tests:

- `FileTree` renders nested Markdown files and supports selection.
- `OutlinePanel` renders nested headings and emits anchor navigation.
- Settings controls update stored preferences.

Integration verification:

- Load the unpacked extension in Chrome or Edge.
- Open reader, authorize a local fixture folder, and scan nested Markdown files.
- Switch files through the drawer.
- Click relative Markdown links and hash links.
- Render GFM tables/tasks, code blocks, Mermaid, and MathJax.
- Refresh reader and confirm settings and scroll state restore where supported.

## Open Implementation Notes

- Confirm the latest stable package versions immediately before implementation.
- Decide between Shiki and another highlighter during implementation based on bundle size, theme quality, and MV3 compatibility.
- Confirm the best MV3 Vite plugin at implementation time; if `@crxjs/vite-plugin` is not current enough, choose a maintained alternative or use explicit Vite multi-entry builds.
- MDX is intentionally not included unless a safe non-executing MDX rendering plan is added.
