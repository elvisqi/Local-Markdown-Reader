type AssetFileReader = (path: string) => Promise<File | null>;

export type HtmlPreviewDocument = {
  url: string;
  objectUrls: string[];
};

const URL_ATTRIBUTES: Array<{ selector: string; attribute: string; basePathAttribute?: string }> = [
  { selector: 'script[src]', attribute: 'src' },
  { selector: 'img[src]', attribute: 'src' },
  { selector: 'iframe[src]', attribute: 'src' },
  { selector: 'embed[src]', attribute: 'src' },
  { selector: 'source[src]', attribute: 'src' },
  { selector: 'track[src]', attribute: 'src' },
  { selector: 'video[src]', attribute: 'src' },
  { selector: 'audio[src]', attribute: 'src' },
  { selector: 'input[type="image"][src]', attribute: 'src' },
  { selector: 'object[data]', attribute: 'data' },
  { selector: 'link[href]', attribute: 'href' },
];

export async function createHtmlPreviewDocument(
  source: string,
  documentPath: string,
  readAssetFile?: AssetFileReader,
): Promise<HtmlPreviewDocument> {
  const objectUrls: string[] = [];
  const assetObjectUrls = new Map<string, string>();
  const document = new DOMParser().parseFromString(source, 'text/html');

  if (readAssetFile) {
    await rewriteHtmlResourceUrls(document, documentPath, readAssetFile, objectUrls, assetObjectUrls);
  }

  const html = serializeHtmlDocument(document, source);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  objectUrls.push(url);

  return { url, objectUrls };
}

async function rewriteHtmlResourceUrls(
  document: Document,
  documentPath: string,
  readAssetFile: AssetFileReader,
  objectUrls: string[],
  assetObjectUrls: Map<string, string>,
): Promise<void> {
  for (const { selector, attribute } of URL_ATTRIBUTES) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

    for (const element of elements) {
      const value = element.getAttribute(attribute);
      if (!value) {
        continue;
      }

      const assetUrl = await createAssetObjectUrl(value, documentPath, readAssetFile, objectUrls, assetObjectUrls);
      if (assetUrl) {
        element.setAttribute(attribute, assetUrl);
      }
    }
  }

  const srcsetElements = Array.from(document.querySelectorAll<HTMLElement>('img[srcset], source[srcset]'));
  for (const element of srcsetElements) {
    const value = element.getAttribute('srcset');
    if (!value) {
      continue;
    }

    element.setAttribute('srcset', await rewriteSrcset(value, documentPath, readAssetFile, objectUrls, assetObjectUrls));
  }

  const styleElements = Array.from(document.querySelectorAll<HTMLStyleElement>('style'));
  for (const element of styleElements) {
    element.textContent = await rewriteCssUrls(element.textContent ?? '', documentPath, readAssetFile, objectUrls, assetObjectUrls);
  }

  const styledElements = Array.from(document.querySelectorAll<HTMLElement>('[style]'));
  for (const element of styledElements) {
    const style = element.getAttribute('style');
    if (!style) {
      continue;
    }

    element.setAttribute('style', await rewriteCssUrls(style, documentPath, readAssetFile, objectUrls, assetObjectUrls));
  }
}

async function createAssetObjectUrl(
  rawUrl: string,
  basePath: string,
  readAssetFile: AssetFileReader,
  objectUrls: string[],
  assetObjectUrls: Map<string, string>,
): Promise<string | null> {
  const assetPath = resolveLocalAssetPath(rawUrl, basePath);
  if (!assetPath) {
    return null;
  }

  const cachedUrl = assetObjectUrls.get(assetPath);
  if (cachedUrl) {
    return cachedUrl;
  }

  const file = await readAssetFile(assetPath);
  if (!file) {
    return null;
  }

  const rewrittenFile = isCssFile(assetPath)
    ? new Blob([await rewriteCssUrls(await file.text(), assetPath, readAssetFile, objectUrls, assetObjectUrls)], {
        type: file.type || 'text/css;charset=utf-8',
      })
    : file;
  const objectUrl = URL.createObjectURL(rewrittenFile);
  assetObjectUrls.set(assetPath, objectUrl);
  objectUrls.push(objectUrl);
  return objectUrl;
}

async function rewriteSrcset(
  value: string,
  basePath: string,
  readAssetFile: AssetFileReader,
  objectUrls: string[],
  assetObjectUrls: Map<string, string>,
): Promise<string> {
  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const rewrittenEntries: string[] = [];

  for (const entry of entries) {
    const [url, ...descriptorParts] = entry.split(/\s+/);
    const objectUrl = await createAssetObjectUrl(url, basePath, readAssetFile, objectUrls, assetObjectUrls);
    rewrittenEntries.push([objectUrl ?? url, ...descriptorParts].join(' '));
  }

  return rewrittenEntries.join(', ');
}

async function rewriteCssUrls(
  source: string,
  basePath: string,
  readAssetFile: AssetFileReader,
  objectUrls: string[],
  assetObjectUrls: Map<string, string>,
): Promise<string> {
  const matches = [...source.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)];
  let rewritten = source;
  let offset = 0;

  for (const match of matches) {
    const rawUrl = match[2]?.trim();
    if (!rawUrl || typeof match.index !== 'number') {
      continue;
    }

    const objectUrl = await createAssetObjectUrl(rawUrl, basePath, readAssetFile, objectUrls, assetObjectUrls);
    if (!objectUrl) {
      continue;
    }

    const replacement = `url("${objectUrl}")`;
    const start = match.index + offset;
    const end = start + match[0].length;
    rewritten = `${rewritten.slice(0, start)}${replacement}${rewritten.slice(end)}`;
    offset += replacement.length - match[0].length;
  }

  return rewritten;
}

export function resolveLocalAssetPath(rawUrl: string, basePath: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || hasExternalScheme(trimmed)) {
    return null;
  }

  const withoutFragment = trimmed.split('#')[0] ?? '';
  const withoutQuery = withoutFragment.split('?')[0] ?? '';
  if (!withoutQuery) {
    return null;
  }

  const decodedPath = safeDecodeURIComponent(withoutQuery);
  const parts = decodedPath.startsWith('/')
    ? decodedPath.split('/')
    : [...basePath.split('/').slice(0, -1), ...decodedPath.split('/')];
  const normalized: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }

    if (part === '..') {
      normalized.pop();
      continue;
    }

    normalized.push(part);
  }

  return normalized.join('/');
}

function serializeHtmlDocument(document: Document, originalSource: string): string {
  const doctype = /^<!doctype html>/i.test(originalSource.trimStart()) ? '<!doctype html>\n' : '';
  return `${doctype}${document.documentElement.outerHTML}`;
}

function hasExternalScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isCssFile(path: string): boolean {
  return path.toLowerCase().endsWith('.css');
}
