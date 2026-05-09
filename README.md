# Local Markdown Reader / 本地 Markdown 阅读器

A local-first Chrome/Edge Manifest V3 extension for reading Markdown folders with a document outline, file switching, and selectable reading styles.

一个本地优先的 Chrome/Edge Manifest V3 扩展，用于阅读本地 Markdown 文件夹，支持文档大纲、文件切换和可更换阅读样式。

## Features / 功能

- Open a local folder and browse Markdown files after explicit folder authorization.
- Render GitHub-flavored Markdown with headings, tables, task lists, code blocks, math-ready syntax, and diagrams-ready syntax.
- Show a document outline generated from Markdown headings.
- Switch between sibling Markdown files in the authorized folder.
- Choose reader theme, content width, raw Markdown mode, and reading style templates.

- 在用户明确授权文件夹后，读取并浏览其中的 Markdown 文件。
- 渲染 GitHub Flavored Markdown，支持标题、表格、任务列表、代码块，以及面向公式和图表的语法基础。
- 根据 Markdown 标题生成文档大纲。
- 在已授权文件夹内切换其他 Markdown 文件。
- 可切换阅读主题、正文宽度、Raw Markdown 模式和阅读样式模板。

## Reading Styles / 阅读样式

The reader includes style templates that can be changed from the reader toolbar or popup:

阅读器内置可更换的样式模板，可以在 reader 工具栏或扩展弹窗中切换：

- `Clean Doc`: default document style for PRDs, technical docs, and structured notes.
- `GitHub`: GitHub-like Markdown presentation.
- `Paper`: roomier long-form reading style.
- `Classic`: closer to the original simple rendering style.

- `Clean Doc`：默认文档风格，适合 PRD、技术文档和结构化笔记。
- `GitHub`：接近 GitHub Markdown 的展示方式。
- `Paper`：留白更充足的长文阅读风格。
- `Classic`：更接近原始的简单渲染样式。

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
3. In the reader, click "Open Folder".
4. Choose `fixtures/sample-docs`.
5. Confirm the file drawer can switch between `README.md`, `docs/guide.md`, and `docs/api.md`.
6. Confirm the outline panel lists headings for the current document.
7. In `README.md`, click the relative links to Guide and API.
8. Switch `Style` between `Clean Doc`, `GitHub`, `Paper`, and `Classic`.
9. Confirm the sample table, task list, code block, Mermaid block, and MathJax formula are visible in rendered Markdown.

1. 点击扩展图标。
2. 点击 “Open Reader”。
3. 在 reader 页面点击 “Open Folder”。
4. 选择 `fixtures/sample-docs`。
5. 确认左侧文件抽屉可以在 `README.md`、`docs/guide.md` 和 `docs/api.md` 之间切换。
6. 确认右侧大纲会展示当前文档的标题结构。
7. 在 `README.md` 中点击指向 Guide 和 API 的相对链接。
8. 在 `Style` 中切换 `Clean Doc`、`GitHub`、`Paper` 和 `Classic`。
9. 确认示例表格、任务列表、代码块、Mermaid 代码块和 MathJax 公式都能在渲染后的 Markdown 中看到。

## Notes / 说明

Folder navigation uses the File System Access API. The `file://` content script only provides a compatibility entry and cannot enumerate sibling files without explicit folder authorization.

文件夹导航依赖 File System Access API。`file://` content script 只提供兼容入口；如果没有用户明确授权文件夹，它不能枚举同级文件。
