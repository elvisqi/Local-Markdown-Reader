# Local Markdown Reader

A local-first Chrome/Edge Manifest V3 extension for reading Markdown folders.

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run typecheck
npm test -- --run
npm run build
```

## Load The Extension

1. Run `npm run build`.
2. Open Chrome or Edge extensions page.
3. Enable developer mode.
4. Choose "Load unpacked".
5. Select the generated `dist/` folder.

## Verify With Sample Docs

1. Click the extension action.
2. Click "Open Reader".
3. In the reader, click "Open Folder".
4. Choose `fixtures/sample-docs`.
5. Confirm the file drawer can switch between `README.md`, `docs/guide.md`, and `docs/api.md`.
6. Confirm the outline panel lists headings for the current document.
7. In `README.md`, click the relative links to Guide and API.
8. Confirm the sample table, task list, code block, Mermaid block, and MathJax formula are visible in rendered Markdown.

## Notes

Folder navigation uses the File System Access API. The `file://` content script only provides a compatibility entry and cannot enumerate sibling files without explicit folder authorization.
