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
          <div class="file-tree__row is-selected" data-file-tree-kind="file">
            <span class="file-tree__row-indicator" data-theme-layout-scope="file-tree-indicator">
              <span class="file-tree__icon"></span>
              <span class="file-tree__name">selected.md</span>
            </span>
          </div>
        </nav>
        <main>
          <article class="document-reader">
            <h1 class="markdown-heading markdown-heading--h1"><a href="#heading-1">Heading 1</a></h1>
            <h2 class="markdown-heading markdown-heading--h2">Heading 2</h2>
            <h3 class="markdown-heading markdown-heading--h3">Heading 3</h3>
            <h4 class="markdown-heading markdown-heading--h4">Heading 4</h4>
            <h5 class="markdown-heading markdown-heading--h5">Heading 5</h5>
            <h6 class="markdown-heading markdown-heading--h6">Heading 6</h6>
            <section>
              <p class="markdown-paragraph">Paragraph with <a class="markdown-link" href="#x">link</a>, <strong>strong</strong>, <em>emphasis</em>, <mark>mark</mark>, and <code class="markdown-inline-code">inline code</code>.</p>
              <p class="markdown-paragraph">A second paragraph exercises adjacent and final paragraph rhythm.</p>
            </section>
            <ul class="markdown-list"><li>First item</li><li>Second item</li></ul>
            <ol class="markdown-list"><li>First step</li><li>Second step</li></ol>
            <ul class="markdown-list contains-task-list">
              <li class="task-list-item"><input type="checkbox">Open task</li>
              <li class="task-list-item is-checked"><input type="checkbox" checked>Finished task</li>
            </ul>
            <blockquote class="markdown-quote"><p class="markdown-paragraph">Quoted note</p></blockquote>
            <hr>
            <pre class="markdown-code-block" data-language="js"><code><span class="token keyword">const</span> <span class="token function">read</span> = <span class="token string">"theme"</span>; <span class="token comment">// preview</span></code></pre>
            <div class="markdown-table-wrapper" id="capture-table">
              <table class="markdown-table">
                <caption class="markdown-table-caption">Reference values</caption>
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
              <div class="callout-content"><p class="markdown-paragraph">Callout body</p></div>
            </div>
            <div class="callout callout-info"><div class="callout-title">Info</div><div class="callout-content"><p class="markdown-paragraph">Info body</p></div></div>
            <div class="callout callout-note"><div class="callout-title">Note</div><div class="callout-content"><p class="markdown-paragraph">Note body</p></div></div>
            <div class="callout callout-success"><div class="callout-title">Success</div><div class="callout-content"><p class="markdown-paragraph">Success body</p></div></div>
            <div class="callout callout-tip"><div class="callout-title">Tip</div><div class="callout-content"><p class="markdown-paragraph">Tip body</p></div></div>
            <div class="callout callout-danger"><div class="callout-title">Danger</div><div class="callout-content"><p class="markdown-paragraph">Danger body</p></div></div>
            <div class="callout callout-error"><div class="callout-title">Error</div><div class="callout-content"><p class="markdown-paragraph">Error body</p></div></div>
            <div class="callout callout-quote"><div class="callout-title">Quote</div><div class="callout-content"><p class="markdown-paragraph">Quote body</p></div></div>
            ${ALL_FEATURE_IDS.map((featureId) => `<span data-non-color-feature-id="${escapeHtml(featureId)}">${escapeHtml(featureId)}</span>`).join('\n')}
            <div class="yaml-reader"><div>title: Fixture</div></div>
            <div class="json-reader"><span class="json-key">key</span><span>value</span></div>
            <div class="mermaid-fullscreen" id="capture-mermaid">
              <svg viewBox="0 0 320 120" role="img" aria-label="Mermaid fixture diagram">
                <g fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="12" y="34" width="84" height="42" rx="5"></rect>
                  <path d="M96 55H212"></path>
                  <path d="m202 47 10 8-10 8"></path>
                  <rect x="212" y="34" width="96" height="42" rx="5"></rect>
                </g>
                <g fill="currentColor" font-family="sans-serif" font-size="13" text-anchor="middle">
                  <text x="54" y="60">Source</text>
                  <text x="260" y="60">Preview</text>
                </g>
              </svg>
              <div data-theme-layout-scope="mermaid-actions"><button type="button">fit</button></div>
            </div>
            <div data-theme-layout-scope="table-actions"><button type="button">open</button></div>
            <div class="table-fullscreen__body" id="capture-table-fullscreen">
              <div class="table-fullscreen__content">
                <table class="markdown-table">
                  <thead><tr class="markdown-table-row"><th class="markdown-table-cell markdown-table-header-cell markdown-table-cell--head">Metric</th><th class="markdown-table-cell markdown-table-header-cell markdown-table-cell--head">Value</th></tr></thead>
                  <tbody>
                    <tr class="markdown-table-row"><td class="markdown-table-cell">Rules</td><td class="markdown-table-cell">114</td></tr>
                    <tr class="markdown-table-row"><td class="markdown-table-cell">Modes</td><td class="markdown-table-cell">Light / Dark</td></tr>
                  </tbody>
                </table>
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
