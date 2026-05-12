export function getReaderUrl(temporaryDocumentId?: string | null): string {
  const url = chrome.runtime.getURL('reader.html');

  if (!temporaryDocumentId) {
    return url;
  }

  return `${url}?temporaryDocument=${encodeURIComponent(temporaryDocumentId)}`;
}

export async function openReaderPage(temporaryDocumentId?: string | null): Promise<void> {
  await chrome.tabs.create({ url: getReaderUrl(temporaryDocumentId) });
}
