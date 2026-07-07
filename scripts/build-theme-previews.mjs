import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RELEASE_VERSION = '2.3.1';
const PREVIEW_DIR = 'themes/previews';
const THEME_BASE_URL = 'https://fe-docs.baiteda.com/Local-Markdown-Reader/themes/';
const PREVIEW_BASE_URL = `${THEME_BASE_URL}previews/`;
const PACKAGE_BASE_URL = `${THEME_BASE_URL}packages/`;
const THEME_IDS = [];

export async function buildThemePreviews({ rootDir = process.cwd() } = {}) {
  const outputDir = resolve(rootDir, PREVIEW_DIR);
  await mkdir(outputDir, { recursive: true });

  const themes = [];
  for (const themeId of THEME_IDS) {
    const theme = await readThemePackage(rootDir, themeId);
    themes.push(theme);
    await writeFile(resolve(outputDir, `${theme.id}.svg`), renderThemePreviewSvg(theme));
  }

  await writeFile(resolve(outputDir, `theme-showcase-${RELEASE_VERSION}.svg`), renderShowcaseSvg(themes));
  await writeFile(resolve(outputDir, 'index.html'), renderGalleryHtml(themes));
  await writeFile(resolve(outputDir, `release-${RELEASE_VERSION}.md`), renderReleaseMarkdown(themes));
  await writeFile(resolve(outputDir, 'README.md'), renderReadme(themes));

  return themes;
}

async function readThemePackage(rootDir, themeId) {
  const packagePath = resolve(rootDir, 'themes', 'packages', `${themeId}.mdv-theme.json`);
  return JSON.parse(await readFile(packagePath, 'utf8'));
}

function renderThemePreviewSvg(theme) {
  return renderSvg({
    width: 1280,
    height: 760,
    body: renderThemeCard(theme, {
      x: 0,
      y: 0,
      width: 1280,
      height: 760,
      large: true,
    }),
  });
}

function renderShowcaseSvg(themes) {
  const cardWidth = 760;
  const cardHeight = 480;
  const gap = 40;
  const padding = 56;
  const columns = 2;
  const rows = Math.ceil(themes.length / columns);
  const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = 176 + rows * cardHeight + (rows - 1) * gap + padding;

  const cards = themes.map((theme, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return renderThemeCard(theme, {
      x: padding + column * (cardWidth + gap),
      y: 144 + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
      large: false,
    });
  });

  return renderSvg({
    width,
    height,
    body: `
      <rect width="${width}" height="${height}" fill="#f3f4f6"/>
      <text x="${padding}" y="70" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700" fill="#111827">Local Markdown Reader ${RELEASE_VERSION} Themes</text>
      <text x="${padding}" y="108" font-family="Inter, Arial, sans-serif" font-size="18" fill="#4b5563">${themes.length} Obsidian-inspired original theme previews generated from checked-in theme packages.</text>
      ${cards.join('\n')}
    `,
  });
}

function renderThemeCard(theme, frame) {
  const { x, y, width, height, large } = frame;
  const tokens = theme.tokens ?? {};
  const pageBg = token(tokens, '--reader-page-bg', '#f3f4f6');
  const surface = token(tokens, '--reader-surface', '#ffffff');
  const border = token(tokens, '--reader-border', '#d1d5db');
  const text = token(tokens, '--reader-text', '#111827');
  const muted = token(tokens, '--reader-muted', '#6b7280');
  const accent = token(tokens, '--reader-accent', token(tokens, '--reader-link', '#2563eb'));
  const accentMuted = token(tokens, '--reader-accent-muted', '#dbeafe');
  const headingText = token(tokens, '--reader-heading-text', text);
  const headingFont = token(tokens, '--reader-heading-font', 'Inter, Arial, sans-serif');
  const bodyFont = token(tokens, '--reader-font-family', 'Inter, Arial, sans-serif');
  const monoFont = token(tokens, '--reader-monospace-font', 'SFMono-Regular, Consolas, monospace');
  const scope = `[data-preview-theme-id="${theme.id}"]`;
  const previewCss = renderPreviewCss(theme, { large, scope });

  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="${large ? 28 : 18}" fill="${escapeXml(pageBg)}"/>
      <foreignObject x="0" y="0" width="${width}" height="${height}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="theme-preview-card" data-preview-theme-id="${escapeHtml(theme.id)}">
          <style type="text/css"><![CDATA[
${previewCss}
          ]]></style>
          <div class="theme-preview-shell">
            <header class="theme-preview-header">
              <div>
                <div class="theme-preview-badge">${escapeHtml((theme.colorScheme ?? 'system').toUpperCase())}</div>
                <h2>${escapeHtml(theme.name)}</h2>
                ${large ? '' : `<p>${escapeHtml(wrapText(theme.description ?? '', 74).at(0) ?? '')}</p>`}
              </div>
              <div class="theme-preview-swatches" aria-hidden="true">
                <span style="background:${escapeHtml(text)}"></span>
                <span style="background:${escapeHtml(accent)}"></span>
                <span style="background:${escapeHtml(accentMuted)}"></span>
              </div>
            </header>
            <article class="document-reader markdown-preview-document" aria-label="${escapeHtml(theme.name)} markdown preview">
              ${renderMarkdownPreviewSample()}
            </article>
          </div>
        </div>
      </foreignObject>
    </g>
  `;
}

function renderPreviewCss(theme, { large, scope }) {
  const tokens = theme.tokens ?? {};
  const accent = token(tokens, '--reader-accent', token(tokens, '--reader-link', '#2563eb'));
  const tokenLines = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`);
  const scopedThemeCss = theme.css?.trim() ? scopePreviewCss(theme.css, scope) : '';
  return `
${scope} {
${tokenLines.join('\n')}
  --reader-on-accent: ${contrastText(accent)};
  --preview-padding: ${large ? '38px' : '24px'};
  --preview-surface-padding: ${large ? '26px' : '18px'};
  --preview-gap: ${large ? '18px' : '16px'};
  --preview-title-size: ${large ? '34px' : '22px'};
  --preview-badge-font-size: ${large ? '14px' : '9px'};
  --preview-body-font-size: ${large ? '16px' : '11px'};
  --preview-small-font-size: ${large ? '13px' : '9px'};
  --preview-code-font-size: ${large ? '13px' : '9px'};
  width: 100%;
  height: 100%;
  display: block;
  box-sizing: border-box;
  background: var(--reader-page-bg, #f3f4f6);
  color: var(--reader-text, #111827);
  font-family: var(--reader-font-family, Inter, Arial, sans-serif);
  overflow: hidden;
}

${scope} * {
  box-sizing: border-box;
}

${scope} .theme-preview-shell {
  width: 100%;
  height: 100%;
  padding: var(--preview-padding);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--preview-gap);
  background:
    radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--reader-accent, #2563eb) 18%, transparent), transparent 25%),
    var(--reader-page-bg, #f3f4f6);
}

${scope} .theme-preview-header {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

${scope} .theme-preview-badge {
  display: inline-flex;
  align-items: center;
  height: ${large ? '30px' : '22px'};
  padding: 0 ${large ? '18px' : '11px'};
  border-radius: 999px;
  background: var(--reader-accent, #2563eb);
  color: var(--reader-on-accent, #fff);
  font: 750 var(--preview-badge-font-size)/1 var(--reader-font-family, Inter, Arial, sans-serif);
  letter-spacing: 0.06em;
}

${scope} .theme-preview-header h2 {
  margin: ${large ? '16px' : '12px'} 0 0;
  color: var(--reader-heading-text, var(--reader-text, #111827));
  font-family: var(--reader-heading-font, var(--reader-font-family, Inter, Arial, sans-serif));
  font-size: var(--preview-title-size);
  line-height: 1.08;
  letter-spacing: 0;
}

${scope} .theme-preview-header p {
  max-width: 52ch;
  margin: 8px 0 0;
  color: var(--reader-muted, #6b7280);
  font-size: var(--preview-small-font-size);
  line-height: 1.35;
}

${scope} .theme-preview-swatches {
  display: flex;
  gap: ${large ? '14px' : '9px'};
  padding-top: ${large ? '18px' : '12px'};
}

${scope} .theme-preview-swatches span {
  width: ${large ? '34px' : '20px'};
  height: ${large ? '34px' : '20px'};
  border: 1px solid color-mix(in srgb, var(--reader-border, #d1d5db) 78%, transparent);
  border-radius: 999px;
}

${scope} .markdown-preview-document {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: var(--preview-surface-padding);
  border: 1px solid var(--reader-border, #d1d5db);
  border-radius: var(--reader-radius, 8px);
  background: var(--reader-surface, #fff);
  box-shadow: var(--reader-shadow, 0 10px 30px rgba(15, 23, 42, 0.08));
  color: var(--reader-text, #111827);
  font-family: var(--reader-font-family, Inter, Arial, sans-serif);
  font-size: var(--preview-body-font-size);
  line-height: var(--markdown-line-height, 1.7);
}

${scope} .markdown-preview-document > div {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
  grid-template-areas:
    "intro meta"
    "tasks code"
    "callouts media"
    "table table";
  gap: ${large ? '14px 22px' : '10px 14px'};
}

${scope} .markdown-preview-intro {
  grid-area: intro;
}

${scope} .markdown-preview-code {
  grid-area: code;
}

${scope} .markdown-preview-tasks {
  grid-area: tasks;
}

${scope} .markdown-preview-quote {
  grid-area: callouts;
}

${scope} .markdown-preview-table-wrap {
  grid-area: table;
  min-width: 0;
}

${scope} .theme-preview__metadata {
  grid-area: meta;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${large ? '8px' : '6px'};
  padding: ${large ? '12px' : '8px'};
  border: 1px solid var(--reader-border, #d1d5db);
  border-radius: var(--reader-radius, 8px);
  background: var(--reader-panel-bg, var(--reader-surface, #fff));
}

${scope} .theme-preview__metadata h3 {
  grid-column: 1 / -1;
}

${scope} .theme-preview__metadata-item {
  min-width: 0;
  padding: ${large ? '8px 10px' : '5px 7px'};
  border: 1px solid color-mix(in srgb, var(--reader-border, #d1d5db) 78%, transparent);
  border-radius: var(--reader-radius, 8px);
  background: color-mix(in srgb, var(--reader-surface, #fff) 88%, var(--reader-accent-muted, #dbeafe));
}

${scope} .theme-preview__metadata-label {
  display: block;
  color: var(--reader-muted, #6b7280);
  font-size: var(--preview-small-font-size);
}

${scope} .theme-preview__metadata-value {
  display: block;
  margin-top: 0.18em;
  color: var(--reader-text, #111827);
  font-weight: 720;
}

${scope} .theme-preview__callouts {
  grid-area: callouts;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${large ? '10px' : '7px'};
}

${scope} .theme-preview__callouts .callout {
  min-width: 0;
}

${scope} .theme-preview__media-row {
  grid-area: media;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${large ? '10px' : '7px'};
}

${scope} .markdown-image,
${scope} .mermaid {
  min-height: ${large ? '98px' : '62px'};
  margin: 0;
  padding: ${large ? '12px' : '8px'};
  border: 1px solid var(--reader-border, #d1d5db);
  border-radius: var(--reader-radius, 8px);
  background: color-mix(in srgb, var(--reader-accent-muted, #dbeafe) 34%, var(--reader-surface, #fff));
}

${scope} .markdown-image-visual,
${scope} .mermaid-visual {
  height: ${large ? '54px' : '34px'};
  border-radius: calc(var(--reader-radius, 8px) * 0.7);
  background: linear-gradient(135deg, var(--reader-accent, #2563eb), color-mix(in srgb, var(--reader-accent, #2563eb) 22%, transparent));
}

${scope} .markdown-image-caption,
${scope} .mermaid-caption {
  display: block;
  margin-top: 0.5em;
  color: var(--reader-muted, #6b7280);
  font-size: var(--preview-small-font-size);
  line-height: 1.2;
}

${scope} .markdown-heading {
  margin: 0 0 0.5em;
  color: var(--reader-heading-text, var(--reader-text, #111827));
  font-family: var(--reader-heading-font, var(--reader-font-family, Inter, Arial, sans-serif));
  line-height: 1.22;
  letter-spacing: 0;
}

${scope} .markdown-heading--h1 {
  padding-bottom: 0.25em;
  border-bottom: 1px solid var(--reader-heading-border, var(--reader-border, #d1d5db));
  color: var(--reader-h1-color, var(--reader-heading-text, var(--reader-text, #111827)));
  font-size: var(--reader-h1-size, ${large ? '31px' : '18px'});
  font-weight: var(--reader-h1-weight, 750);
}

${scope} .markdown-heading--h2 {
  color: var(--reader-h2-color, var(--reader-heading-text, var(--reader-text, #111827)));
  font-size: var(--reader-h2-size, ${large ? '23px' : '14px'});
  font-weight: var(--reader-h2-weight, 700);
}

${scope} .markdown-heading--h3 {
  color: var(--reader-h3-color, var(--reader-heading-text, var(--reader-text, #111827)));
  font-size: var(--reader-h3-size, ${large ? '18px' : '12px'});
  font-weight: var(--reader-h3-weight, 680);
}

${scope} .markdown-paragraph {
  margin: 0 0 var(--reader-paragraph-spacing, 0.75em);
}

${scope} .markdown-link {
  color: var(--reader-link, var(--reader-accent, #2563eb));
  text-decoration-color: color-mix(in srgb, currentColor 48%, transparent);
  text-underline-offset: 0.16em;
}

${scope} .markdown-code {
  font-family: var(--reader-monospace-font, ui-monospace, SFMono-Regular, Menlo, monospace);
}

${scope} .markdown-code--inline {
  padding: 0.12em 0.34em;
  border-radius: var(--reader-code-radius, 6px);
  background: var(--reader-inline-code-bg, var(--reader-code-bg, #f3f4f6));
  color: var(--reader-inline-code-text, var(--reader-code-text, var(--reader-text, #111827)));
  font-size: var(--reader-code-font-size, 0.88em);
}

${scope} .markdown-code-block {
  overflow: hidden;
  margin: 0;
  padding: ${large ? '16px' : '9px'};
  border: 1px solid var(--reader-code-border, var(--reader-border, #d1d5db));
  border-radius: var(--reader-code-radius, 8px);
  background: var(--reader-code-bg, #f3f4f6);
  color: var(--reader-code-text, var(--reader-text, #111827));
  font-size: var(--preview-code-font-size);
  line-height: 1.62;
  white-space: pre-wrap;
}

${scope} .markdown-code--block {
  color: inherit;
  font-size: inherit;
}

${scope} .markdown-list {
  margin: 0;
  padding-left: var(--reader-list-indent, 1.45em);
}

${scope} .markdown-list-item {
  margin: 0.18em 0;
}

${scope} .markdown-task {
  list-style: none;
  margin-left: calc(-1 * var(--reader-list-indent, 1.45em));
}

${scope} .markdown-task-checkbox {
  position: relative;
  width: 1em;
  height: 1em;
  margin: 0 0.45em 0.1em 0;
  border: 1px solid var(--reader-checkbox-border, var(--reader-border, #d1d5db));
  border-radius: var(--reader-checkbox-radius, 4px);
  appearance: none;
  background: var(--reader-checkbox-bg, var(--reader-surface, #fff));
  vertical-align: middle;
}

${scope} .markdown-task-checkbox:checked {
  border-color: var(--reader-checkbox-checked-bg, var(--reader-accent, #2563eb));
  background: var(--reader-checkbox-checked-bg, var(--reader-accent, #2563eb));
}

${scope} .markdown-task-checkbox:checked::after {
  position: absolute;
  left: 0.27em;
  top: 0.07em;
  width: 0.34em;
  height: 0.58em;
  border: solid var(--reader-checkbox-check-color, #fff);
  border-width: 0 0.14em 0.14em 0;
  content: "";
  transform: rotate(45deg);
}

${scope} .markdown-task--checked {
  color: var(--reader-task-done, var(--reader-muted, #6b7280));
}

${scope} .markdown-tag {
  display: inline-flex;
  align-items: center;
  margin-inline: 0.12em;
  padding: var(--reader-tag-padding, 0.08em 0.45em);
  border-radius: var(--reader-tag-radius, 999px);
  background: var(--reader-tag-bg, var(--reader-accent-muted, #dbeafe));
  color: var(--reader-tag-text, var(--reader-accent, #2563eb));
  font-weight: 650;
}

${scope} mark {
  padding: 0.05em 0.18em;
  border-radius: 4px;
  background: var(--reader-mark-bg, #fff4b8);
  color: var(--reader-mark-text, var(--reader-text, #111827));
}

${scope} .markdown-quote {
  margin: 0;
  padding: var(--reader-quote-padding, 0.7em 0.9em);
  border-left: 4px solid var(--reader-quote-border, var(--reader-accent, #2563eb));
  border-radius: var(--reader-quote-radius, 0);
  background: var(--reader-quote-bg, #f9fafb);
  color: var(--reader-quote-text, var(--reader-muted, #6b7280));
}

${scope} .markdown-quote .markdown-paragraph {
  margin-bottom: 0;
}

${scope} .callout {
  margin: 0;
  padding: ${large ? '14px 16px' : '8px 10px'};
  border: 1px solid var(--reader-callout-border, var(--reader-border, #d1d5db));
  border-radius: var(--reader-callout-radius, 8px);
  background: var(--reader-callout-bg, #f9fafb);
  color: var(--reader-callout-text, var(--reader-muted, #6b7280));
}

${scope} .callout-title {
  margin: 0 0 0.45em;
  color: var(--reader-callout-title, var(--reader-heading-text, #111827));
  font-weight: 750;
}

${scope} .callout-content .markdown-paragraph {
  margin-bottom: 0;
}

${scope} .markdown-table {
  width: 100%;
  border-spacing: 0;
  border-collapse: collapse;
  color: var(--reader-table-text, var(--reader-text, #111827));
  font-size: var(--preview-small-font-size);
}

${scope} .markdown-table-cell {
  padding: var(--reader-table-cell-padding, 0.48em 0.7em);
  border: 1px solid var(--reader-table-border, var(--reader-border, #d1d5db));
  text-align: left;
}

${scope} .markdown-table-cell--head {
  background: var(--reader-table-head, #f3f4f6);
  font-weight: 750;
}

${scope} .markdown-table-body .markdown-table-row:nth-child(even) {
  background: var(--reader-table-stripe, #f9fafb);
}

${scopedThemeCss}
`.trim();
}

function renderMarkdownPreviewSample() {
  return `
    <div>
      <section class="markdown-preview-intro">
        <h1 class="markdown-heading markdown-heading--h1">Heading System</h1>
        <h2 class="markdown-heading markdown-heading--h2">Planning Notes</h2>
        <p class="markdown-paragraph">Readable prose with <a class="markdown-link markdown-link--external" href="https://example.com">linked references</a>, <code class="markdown-code markdown-code--inline">inline code</code>, <mark>highlight</mark>, <span class="markdown-tag" data-tag="theme">#theme</span>, <span class="markdown-tag" data-tag="status">#status</span>, and <span class="markdown-tag" data-tag="done">#done</span>.</p>
      </section>
      <section class="theme-preview__metadata">
        <h3 class="markdown-heading markdown-heading--h3">Metadata</h3>
        <div class="theme-preview__metadata-item">
          <span class="theme-preview__metadata-label">Type</span>
          <span class="theme-preview__metadata-value">Research</span>
        </div>
        <div class="theme-preview__metadata-item">
          <span class="theme-preview__metadata-label">Status</span>
          <span class="theme-preview__metadata-value">Active</span>
        </div>
        <div class="theme-preview__metadata-item">
          <span class="theme-preview__metadata-label">Rows</span>
          <span class="theme-preview__metadata-value">24</span>
        </div>
        <div class="theme-preview__metadata-item">
          <span class="theme-preview__metadata-label">Owner</span>
          <span class="theme-preview__metadata-value">Reader</span>
        </div>
      </section>
      <section class="markdown-preview-code">
        <h3 class="markdown-heading markdown-heading--h3">Code Block</h3>
        <pre class="markdown-code-block"><code class="language-js markdown-code markdown-code--block"><span class="line">const reader <span class="token operator">=</span> <span class="token string">&quot;focused&quot;</span>;</span>
<span class="line"><span class="token function">renderMarkdown</span><span class="token punctuation">(</span>theme<span class="token punctuation">)</span>;</span>
<span class="line"><span class="token keyword">return</span> <span class="token comment">// preview detail</span></span></code></pre>
      </section>
      <section class="markdown-preview-tasks">
        <h3 class="markdown-heading markdown-heading--h3">Task List</h3>
        <ul class="markdown-list markdown-list--unordered">
          <li class="markdown-list-item markdown-task markdown-task--checked"><input class="markdown-task-checkbox" type="checkbox" checked="checked" />Map heading levels</li>
          <li class="markdown-list-item markdown-task"><input class="markdown-task-checkbox" type="checkbox" />Review callouts and tables</li>
        </ul>
      </section>
      <section class="theme-preview__callouts">
        <blockquote class="markdown-quote callout callout-tip" data-callout="tip">
          <div class="callout-title">Tip callout</div>
          <div class="callout-content">
            <p class="markdown-paragraph">Spacing and borders.</p>
          </div>
        </blockquote>
        <blockquote class="markdown-quote callout callout-warning" data-callout="warning">
          <div class="callout-title">Warning callout</div>
          <div class="callout-content">
            <p class="markdown-paragraph">Contrast check.</p>
          </div>
        </blockquote>
        <blockquote class="markdown-quote callout callout-success" data-callout="success">
          <div class="callout-title">Success callout</div>
          <div class="callout-content">
            <p class="markdown-paragraph">Completed state.</p>
          </div>
        </blockquote>
      </section>
      <section class="theme-preview__media-row">
        <figure class="markdown-image">
          <div class="markdown-image-visual"></div>
          <figcaption class="markdown-image-caption">Image Frame</figcaption>
        </figure>
        <figure class="mermaid">
          <div class="mermaid-visual"></div>
          <figcaption class="mermaid-caption">Diagram Frame</figcaption>
        </figure>
      </section>
      <section class="markdown-preview-table-wrap">
        <h3 class="markdown-heading markdown-heading--h3">Status Table</h3>
        <table class="markdown-table markdown-preview-table">
          <caption class="markdown-table-caption">Project signals</caption>
          <thead class="markdown-table-head">
            <tr class="markdown-table-row">
              <th class="markdown-table-cell markdown-table-cell--head">Block</th>
              <th class="markdown-table-cell markdown-table-cell--head">Signal</th>
              <th class="markdown-table-cell markdown-table-cell--head">State</th>
            </tr>
          </thead>
          <tbody class="markdown-table-body">
            <tr class="markdown-table-row">
              <td class="markdown-table-cell">Headings</td>
              <td class="markdown-table-cell">H1/H2/H3</td>
              <td class="markdown-table-cell">Visible</td>
            </tr>
            <tr class="markdown-table-row">
              <td class="markdown-table-cell">Tasks</td>
              <td class="markdown-table-cell">Checked rows</td>
              <td class="markdown-table-cell">Styled</td>
            </tr>
            <tr class="markdown-table-row">
              <td class="markdown-table-cell">Media</td>
              <td class="markdown-table-cell">Image + diagram</td>
              <td class="markdown-table-cell">Framed</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function scopePreviewCss(css, scope) {
  return css
    .split('}')
    .map((rule) => {
      const [selectorPart, ...declarationParts] = rule.split('{');
      const declarations = declarationParts.join('{').trim();
      const selectors = selectorPart.trim();
      if (!selectors || !declarations) {
        return '';
      }
      if (selectors.startsWith('@')) {
        return `${selectors} { ${declarations} }`;
      }
      return `${selectors
        .split(',')
        .map((selector) => prefixPreviewSelector(selector.trim(), scope))
        .join(', ')} { ${declarations} }`;
    })
    .filter(Boolean)
    .join('\n');
}

function prefixPreviewSelector(selector, scope) {
  if (!selector || selector.startsWith(scope)) {
    return selector;
  }
  if (selector === ':root') {
    return scope;
  }
  return `${scope} ${selector}`;
}

function renderGalleryHtml(themes) {
  const cards = themes.map((theme) => `
    <article class="theme-card">
      <img src="./${theme.id}.svg" alt="${escapeHtml(theme.name)} preview">
      <h2>${escapeHtml(theme.name)}</h2>
      <p>${escapeHtml(theme.description ?? '')}</p>
      <a href="../packages/${theme.id}.mdv-theme.json">Theme package</a>
    </article>
  `).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Local Markdown Reader ${RELEASE_VERSION} Theme Previews</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, Arial, sans-serif; }
      body { margin: 0; background: #f3f4f6; color: #111827; }
      main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 40px 0 56px; }
      h1 { margin: 0 0 8px; font-size: 32px; line-height: 1.15; }
      .intro { margin: 0 0 28px; color: #4b5563; }
      .showcase { display: block; width: 100%; border-radius: 16px; border: 1px solid #d1d5db; background: white; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 28px; }
      .theme-card { background: white; border: 1px solid #d1d5db; border-radius: 14px; padding: 14px; }
      .theme-card img { display: block; width: 100%; border-radius: 10px; }
      .theme-card h2 { margin: 14px 0 6px; font-size: 18px; }
      .theme-card p { min-height: 44px; margin: 0 0 12px; color: #4b5563; line-height: 1.45; }
      .theme-card a { color: #2563eb; font-weight: 650; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Local Markdown Reader ${RELEASE_VERSION} Theme Previews</h1>
      <p class="intro">Generated previews for ${themes.length} Obsidian-inspired original remote theme packages.</p>
      <img class="showcase" src="./theme-showcase-${RELEASE_VERSION}.svg" alt="Theme showcase">
      <section class="grid">
${cards}
      </section>
    </main>
  </body>
</html>
`;
}

function renderReleaseMarkdown(themes) {
  const rows = themes.map((theme) => [
    `### ${theme.name}`,
    '',
    `![${theme.name} preview](${PREVIEW_BASE_URL}${theme.id}.svg)`,
    '',
    theme.description ?? '',
    '',
    `主题包：[\`${theme.id}.mdv-theme.json\`](${PACKAGE_BASE_URL}${theme.id}.mdv-theme.json)`,
    '',
  ].join('\n')).join('\n');
  const themeRows = rows ? `\n\n${rows}` : '';

  return `## Local Markdown Reader ${RELEASE_VERSION} 主题预览素材

![Local Markdown Reader ${RELEASE_VERSION} theme showcase](${PREVIEW_BASE_URL}theme-showcase-${RELEASE_VERSION}.svg)

本次发布包含 ${themes.length} 个参考 Obsidian 流行风格方向制作的原创远程主题包，下面的预览图由仓库内主题 token 自动生成，可直接用于 GitHub Release 描述。${themeRows}`;
}

function renderReadme(themes) {
  const themeList = themes.map((theme) => `- [${theme.name}](./${theme.id}.svg)`).join('\n');
  const themeSection = themeList ? `\n${themeList}` : '';
  return `# Theme Previews

Generated visual preview and release materials for Local Markdown Reader ${RELEASE_VERSION}.

Run:

\`\`\`bash
npm run themes:previews
\`\`\`

Generated assets:

- [Theme showcase](./theme-showcase-${RELEASE_VERSION}.svg)
- [Release Markdown](./release-${RELEASE_VERSION}.md)
- [HTML gallery](./index.html)

Themes:${themeSection}
`;
}

function renderSvg({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
${body}
</svg>
`.replace(/[ \t]+$/gm, '');
}

function wrapText(text, maxLength) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

function token(tokens, name, fallback) {
  return tokens[name] ?? fallback;
}

function contrastText(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return '#ffffff';
  }
  const luminance = relativeLuminance(rgb);
  return luminance > 0.56 ? '#111827' : '#ffffff';
}

function hexToRgb(value) {
  const normalized = value.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }

  const hex = match[1].length === 3
    ? match[1].split('').map((part) => `${part}${part}`).join('')
    : match[1];

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeHtml(value) {
  return escapeXml(value).replaceAll("'", '&#39;');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const themes = await buildThemePreviews();
  console.log(`theme previews generated: ${themes.length} themes`);
}
