import { THEME_BLUEPRINTS } from './officialThemeData.mjs';

const ALL_FEATURE_IDS = [...new Set(THEME_BLUEPRINTS.flatMap((theme) => theme.nonColorFeatureIds))];

export function buildRealPreviewFixtureHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>Official theme reachability fixture</title>
  </head>
  <body>
    ${buildRealPreviewFixtureBody()}
  </body>
</html>`;
}

export function buildRealPreviewFixtureBody() {
  return `<div class="reader-app" data-fixture-source="stable-reader-dom-hooks">
      <header class="reader-toolbar">
        <div class="reader-toolbar__primary" data-theme-layout-scope="toolbar-group">
          <button type="button">文件</button>
          <h1>Theme Fixture</h1>
        </div>
        <div class="reader-toolbar__actions" data-theme-layout-scope="toolbar-group">
          <button type="button" disabled>上一个</button>
          <button type="button">下一个</button>
          <button type="button">重载</button>
          <button type="button">打印</button>
        </div>
      </header>
      <div class="reader-layout has-outline-panel">
        <nav class="file-tree file-tree--arborist" aria-label="文档文件">
          <div class="file-tree__row is-active" data-file-tree-kind="directory">
            <span class="file-tree__row-indicator" data-theme-layout-scope="file-tree-indicator">
              <span class="file-tree__disclosure"></span>
              <span class="file-tree__icon"></span>
              <span class="file-tree__name">docs</span>
            </span>
          </div>
          <div class="file-tree__indent-guide"></div>
          <div class="file-tree__row" data-file-tree-kind="file">
            <span class="file-tree__row-indicator" data-theme-layout-scope="file-tree-indicator">
              <span class="file-tree__icon"></span>
              <span class="file-tree__name">guide.md</span>
            </span>
          </div>
        </nav>
        <main>
          <article class="document-reader">
            <h1 class="markdown-heading markdown-heading--h1">Heading 1</h1>
            <h2 class="markdown-heading markdown-heading--h2">Heading 2</h2>
            <h3 class="markdown-heading markdown-heading--h3">Heading 3</h3>
            <p class="markdown-paragraph">Paragraph with <a class="markdown-link" href="#x">link</a> and <code class="markdown-inline-code">inline code</code>.</p>
            <ul class="markdown-list"><li>First item</li><li>Second item</li></ul>
            <blockquote class="markdown-quote">Quoted note</blockquote>
            <pre class="markdown-code-block" data-language="js"><code>const value = true;</code></pre>
            <div class="markdown-table-wrapper">
              <table class="markdown-table">
                <thead>
                  <tr class="markdown-table-row">
                    <th class="markdown-table-cell markdown-table-header-cell markdown-table-cell--head">Name</th>
                    <th class="markdown-table-cell markdown-table-header-cell markdown-table-cell--head">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="markdown-table-row"><td class="markdown-table-cell">alpha</td><td class="markdown-table-cell">1</td></tr>
                  <tr class="markdown-table-row"><td class="markdown-table-cell">beta</td><td class="markdown-table-cell">2</td></tr>
                </tbody>
              </table>
            </div>
            <div class="callout callout-warning callout-dashboard">
              <div class="callout-title">Warning</div>
              <p>Callout body</p>
            </div>
            <div class="callout callout-info"><div class="callout-title">Info</div></div>
            <div class="callout callout-quote"><div class="callout-title">Quote</div></div>
            ${ALL_FEATURE_IDS.map((featureId) => `<span data-non-color-feature-id="${escapeHtml(featureId)}">${escapeHtml(featureId)}</span>`).join('\n')}
            <div class="yaml-reader"><div>title: Fixture</div></div>
            <div class="json-reader"><span class="json-key">key</span><span>value</span></div>
            <div class="mermaid-fullscreen">
              <svg viewBox="0 0 100 40"><g><path d="M0 20H100"></path></g></svg>
              <div data-theme-layout-scope="mermaid-actions"><button type="button">fit</button></div>
            </div>
            <div data-theme-layout-scope="table-actions"><button type="button">open</button></div>
            <div class="table-fullscreen__body">
              <div class="table-fullscreen__content">
                <div data-theme-layout-scope="table-fullscreen-actions"><button type="button">close</button></div>
              </div>
            </div>
            <div data-theme-layout-scope="theme-preview-overlay"></div>
          </article>
        </main>
        <aside class="outline-panel" aria-label="文档大纲">
          <div class="outline-panel__resize-handle" data-theme-layout-scope="outline-indicator"></div>
          <div class="outline-panel__scroll">
            <h2>文档大纲</h2>
            <ul>
              <li><button type="button" class="is-active" data-theme-layout-scope="outline-indicator">Heading 1</button></li>
              <li><button type="button" data-theme-layout-scope="outline-indicator">Heading 2</button>
                <ul><li><button type="button" data-theme-layout-scope="outline-indicator">Heading 3</button></li></ul>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
