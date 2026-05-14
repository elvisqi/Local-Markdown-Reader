import type { ManifestV3Export } from '@crxjs/vite-plugin';

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDescription__',
  version: '1.5.3',
  default_locale: 'en',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: '__MSG_extensionShortName__',
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
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
