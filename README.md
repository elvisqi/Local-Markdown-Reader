# Local Markdown Reader / 本地 Markdown 阅读器

A local-first Chrome/Edge Manifest V3 extension for reading Markdown folders with a document outline, file switching, and selectable reading styles.

一个本地优先的 Chrome/Edge Manifest V3 扩展，用于阅读本地 Markdown 文件夹，支持文档大纲、文件切换和可更换阅读样式。

## Features / 功能

- Open a local folder and browse Markdown files after explicit folder authorization.
- Render GitHub-flavored Markdown with headings, tables, task lists, code blocks, math-ready syntax, and diagrams-ready syntax.
- Show a document outline generated from Markdown headings.
- Switch between sibling Markdown files in the authorized folder.
- Restore the last opened Markdown document when browser folder permission is still available.
- Choose reader theme, content width, raw Markdown mode, and reading style templates.
- Open large Markdown files in a safe mode that avoids compiling or mounting the full document at once.

- 在用户明确授权文件夹后，读取并浏览其中的 Markdown 文件。
- 渲染 GitHub Flavored Markdown，支持标题、表格、任务列表、代码块，以及面向公式和图表的语法基础。
- 根据 Markdown 标题生成文档大纲。
- 在已授权文件夹内切换其他 Markdown 文件。
- 如果浏览器仍保留文件夹权限，自动恢复上次打开的 Markdown 文档。
- 可切换阅读主题、正文宽度、Raw Markdown 模式和阅读样式模板。
- 大 Markdown 文件会进入安全模式，避免一次性编译或挂载整篇文档。

## Reading Styles / 阅读样式

The reader includes style templates that can be changed from the extension popup or settings page:

阅读器内置可更换的样式模板，可以在扩展弹窗或设置页中切换：

- `Clean Doc`: default document style for PRDs, technical docs, and structured notes.
- `GitHub`: GitHub-like Markdown presentation.
- `Paper`: roomier long-form reading style.
- `Classic`: closer to the original simple rendering style.

- `Clean Doc`：默认文档风格，适合 PRD、技术文档和结构化笔记。
- `GitHub`：接近 GitHub Markdown 的展示方式。
- `Paper`：留白更充足的长文阅读风格。
- `Classic`：更接近原始的简单渲染样式。

## Large File Reading / 大文件阅读

Markdown files larger than 2MB open in safe large-file mode. This mode reads and displays line windows on demand, builds the document index in a worker, and avoids full-document Markdown rendering so very large files can open without freezing the browser.

2MB 以上的 Markdown 会进入大文件安全模式。安全模式按需读取并展示行窗口，在 Worker 中建立文档索引，并避免整篇 Markdown 渲染，因此可以打开超大文件而不锁死浏览器。

Large-file mode now has two views. Files below 50MB default to chunked Markdown preview, which renders only the active section around the current line. Files at or above 50MB default to virtual raw text, which mounts only visible rows and keeps memory usage bounded.

大文件模式现在包含两种视图。50MB 以下默认使用分块 Markdown 预览，只渲染当前行所在的段落区域；50MB 及以上默认使用虚拟原文视图，只挂载当前可见行，控制内存占用。

The extension popup shows the last remembered document and includes a clear action. If a very large file was remembered and causes trouble on startup, clear that record from the popup before opening the reader again.

扩展弹窗会显示上次记录的文档，并提供清空操作。如果某个超大文件被记录后导致启动异常，可以先在弹窗中清空记录，再重新打开阅读器。

Use the in-page search box in large-file mode. Browser native `Ctrl+F` remains best for ordinary files, but it cannot search text that has not been mounted in a virtual or paged large-file view.

大文件模式下请使用页面内搜索框。浏览器原生 `Ctrl+F` 仍适合普通文件，但无法搜索虚拟/分页大文件视图中尚未挂载到页面的文本。

Very large standalone files opened from a `file://` tab may require explicit authorization through "Open File" or "Open Folder"; this prevents the content script from copying huge source text into extension storage.

通过 `file://` 标签页打开的超大单文件，可能需要通过“打开文件”或“打开文件夹”再次授权读取；这样可以避免 content script 把超大正文复制进扩展存储。

## Development / 开发

Install dependencies:

安装依赖：

```bash
npm install
```

Run checks:

运行检查：

```bash
npm run typecheck
npm test -- --run
npm run build
npm run verify:dist
```

## Load The Extension / 加载扩展

1. Run `npm run build`.
2. Open the Chrome or Edge extensions page.
3. Enable developer mode.
4. Choose "Load unpacked".
5. Select the generated `dist/` folder.

1. 执行 `npm run build`。
2. 打开 Chrome 或 Edge 的扩展管理页面。
3. 开启开发者模式。
4. 选择“加载已解压的扩展”。
5. 选择生成出来的 `dist/` 文件夹。

## Verify With Sample Docs / 使用示例文档验证

1. Click the extension action.
2. Click "Open Reader".
3. In the reader, click "Files", then click "Open Folder" in the drawer.
4. Choose `fixtures/sample-docs`.
5. Confirm the file drawer can switch between `README.md`, `docs/guide.md`, and `docs/api.md`.
6. Confirm the outline panel lists headings for the current document.
7. In `README.md`, click the relative links to Guide and API.
8. Reload the reader and confirm it restores the last opened document, or offers "Restore last document" if permission must be renewed.
9. Switch `Style` between `Clean Doc`, `GitHub`, `Paper`, and `Classic` from the extension popup or settings page.
10. Confirm the sample table, task list, code block, Mermaid block, and MathJax formula are visible in rendered Markdown.

1. 点击扩展图标。
2. 点击 “Open Reader”。
3. 在 reader 页面点击“文件”，再在文件抽屉中点击“打开文件夹”。
4. 选择 `fixtures/sample-docs`。
5. 确认左侧文件抽屉可以在 `README.md`、`docs/guide.md` 和 `docs/api.md` 之间切换。
6. 确认右侧大纲会展示当前文档的标题结构。
7. 在 `README.md` 中点击指向 Guide 和 API 的相对链接。
8. 重新加载 reader，确认它会恢复上次打开的文档；如果需要重新授权，则会显示“恢复上次文档”。
9. 在扩展弹窗或设置页的 `样式` 中切换 `Clean Doc`、`GitHub`、`Paper` 和 `Classic`。
10. 确认示例表格、任务列表、代码块、Mermaid 代码块和 MathJax 公式都能在渲染后的 Markdown 中看到。

## Notes / 说明

Folder navigation uses the File System Access API. The `file://` content script only provides a compatibility entry and cannot enumerate sibling files without explicit folder authorization.

文件夹导航依赖 File System Access API。`file://` content script 只提供兼容入口；如果没有用户明确授权文件夹，它不能枚举同级文件。
