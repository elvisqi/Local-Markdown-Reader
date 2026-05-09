const isMarkdownPath = /\.(?:md|markdown|mdown|mkdn|mdtxt|mdtext)(?:[#?].*)?$/i.test(
  window.location.pathname,
);

if (isMarkdownPath) {
  document.documentElement.dataset.markdownReaderCompatible = 'true';
}
