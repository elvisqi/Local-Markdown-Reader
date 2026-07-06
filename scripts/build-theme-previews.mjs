import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RELEASE_VERSION = '2.3.1';
const PREVIEW_DIR = 'themes/previews';
const PREVIEW_BASE_URL = 'https://raw.githubusercontent.com/elvisqi/Local-Markdown-Reader/2.0/themes/previews/';
const THEME_IDS = [
  'classic-journal',
  'graphite-doc',
  'midnight-prose',
  'mint-brief',
  'mono-grid',
  'oceanic-code',
  'paper-note',
  'plum-note',
  'solar-desk',
  'terminal-ink',
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
      <text x="${padding}" y="108" font-family="Inter, Arial, sans-serif" font-size="18" fill="#4b5563">10 original theme previews generated from checked-in theme packages.</text>
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
  const codeBg = token(tokens, '--reader-code-bg', '#f3f4f6');
  const codeText = token(tokens, '--reader-code-text', text);
  const tableHead = token(tokens, '--reader-table-head', '#f3f4f6');
  const tableStripe = token(tokens, '--reader-table-stripe', '#f9fafb');
  const rule = token(tokens, '--reader-rule', border);
  const quoteBg = token(tokens, '--reader-quote-bg', '#f9fafb');
  const quoteBorder = token(tokens, '--reader-quote-border', link);
  const quoteText = token(tokens, '--reader-quote-text', muted);

  const scale = width / 1280;
  const padding = large ? 54 : 30;
  const contentX = x + padding;
  const contentY = y + padding;
  const surfaceX = x + padding * 0.76;
  const surfaceY = y + padding * 1.52;
  const surfaceWidth = width - padding * 1.52;
  const surfaceHeight = height - padding * 2;
  const headingSize = large ? 46 : 26;
  const bodySize = large ? 23 : 14;
  const smallSize = large ? 18 : 11;
  const radius = large ? 34 : 22;
  const chipText = contrastText(link);
  const descriptionLines = wrapText(theme.description ?? '', large ? 76 : 58).slice(0, large ? 2 : 1);

  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="${radius}" fill="${escapeXml(pageBg)}"/>
      <rect x="${surfaceX - x}" y="${surfaceY - y}" width="${surfaceWidth}" height="${surfaceHeight}" rx="${large ? 30 : 18}" fill="${escapeXml(surface)}" stroke="${escapeXml(border)}" stroke-width="${large ? 2 : 1.4}"/>
      <rect x="${contentX - x}" y="${contentY - y}" width="${large ? 184 : 112}" height="${large ? 40 : 26}" rx="${large ? 20 : 13}" fill="${escapeXml(link)}"/>
      <text x="${contentX - x + (large ? 24 : 14)}" y="${contentY - y + (large ? 27 : 18)}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" font-weight="700" fill="${chipText}">${escapeXml(theme.colorScheme.toUpperCase())}</text>
      <text x="${contentX - x}" y="${contentY - y + (large ? 116 : 72)}" font-family="Inter, Arial, sans-serif" font-size="${headingSize}" font-weight="750" fill="${escapeXml(text)}">${escapeXml(theme.name)}</text>
      ${renderTextLines(descriptionLines, {
        x: contentX - x,
        y: contentY - y + (large ? 158 : 100),
        fontSize: bodySize,
        lineHeight: large ? 32 : 19,
        fill: muted,
      })}
      <line x1="${contentX - x}" y1="${contentY - y + (large ? 224 : 142)}" x2="${contentX - x + surfaceWidth - padding * 0.5}" y2="${contentY - y + (large ? 224 : 142)}" stroke="${escapeXml(rule)}" stroke-width="${large ? 2 : 1}"/>
      <text x="${contentX - x}" y="${contentY - y + (large ? 282 : 178)}" font-family="Inter, Arial, sans-serif" font-size="${large ? 28 : 17}" font-weight="700" fill="${escapeXml(text)}">Project Notes</text>
      <text x="${contentX - x}" y="${contentY - y + (large ? 323 : 204)}" font-family="Inter, Arial, sans-serif" font-size="${bodySize}" fill="${escapeXml(text)}">Readable prose, tables, code, and callouts in one preview.</text>
      <text x="${contentX - x}" y="${contentY - y + (large ? 363 : 230)}" font-family="Inter, Arial, sans-serif" font-size="${bodySize}" fill="${escapeXml(link)}">https://local-markdown-reader/themes/${escapeXml(theme.id)}</text>

      <g transform="translate(${contentX - x} ${contentY - y + (large ? 402 : 256)})">
        <rect width="${surfaceWidth * 0.44}" height="${large ? 118 : 74}" rx="${large ? 18 : 11}" fill="${escapeXml(quoteBg)}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.6 : 1}"/>
        <rect width="${large ? 8 : 5}" height="${large ? 118 : 74}" rx="${large ? 4 : 2.5}" fill="${escapeXml(quoteBorder)}"/>
        <text x="${large ? 28 : 18}" y="${large ? 43 : 28}" font-family="Inter, Arial, sans-serif" font-size="${bodySize}" font-weight="650" fill="${escapeXml(quoteText)}">Callout</text>
        <text x="${large ? 28 : 18}" y="${large ? 78 : 50}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(quoteText)}">Great for reviewing structured Markdown.</text>
      </g>

      <g transform="translate(${contentX - x + surfaceWidth * 0.5} ${contentY - y + (large ? 402 : 256)})">
        <rect width="${surfaceWidth * 0.38}" height="${large ? 118 : 74}" rx="${large ? 18 : 11}" fill="${escapeXml(codeBg)}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.6 : 1}"/>
        <text x="${large ? 26 : 17}" y="${large ? 45 : 29}" font-family="SFMono-Regular, Consolas, monospace" font-size="${smallSize}" fill="${escapeXml(codeText)}">const reader = "focused";</text>
        <text x="${large ? 26 : 17}" y="${large ? 80 : 51}" font-family="SFMono-Regular, Consolas, monospace" font-size="${smallSize}" fill="${escapeXml(codeText)}">renderMarkdown(theme);</text>
      </g>

      <g transform="translate(${contentX - x} ${contentY - y + (large ? 560 : 350)})">
        <rect width="${surfaceWidth * 0.88}" height="${large ? 106 : 68}" rx="${large ? 16 : 10}" fill="${escapeXml(surface)}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.6 : 1}"/>
        <rect width="${surfaceWidth * 0.88}" height="${large ? 38 : 24}" rx="${large ? 16 : 10}" fill="${escapeXml(tableHead)}"/>
        <rect y="${large ? 38 : 24}" width="${surfaceWidth * 0.88}" height="${large ? 34 : 22}" fill="${escapeXml(tableStripe)}"/>
        <line x1="${surfaceWidth * 0.32}" y1="0" x2="${surfaceWidth * 0.32}" y2="${large ? 106 : 68}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.2 : 0.8}"/>
        <line x1="${surfaceWidth * 0.62}" y1="0" x2="${surfaceWidth * 0.62}" y2="${large ? 106 : 68}" stroke="${escapeXml(border)}" stroke-width="${large ? 1.2 : 0.8}"/>
        <text x="${large ? 24 : 15}" y="${large ? 26 : 17}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" font-weight="700" fill="${escapeXml(text)}">Metric</text>
        <text x="${surfaceWidth * 0.32 + (large ? 24 : 15)}" y="${large ? 26 : 17}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" font-weight="700" fill="${escapeXml(text)}">Value</text>
        <text x="${surfaceWidth * 0.62 + (large ? 24 : 15)}" y="${large ? 26 : 17}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" font-weight="700" fill="${escapeXml(text)}">State</text>
        <text x="${large ? 24 : 15}" y="${large ? 62 : 40}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(text)}">Tables</text>
        <text x="${surfaceWidth * 0.32 + (large ? 24 : 15)}" y="${large ? 62 : 40}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(text)}">Dense</text>
        <text x="${surfaceWidth * 0.62 + (large ? 24 : 15)}" y="${large ? 62 : 40}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(link)}">Clear</text>
        <text x="${large ? 24 : 15}" y="${large ? 96 : 62}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(text)}">Code</text>
        <text x="${surfaceWidth * 0.32 + (large ? 24 : 15)}" y="${large ? 96 : 62}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(text)}">Readable</text>
        <text x="${surfaceWidth * 0.62 + (large ? 24 : 15)}" y="${large ? 96 : 62}" font-family="Inter, Arial, sans-serif" font-size="${smallSize}" fill="${escapeXml(link)}">Ready</text>
      </g>

      <g transform="translate(${width - (large ? 254 : 154)} ${height - (large ? 92 : 58)}) scale(${scale})">
        <circle cx="0" cy="0" r="22" fill="${escapeXml(text)}" fill-opacity="0.18"/>
        <circle cx="54" cy="0" r="22" fill="${escapeXml(link)}"/>
        <circle cx="108" cy="0" r="22" fill="${escapeXml(quoteBorder)}"/>
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
      <p class="intro">Generated previews for the 10 original remote theme packages introduced in ${RELEASE_VERSION}.</p>
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

本次发布包含 10 个原创远程主题包，下面的预览图由仓库内主题 token 自动生成，可直接用于 GitHub Release 描述。

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
`;
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
