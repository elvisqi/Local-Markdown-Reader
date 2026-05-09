import { readFileSync } from 'node:fs';

const readerHtml = readFileSync(new URL('../dist/reader.html', import.meta.url), 'utf8');

if (readerHtml.includes('/src/reader/main.tsx')) {
  throw new Error('dist/reader.html still points at the source entry instead of a built asset.');
}

if (!/assets\/reader(?:\.html)?-[^"]+\.js/.test(readerHtml)) {
  throw new Error('dist/reader.html does not include a built reader JavaScript asset.');
}

console.log('dist reader entry verified');
