export function getReaderUrl(): string {
  return chrome.runtime.getURL('reader.html');
}

export async function openReaderPage(): Promise<void> {
  await chrome.tabs.create({ url: getReaderUrl() });
}
