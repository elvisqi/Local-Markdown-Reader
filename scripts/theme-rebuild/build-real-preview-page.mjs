import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildInstalledThemeStylesheetFromPackage } from '../../src/shared/themeStylesheet.js';
import { buildRealPreviewFixtureBody } from './realPreviewFixture.mjs';

export async function buildRealPreviewPages({ rootDir = process.cwd(), themes }) {
  const outputDir = resolve(rootDir, 'themes/previews/real-dom');
  await mkdir(outputDir, { recursive: true });
  await Promise.all(themes.map((theme) => (
    writeFile(resolve(outputDir, `${theme.id}.html`), renderPreviewPage(theme), 'utf8')
  )));
  return {
    pages: themes.length,
  };
}

function renderPreviewPage(theme) {
  const stylesheet = buildInstalledThemeStylesheetFromPackage(theme);
  const fixture = buildRealPreviewFixtureBody();
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(theme.name)} preview</title>
    <script>
      const captureParams = new URLSearchParams(location.search);
      document.documentElement.dataset.captureMode = captureParams.get('mode') || 'both';
      document.documentElement.dataset.captureTarget = captureParams.get('target') || 'document';
    </script>
    <style>
      body { margin: 0; background: #111827; font-family: Inter, Arial, sans-serif; }
      .preview-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
      .preview-mode { min-width: 0; padding: 16px; overflow: auto; }
      html[data-capture-mode="light"] .preview-grid, html[data-capture-mode="dark"] .preview-grid { grid-template-columns: 1fr; }
      html[data-capture-mode="light"] .preview-mode--dark, html[data-capture-mode="dark"] .preview-mode--light { display: none; }
      html[data-capture-target="table"] .reader-toolbar,
      html[data-capture-target="table"] .file-tree,
      html[data-capture-target="table"] .outline-panel,
      html[data-capture-target="mermaid"] .reader-toolbar,
      html[data-capture-target="mermaid"] .file-tree,
      html[data-capture-target="mermaid"] .outline-panel,
      html[data-capture-target="details"] .reader-toolbar,
      html[data-capture-target="details"] .file-tree,
      html[data-capture-target="details"] .outline-panel { display: none !important; }
      html[data-capture-target="table"] .reader-layout,
      html[data-capture-target="mermaid"] .reader-layout,
      html[data-capture-target="details"] .reader-layout { display: block; padding: 0; }
      html[data-capture-target="table"] .document-reader > :not(#capture-table-fullscreen),
      html[data-capture-target="mermaid"] .document-reader > :not(#capture-mermaid) { display: none; }
      html[data-capture-target="details"] .document-reader > :not(.markdown-code-block):not(#capture-table):not(.callout):not(.yaml-reader):not(.json-reader) { display: none !important; }
      html[data-capture-target="details"] .callout-note,
      html[data-capture-target="details"] .callout-success,
      html[data-capture-target="details"] .callout-tip,
      html[data-capture-target="details"] .callout-danger,
      html[data-capture-target="details"] .callout-error,
      html[data-capture-target="details"] .callout-quote { display: none !important; }
      html[data-capture-target="table"] .document-reader,
      html[data-capture-target="mermaid"] .document-reader,
      html[data-capture-target="details"] .document-reader { min-height: calc(100vh - 64px); }
      .preview-mode > [data-reader-theme-id] { min-height: calc(100vh - 32px); background: var(--reader-page-bg); color: var(--reader-text); border-radius: 8px; overflow: hidden; }
      .reader-layout { display: grid; grid-template-columns: 150px minmax(0, 1fr) 190px; gap: 12px; padding: 12px; align-items: start; }
      main { min-width: 0; }
      .document-reader { min-width: 0; padding: 18px; background: var(--reader-surface); border: 1px solid var(--reader-border); overflow-wrap: anywhere; }
      .reader-toolbar, .file-tree, .outline-panel { background: var(--reader-panel-bg); color: var(--reader-text); border-color: var(--reader-border); }
      .reader-toolbar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
      .reader-toolbar h1 { margin: 8px 0 0; font-size: 22px; line-height: 1.2; }
      .reader-toolbar__actions, .reader-toolbar__primary { min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; }
      .file-tree, .outline-panel { min-width: 0; overflow: hidden; }
      .file-tree__row-indicator, .outline-panel button { min-width: 0; max-inline-size: 100%; overflow-wrap: anywhere; }
      .document-reader .markdown-table-wrapper, .table-fullscreen__body { overflow: auto; }
      .document-reader .markdown-code-block { overflow: auto; }
      ${stylesheet}
    </style>
  </head>
  <body>
    <div class="preview-grid">
      <section class="preview-mode preview-mode--light">
        <div class="theme-light" data-reader-theme-id="installed:${escapeHtml(theme.id)}" data-reader-theme-id-label="${escapeHtml(theme.id)}">
          ${fixture}
        </div>
      </section>
      <section class="preview-mode preview-mode--dark">
        <div class="theme-dark" data-reader-theme-id="installed:${escapeHtml(theme.id)}" data-reader-theme-id-label="${escapeHtml(theme.id)}">
          ${fixture}
        </div>
      </section>
    </div>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
