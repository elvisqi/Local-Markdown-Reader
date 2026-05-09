import type { ManifestV3Export } from '@crxjs/vite-plugin';

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'Local Markdown Reader',
  description: 'Local-first Markdown reader with folder navigation and document outline.',
  version: '1.1.0',
  action: {
    default_title: 'Markdown Reader',
    default_popup: 'popup.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  options_page: 'options.html',
  permissions: ['storage', 'scripting'],
  host_permissions: ['file:///*'],
  web_accessible_resources: [
    {
      resources: ['reader.html'],
      matches: ['<all_urls>'],
    },
  ],
  content_scripts: [
    {
      matches: ['file:///*'],
      js: ['src/content/fileCompat.ts'],
      run_at: 'document_idle',
    },
  ],
};

export default manifest;
