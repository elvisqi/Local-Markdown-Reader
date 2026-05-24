import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { readFileSync } from 'node:fs';
import { defineConfig, type PluginOption } from 'vite';
import { resolve } from 'node:path';

import manifest from './src/manifest';

const sandboxHtmlPath = resolve(__dirname, 'html-preview-sandbox.html');
const sandboxHtmlSource = readFileSync(sandboxHtmlPath, 'utf8');

function staticSandboxHtmlPlugin(): PluginOption {
  return {
    name: 'static-sandbox-html',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'html-preview-sandbox.html',
        source: sandboxHtmlSource,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), crx({ manifest }), staticSandboxHtmlPlugin()],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        reader: resolve(__dirname, 'reader.html'),
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },
});
