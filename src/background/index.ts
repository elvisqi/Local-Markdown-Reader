import { openReaderPage } from '../shared/extension';

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'openReader') {
    void openReaderPage().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
