import { openReaderPage } from '../shared/extension';
import {
  createTemporaryMarkdownDocumentName,
  isMarkdownFileUrl,
  saveTemporaryMarkdownDocument,
} from '../shared/temporaryDocument';

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'openReader') {
    void openReaderFromMessage(message).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

export async function openReaderFromMessage(message: unknown): Promise<void> {
  const sourceUrl = getSourceUrl(message);

  if (!sourceUrl || !isMarkdownFileUrl(sourceUrl)) {
    await openReaderPage();
    return;
  }

  const source = getSource(message);

  if (!source) {
    await openReaderPage();
    return;
  }

  const temporaryDocumentId = await saveTemporaryMarkdownDocument({
    url: sourceUrl,
    name: createTemporaryMarkdownDocumentName(sourceUrl),
    source,
    createdAt: Date.now(),
  });

  await openReaderPage(temporaryDocumentId);
}

function getSourceUrl(message: unknown): string | null {
  if (
    typeof message === 'object' &&
    message !== null &&
    'sourceUrl' in message &&
    typeof message.sourceUrl === 'string'
  ) {
    return message.sourceUrl;
  }

  return null;
}

function getSource(message: unknown): string | null {
  if (
    typeof message === 'object' &&
    message !== null &&
    'source' in message &&
    typeof message.source === 'string'
  ) {
    return message.source;
  }

  return null;
}
