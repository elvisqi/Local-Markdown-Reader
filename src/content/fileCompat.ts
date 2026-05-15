const isMarkdownPath = /\.(?:md|markdown|mdown|mkdn|mdtxt|mdtext)(?:[#?].*)?$/i.test(
  window.location.pathname,
);
const INLINE_TEMPORARY_SOURCE_LIMIT_CHARS = 2 * 1024 * 1024;

if (isMarkdownPath) {
  document.documentElement.dataset.markdownReaderCompatible = 'true';
  const banner = document.createElement('div');
  banner.dataset.markdownReaderBanner = 'true';
  banner.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'top:12px',
    'right:12px',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'padding:10px 12px',
    'border:1px solid #c8d0da',
    'border-radius:8px',
    'background:#fff',
    'box-shadow:0 8px 24px rgba(20,30,42,.14)',
    'font:13px system-ui,sans-serif',
    'color:#18202a',
  ].join(';');
  banner.textContent = 'Markdown Reader';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Open reader';
  button.style.cssText =
    'border:1px solid #1769e0;border-radius:6px;background:#1769e0;color:#fff;font:inherit;padding:6px 8px';
  button.addEventListener('click', () => {
    const source = readMarkdownSource();
    const canInlineSource = source.length > 0 && source.length <= INLINE_TEMPORARY_SOURCE_LIMIT_CHARS;

    void chrome.runtime.sendMessage({
      type: 'openReader',
      sourceUrl: window.location.href,
      source: canInlineSource ? source : undefined,
      sourceSize: source.length,
      sourceAvailable: canInlineSource,
    });
  });

  banner.append(button);
  document.body.append(banner);
}

function readMarkdownSource(): string {
  const preSource = document.querySelector('pre')?.textContent;
  if (preSource && preSource.length > 0) {
    return preSource;
  }

  const bodyClone = document.body.cloneNode(true) as HTMLElement;
  bodyClone.querySelector('[data-markdown-reader-banner="true"]')?.remove();
  return bodyClone.textContent ?? '';
}

export {};
