import { isReadableDocumentFile } from '../shared/fileSystem';

type AssetFileReader = (path: string) => Promise<File | null>;

export type HtmlPreviewDocument = {
  url: string;
  html: string;
  objectUrls: string[];
  navigationLinks: Record<string, HtmlPreviewNavigationLink>;
};

export type HtmlPreviewNavigationLink = {
  path: string;
  hash: string | null;
};

export type HtmlPreviewNavigationMessage = {
  type: 'local-markdown-reader:navigate-html-link';
  linkId: string;
};

export type HtmlPreviewReadyMessage = {
  type: 'local-markdown-reader:html-preview-ready';
};

export type HtmlPreviewActiveHeadingMessage = {
  type: 'local-markdown-reader:active-html-heading';
  id: string | null;
};

export const HTML_PREVIEW_NAVIGATION_MESSAGE_TYPE = 'local-markdown-reader:navigate-html-link';
export const HTML_PREVIEW_RENDER_MESSAGE_TYPE = 'local-markdown-reader:render-html-preview';
export const HTML_PREVIEW_SCROLL_MESSAGE_TYPE = 'local-markdown-reader:scroll-html-preview';
export const HTML_PREVIEW_READY_MESSAGE_TYPE = 'local-markdown-reader:html-preview-ready';
export const HTML_PREVIEW_ACTIVE_HEADING_MESSAGE_TYPE = 'local-markdown-reader:active-html-heading';

type HtmlPreviewOptions = {
  sandboxPageUrl?: string;
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
  options: HtmlPreviewOptions = {},
): Promise<HtmlPreviewDocument> {
  const objectUrls: string[] = [];
  const assetObjectUrls = new Map<string, string>();
  const document = new DOMParser().parseFromString(source, 'text/html');
  let navigationLinks: Record<string, HtmlPreviewNavigationLink> = {};

  if (readAssetFile) {
    await rewriteHtmlResourceUrls(document, documentPath, readAssetFile, objectUrls, assetObjectUrls);
    removeDocumentCspMetaTags(document);

    if (options.sandboxPageUrl) {
      navigationLinks = rewriteHtmlAnchorLinks(document, documentPath);
    }
  }

  const html = serializeHtmlDocument(document, source);
  const url = options.sandboxPageUrl
    ? options.sandboxPageUrl
    : hasExecutableInlineScript(document)
    ? createHtmlDataUrl(html)
    : URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));

  if (!url.startsWith('data:') && !options.sandboxPageUrl) {
    objectUrls.push(url);
  }

  return { url, html, objectUrls, navigationLinks };
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

function rewriteHtmlAnchorLinks(document: Document, documentPath: string): Record<string, HtmlPreviewNavigationLink> {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
  const links: Record<string, HtmlPreviewNavigationLink> = {};
  let linkIndex = 0;

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href');
    if (!href) {
      continue;
    }

    const resolved = resolveLocalLink(href, documentPath);
    if (!resolved) {
      continue;
    }

    linkIndex += 1;
    const linkId = `link-${linkIndex}`;
    anchor.dataset.readerLinkId = linkId;
    links[linkId] = resolved;
  }

  return links;
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

function resolveLocalLink(rawUrl: string, basePath: string): { path: string; hash: string | null } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('/') || trimmed.startsWith('//') || hasExternalScheme(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('#')) {
    const rawHash = trimmed.slice(1);
    return rawHash ? { path: basePath, hash: safeDecodeURIComponent(rawHash) } : null;
  }

  const hashIndex = trimmed.indexOf('#');
  const rawPath = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const rawHash = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : '';
  const path = resolveLocalAssetPath(rawPath, basePath);

  if (!path) {
    return null;
  }

  if (!isReadableDocumentFile(path)) {
    return null;
  }

  return {
    path,
    hash: rawHash ? safeDecodeURIComponent(rawHash) : null,
  };
}

function removeDocumentCspMetaTags(document: Document): void {
  const cspMetaElements = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[http-equiv]'),
  ).filter((element) => element.getAttribute('http-equiv')?.trim().toLowerCase() === 'content-security-policy');

  for (const element of cspMetaElements) {
    element.remove();
  }
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
      if (!normalized.length) {
        return null;
      }

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

function hasExecutableInlineScript(document: Document): boolean {
  return Array.from(document.querySelectorAll<HTMLScriptElement>('script:not([src])')).some((script) => {
    const type = script.getAttribute('type')?.trim().toLowerCase();
    return (!type || type === 'text/javascript' || type === 'application/javascript' || type === 'module')
      && Boolean(script.textContent?.trim());
  });
}

function createHtmlDataUrl(html: string): string {
  const bytes = new TextEncoder().encode(html);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }

  return `data:text/html;charset=utf-8;base64,${btoa(binary)}`;
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
