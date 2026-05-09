import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

import manifest from './src/manifest';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        reader: resolve(__dirname, 'reader.html'),
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },
});
