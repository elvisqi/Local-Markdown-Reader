import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RELEASE_VERSION = '2.3.1';
const PREVIEW_DIR = 'themes/previews';
const PREVIEW_BASE_URL = 'https://raw.githubusercontent.com/elvisqi/Local-Markdown-Reader/2.0/themes/previews/';
const THEME_IDS = [
  'minimal-focus',
  'things-flow',
  'pastel-puccin',
  'topaz-blue',
  'nord-notes',
  'atom-one-reader',
  'obsidianite-dark',
  'wasp-highlight',
  'typewriter-desk',
  'its-readable',
];

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
      <text x="${padding}" y="108" font-family="Inter, Arial, sans-serif" font-size="18" fill="#4b5563">10 Obsidian-inspired original theme previews generated from checked-in theme packages.</text>
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
  const link = token(tokens, '--reader-link', '#2563eb');
  const accent = token(tokens, '--reader-accent', link);
  const accentMuted = token(tokens, '--reader-accent-muted', '#dbeafe');
  const headingText = token(tokens, '--reader-heading-text', text);
  const headingFont = token(tokens, '--reader-heading-font', 'Inter, Arial, sans-serif');
  const bodyFont = token(tokens, '--reader-font-family', 'Inter, Arial, sans-serif');
  const monoFont = token(tokens, '--reader-monospace-font', 'SFMono-Regular, Consolas, monospace');
  const h1Color = token(tokens, '--reader-h1-color', headingText);
  const h2Color = token(tokens, '--reader-h2-color', headingText);
  const h3Color = token(tokens, '--reader-h3-color', headingText);
  const h1Weight = token(tokens, '--reader-h1-weight', '750');
  const h2Weight = token(tokens, '--reader-h2-weight', '700');
  const h3Weight = token(tokens, '--reader-h3-weight', '680');
  const headingBorder = token(tokens, '--reader-heading-border', border);
  const codeBg = token(tokens, '--reader-code-bg', '#f3f4f6');
  const codeText = token(tokens, '--reader-code-text', text);
  const codeBorder = token(tokens, '--reader-code-border', border);
  const inlineCodeBg = token(tokens, '--reader-inline-code-bg', codeBg);
  const inlineCodeText = token(tokens, '--reader-inline-code-text', codeText);
  const tableHead = token(tokens, '--reader-table-head', '#f3f4f6');
  const tableStripe = token(tokens, '--reader-table-stripe', '#f9fafb');
  const tableBorder = token(tokens, '--reader-table-border', border);
  const tableText = token(tokens, '--reader-table-text', text);
  const rule = token(tokens, '--reader-rule', border);
  const quoteBg = token(tokens, '--reader-quote-bg', '#f9fafb');
  const quoteBorder = token(tokens, '--reader-quote-border', link);
  const quoteText = token(tokens, '--reader-quote-text', muted);
  const calloutBg = token(tokens, '--reader-callout-bg', quoteBg);
  const calloutBorder = token(tokens, '--reader-callout-border', quoteBorder);
  const calloutTitle = token(tokens, '--reader-callout-title', headingText);
  const calloutText = token(tokens, '--reader-callout-text', quoteText);
  const markBg = token(tokens, '--reader-mark-bg', '#fff4b8');
  const markText = token(tokens, '--reader-mark-text', text);
  const tagBg = token(tokens, '--reader-tag-bg', accentMuted);
  const tagText = token(tokens, '--reader-tag-text', accent);
  const checkboxBg = token(tokens, '--reader-checkbox-bg', surface);
  const checkboxBorder = token(tokens, '--reader-checkbox-border', border);
  const checkboxCheckedBg = token(tokens, '--reader-checkbox-checked-bg', accent);
  const checkboxCheck = token(tokens, '--reader-checkbox-check-color', contrastText(accent));
  const taskDone = token(tokens, '--reader-task-done', muted);
  const syntaxKeyword = token(tokens, '--reader-syntax-keyword', accent);
  const radius = scaledRadius(token(tokens, '--reader-radius', '8px'), large ? 3.1 : 2.1, large ? 8 : 6);
  const controlRadius = scaledRadius(token(tokens, '--reader-control-radius', '8px'), large ? 2.4 : 1.5, large ? 8 : 5);
  const codeRadius = scaledRadius(token(tokens, '--reader-code-radius', '8px'), large ? 2.2 : 1.5, large ? 8 : 5);
  const calloutRadius = scaledRadius(token(tokens, '--reader-callout-radius', '8px'), large ? 2.1 : 1.4, large ? 8 : 5);
  const padding = large ? 54 : 30;
  const surfaceX = padding * 0.76;
  const surfaceY = padding * 1.52;
  const surfaceWidth = width - padding * 1.52;
  const surfaceHeight = height - padding * 2;
  const contentX = padding;
  const contentY = padding;
  const titleSize = large ? 40 : 24;
  const bodySize = large ? 20 : 12;
  const descriptionSize = large ? bodySize : 9;
  const smallSize = large ? 16 : 10;
  const h1Size = scaledFont(token(tokens, '--reader-h1-size', '32px'), large ? 1.05 : 0.54, large ? 31 : 17, large ? 42 : 25);
  const h2Size = scaledFont(token(tokens, '--reader-h2-size', '24px'), large ? 1.02 : 0.54, large ? 24 : 14, large ? 34 : 20);
  const h3Size = scaledFont(token(tokens, '--reader-h3-size', '18px'), large ? 1.02 : 0.55, large ? 19 : 11, large ? 27 : 16);
  const docX = contentX;
  const docY = large ? 206 : 148;
  const docWidth = surfaceWidth - padding * 0.5;
  const gap = large ? 34 : 20;
  const leftWidth = docWidth * 0.57;
  const rightX = docX + leftWidth + gap;
  const rightWidth = docWidth - leftWidth - gap;
  const tableWidth = docWidth;
  const chipText = contrastText(accent);
  const descriptionLines = large
    ? []
    : wrapText(theme.description ?? '', 58).slice(0, 1);
  const badgeWidth = large ? 184 : 112;
  const badgeHeight = large ? 40 : 26;
  const badgeRadius = large ? 20 : 13;
  const lineY = large ? 178 : 124;
  const paragraphY = docY + (large ? 88 : 54);
  const listY = docY + (large ? 152 : 96);
  const tagY = docY + (large ? 254 : 160);
  const calloutY = docY + (large ? 288 : 182);
  const codeY = docY + (large ? 70 : 46);
  const tableY = docY + (large ? 390 : 248);
  const calloutHeight = large ? 74 : 42;
  const tableTop = large ? 22 : 14;
  const tableHeaderHeight = large ? 36 : 18;
  const tableRowHeight = large ? 34 : 16;
  const tableHeight = tableHeaderHeight + tableRowHeight * 3;
  const tableHeaderTextY = large ? 46 : 27;
  const tableRow1TextY = large ? 80 : 43;
  const tableRow2TextY = large ? 114 : 59;
  const tableRow3TextY = large ? 148 : 75;
  const checkSize = large ? 20 : 12;
  const tableColumnA = tableWidth * 0.34;
  const tableColumnB = tableWidth * 0.64;

  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="${radius + (large ? 10 : 7)}" fill="${escapeXml(pageBg)}"/>
      <rect x="${surfaceX}" y="${surfaceY}" width="${surfaceWidth}" height="${surfaceHeight}" rx="${radius}" fill="${escapeXml(surface)}" stroke="${escapeXml(border)}" stroke-width="${large ? 2 : 1.4}"/>
      <rect x="${contentX}" y="${contentY}" width="${badgeWidth}" height="${badgeHeight}" rx="${badgeRadius}" fill="${escapeXml(accent)}"/>
      <text x="${contentX + (large ? 24 : 14)}" y="${contentY + (large ? 27 : 18)}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" font-weight="700" fill="${chipText}">${escapeXml(theme.colorScheme.toUpperCase())}</text>
      <text x="${contentX}" y="${contentY + (large ? 98 : 64)}" font-family="${escapeXml(headingFont)}" font-size="${titleSize}" font-weight="750" fill="${escapeXml(headingText)}">${escapeXml(theme.name)}</text>
      ${renderTextLines(descriptionLines, {
        x: contentX,
        y: contentY + (large ? 136 : 90),
        fontSize: descriptionSize,
        lineHeight: large ? 28 : 13,
        fill: muted,
      })}
      <line x1="${contentX}" y1="${lineY}" x2="${contentX + surfaceWidth - padding * 0.5}" y2="${lineY}" stroke="${escapeXml(headingBorder || rule)}" stroke-width="${large ? 2 : 1}"/>

      <text x="${docX}" y="${docY}" font-family="${escapeXml(headingFont)}" font-size="${h1Size}" font-weight="${escapeXml(h1Weight)}" fill="${escapeXml(h1Color)}">Heading System</text>
      <text x="${docX}" y="${docY + (large ? 48 : 30)}" font-family="${escapeXml(headingFont)}" font-size="${h2Size}" font-weight="${escapeXml(h2Weight)}" fill="${escapeXml(h2Color)}">Planning Notes</text>
      <text x="${docX}" y="${paragraphY}" font-family="${escapeXml(bodyFont)}" font-size="${bodySize}" fill="${escapeXml(text)}">Readable prose with linked references, inline code,</text>
      <text x="${docX}" y="${paragraphY + (large ? 28 : 17)}" font-family="${escapeXml(bodyFont)}" font-size="${bodySize}" fill="${escapeXml(text)}">and highlighted terms in the same document.</text>

      <g transform="translate(${docX} ${listY})">
        <text x="0" y="0" font-family="${escapeXml(headingFont)}" font-size="${h3Size}" font-weight="${escapeXml(h3Weight)}" fill="${escapeXml(h3Color)}">Task List</text>
        <rect x="0" y="${large ? 26 : 16}" width="${checkSize}" height="${checkSize}" rx="${controlRadius * 0.45}" fill="${escapeXml(checkboxCheckedBg)}" stroke="${escapeXml(checkboxCheckedBg)}" stroke-width="${large ? 2 : 1}"/>
        <path d="${large ? 'M4 36 L9 42 L17 30' : 'M2.5 22 L5.5 26 L10 18'}" fill="none" stroke="${escapeXml(checkboxCheck)}" stroke-width="${large ? 2.4 : 1.5}" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${large ? 34 : 22}" y="${large ? 43 : 27}" font-family="${escapeXml(bodyFont)}" font-size="${bodySize}" fill="${escapeXml(taskDone)}" text-decoration="line-through">Map heading levels</text>
        <rect x="0" y="${large ? 62 : 40}" width="${checkSize}" height="${checkSize}" rx="${controlRadius * 0.45}" fill="${escapeXml(checkboxBg)}" stroke="${escapeXml(checkboxBorder)}" stroke-width="${large ? 2 : 1}"/>
        <text x="${large ? 34 : 22}" y="${large ? 79 : 51}" font-family="${escapeXml(bodyFont)}" font-size="${bodySize}" fill="${escapeXml(text)}">Review callouts and tables</text>
      </g>

      <g transform="translate(${docX} ${tagY})">
        <rect width="${large ? 126 : 76}" height="${large ? 30 : 19}" rx="${controlRadius}" fill="${escapeXml(inlineCodeBg)}"/>
        <text x="${large ? 13 : 8}" y="${large ? 21 : 13}" font-family="${escapeXml(monoFont)}" font-size="${smallSize}" fill="${escapeXml(inlineCodeText)}">inline code</text>
        <rect x="${large ? 146 : 90}" width="${large ? 96 : 58}" height="${large ? 30 : 19}" rx="${controlRadius}" fill="${escapeXml(markBg)}"/>
        <text x="${large ? 160 : 99}" y="${large ? 21 : 13}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" font-weight="700" fill="${escapeXml(markText)}">highlight</text>
        <rect x="${large ? 262 : 162}" width="${large ? 92 : 56}" height="${large ? 30 : 19}" rx="${controlRadius}" fill="${escapeXml(tagBg)}"/>
        <text x="${large ? 278 : 172}" y="${large ? 21 : 13}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" font-weight="700" fill="${escapeXml(tagText)}">#theme</text>
        <rect x="${large ? 370 : 230}" width="${large ? 92 : 56}" height="${large ? 30 : 19}" rx="${controlRadius}" fill="${escapeXml(accentMuted)}"/>
        <text x="${large ? 386 : 240}" y="${large ? 21 : 13}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" font-weight="700" fill="${escapeXml(accent)}">#reader</text>
      </g>

      <g transform="translate(${docX} ${calloutY})">
        <rect width="${leftWidth}" height="${calloutHeight}" rx="${calloutRadius}" fill="${escapeXml(calloutBg)}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.6 : 1}"/>
        <rect width="${large ? 8 : 5}" height="${calloutHeight}" rx="${large ? 4 : 2.5}" fill="${escapeXml(calloutBorder)}"/>
        <text x="${large ? 26 : 17}" y="${large ? 29 : 20}" font-family="${escapeXml(bodyFont)}" font-size="${bodySize}" font-weight="700" fill="${escapeXml(calloutTitle)}">Callout</text>
        <text x="${large ? 26 : 17}" y="${large ? 55 : 34}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(calloutText)}">Tokens shape notes, warnings, and references.</text>
      </g>

      <g transform="translate(${rightX} ${docY})">
        <text x="0" y="0" font-family="${escapeXml(headingFont)}" font-size="${h3Size}" font-weight="${escapeXml(h3Weight)}" fill="${escapeXml(h3Color)}">Code Block</text>
        <rect x="0" y="${large ? 24 : 15}" width="${rightWidth}" height="${large ? 114 : 74}" rx="${codeRadius}" fill="${escapeXml(codeBg)}" stroke="${escapeXml(codeBorder)}" stroke-width="${large ? 1.5 : 1}"/>
        <text x="${large ? 22 : 14}" y="${codeY - docY + (large ? 0 : -1)}" font-family="${escapeXml(monoFont)}" font-size="${smallSize}" fill="${escapeXml(syntaxKeyword)}">const reader = &quot;focused&quot;;</text>
        <text x="${large ? 22 : 14}" y="${codeY - docY + (large ? 30 : 18)}" font-family="${escapeXml(monoFont)}" font-size="${smallSize}" fill="${escapeXml(codeText)}">renderMarkdown(theme);</text>
        <text x="0" y="${large ? 174 : 112}" font-family="${escapeXml(headingFont)}" font-size="${h3Size}" font-weight="${escapeXml(h3Weight)}" fill="${escapeXml(h3Color)}">Quote</text>
        <rect x="0" y="${large ? 196 : 126}" width="${rightWidth}" height="${large ? 74 : 50}" rx="${calloutRadius}" fill="${escapeXml(quoteBg)}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.4 : 1}"/>
        <rect x="0" y="${large ? 196 : 126}" width="${large ? 8 : 5}" height="${large ? 74 : 50}" rx="${large ? 4 : 2.5}" fill="${escapeXml(quoteBorder)}"/>
        <text x="${large ? 24 : 16}" y="${large ? 226 : 146}" font-family="${escapeXml(bodyFont)}" font-size="${bodySize}" fill="${escapeXml(quoteText)}">Preview the real document rhythm.</text>
        <text x="${large ? 24 : 16}" y="${large ? 254 : 164}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(quoteText)}">Spacing, borders, and contrast matter.</text>
      </g>

      <g transform="translate(${docX} ${tableY})">
        <text x="0" y="0" font-family="${escapeXml(headingFont)}" font-size="${h3Size}" font-weight="${escapeXml(h3Weight)}" fill="${escapeXml(h3Color)}">Status Table</text>
        <rect x="0" y="${tableTop}" width="${tableWidth}" height="${tableHeight}" rx="${calloutRadius}" fill="${escapeXml(surface)}" stroke="${escapeXml(tableBorder)}" stroke-width="${large ? 1.5 : 1}"/>
        <rect x="0" y="${tableTop}" width="${tableWidth}" height="${tableHeaderHeight}" rx="${calloutRadius}" fill="${escapeXml(tableHead)}"/>
        <rect x="0" y="${tableTop + tableHeaderHeight + tableRowHeight}" width="${tableWidth}" height="${tableRowHeight}" fill="${escapeXml(tableStripe)}"/>
        <line x1="${tableColumnA}" y1="${tableTop}" x2="${tableColumnA}" y2="${tableTop + tableHeight}" stroke="${escapeXml(tableBorder)}" stroke-width="${large ? 1.2 : 0.8}"/>
        <line x1="${tableColumnB}" y1="${tableTop}" x2="${tableColumnB}" y2="${tableTop + tableHeight}" stroke="${escapeXml(tableBorder)}" stroke-width="${large ? 1.2 : 0.8}"/>
        <text x="${large ? 20 : 12}" y="${tableHeaderTextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" font-weight="700" fill="${escapeXml(tableText)}">Block</text>
        <text x="${tableColumnA + (large ? 20 : 12)}" y="${tableHeaderTextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" font-weight="700" fill="${escapeXml(tableText)}">Signal</text>
        <text x="${tableColumnB + (large ? 20 : 12)}" y="${tableHeaderTextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" font-weight="700" fill="${escapeXml(tableText)}">State</text>
        <text x="${large ? 20 : 12}" y="${tableRow1TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(tableText)}">Headings</text>
        <text x="${tableColumnA + (large ? 20 : 12)}" y="${tableRow1TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(tableText)}">H1/H2/H3</text>
        <text x="${tableColumnB + (large ? 20 : 12)}" y="${tableRow1TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(accent)}">Visible</text>
        <text x="${large ? 20 : 12}" y="${tableRow2TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(tableText)}">Tasks</text>
        <text x="${tableColumnA + (large ? 20 : 12)}" y="${tableRow2TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(tableText)}">Checked rows</text>
        <text x="${tableColumnB + (large ? 20 : 12)}" y="${tableRow2TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(accent)}">Styled</text>
        <text x="${large ? 20 : 12}" y="${tableRow3TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(tableText)}">Code</text>
        <text x="${tableColumnA + (large ? 20 : 12)}" y="${tableRow3TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(tableText)}">Syntax colors</text>
        <text x="${tableColumnB + (large ? 20 : 12)}" y="${tableRow3TextY}" font-family="${escapeXml(bodyFont)}" font-size="${smallSize}" fill="${escapeXml(accent)}">Ready</text>
      </g>

      <g transform="translate(${width - (large ? 224 : 132)} ${contentY + (large ? 44 : 26)})">
        <circle cx="0" cy="0" r="${large ? 18 : 11}" fill="${escapeXml(text)}" fill-opacity="0.18"/>
        <circle cx="${large ? 46 : 28}" cy="0" r="${large ? 18 : 11}" fill="${escapeXml(accent)}"/>
        <circle cx="${large ? 92 : 56}" cy="0" r="${large ? 18 : 11}" fill="${escapeXml(calloutBorder)}"/>
      </g>
    </g>
  `;
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
      <p class="intro">Generated previews for 10 Obsidian-inspired original remote theme packages.</p>
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
    `主题包：[\`${theme.id}.mdv-theme.json\`](https://raw.githubusercontent.com/elvisqi/Local-Markdown-Reader/2.0/themes/packages/${theme.id}.mdv-theme.json)`,
    '',
  ].join('\n')).join('\n');

  return `## Local Markdown Reader ${RELEASE_VERSION} 主题预览素材

![Local Markdown Reader ${RELEASE_VERSION} theme showcase](${PREVIEW_BASE_URL}theme-showcase-${RELEASE_VERSION}.svg)

本次发布包含 10 个参考 Obsidian 流行风格方向制作的原创远程主题包，下面的预览图由仓库内主题 token 自动生成，可直接用于 GitHub Release 描述。

${rows}`;
}

function renderReadme(themes) {
  const themeList = themes.map((theme) => `- [${theme.name}](./${theme.id}.svg)`).join('\n');
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

Themes:

${themeList}
`;
}

function renderSvg({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
${body}
</svg>
`.replace(/[ \t]+$/gm, '');
}

function renderTextLines(lines, options) {
  const { x, y, fontSize, lineHeight, fill } = options;
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" fill="${escapeXml(fill)}">${escapeXml(line)}</text>`
  )).join('\n');
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

function scaledRadius(value, multiplier, fallback) {
  const match = String(value).trim().match(/^([0-9]+(?:\.[0-9]+)?)(?:px)?$/i);
  if (!match) {
    return fallback;
  }
  return Math.max(0, Math.round(Number.parseFloat(match[1]) * multiplier));
}

function scaledFont(value, multiplier, min, max) {
  const match = String(value).trim().match(/^([0-9]+(?:\.[0-9]+)?)(?:px)?$/i);
  if (!match) {
    return Math.round((min + max) / 2);
  }
  return clamp(Math.round(Number.parseFloat(match[1]) * multiplier), min, max);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
