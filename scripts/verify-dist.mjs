import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const readerHtml = readFileSync(new URL('../dist/reader.html', import.meta.url), 'utf8');
const htmlPreviewSandboxHtml = readFileSync(new URL('../dist/html-preview-sandbox.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../dist/manifest.json', import.meta.url), 'utf8'));
const duplicatedPublicSandboxUrl = new URL('../dist/public/html-preview-sandbox.html', import.meta.url);

if (readerHtml.includes('/src/reader/main.tsx')) {
  throw new Error('dist/reader.html still points at the source entry instead of a built asset.');
}

if (!/assets\/reader(?:\.html)?-[^"]+\.js/.test(readerHtml)) {
  throw new Error('dist/reader.html does not include a built reader JavaScript asset.');
}

if (existsSync(duplicatedPublicSandboxUrl)) {
  throw new Error('dist/public/html-preview-sandbox.html should not be emitted; use the root sandbox page only.');
}

if (/<script[^>]+type="module"/i.test(htmlPreviewSandboxHtml) || /assets\/htmlPreviewSandbox-[^"]+\.js/.test(htmlPreviewSandboxHtml)) {
  throw new Error('dist/html-preview-sandbox.html must use an inline classic script so it can run under sandboxed opaque origin rules.');
}

if (!htmlPreviewSandboxHtml.includes('local-markdown-reader:html-preview-ready')) {
  throw new Error('dist/html-preview-sandbox.html does not include the HTML preview sandbox runtime.');
}

const exposedResources = manifest.web_accessible_resources
  ?.flatMap((entry) => Array.isArray(entry.resources) ? entry.resources : []) ?? [];

for (const requiredResource of ['reader.html', 'html-preview-sandbox.html']) {
  if (!exposedResources.includes(requiredResource)) {
    throw new Error(`dist/manifest.json does not expose ${requiredResource} as a web-accessible resource.`);
  }
}

if (!manifest.sandbox?.pages?.includes('html-preview-sandbox.html')) {
  throw new Error('dist/manifest.json does not register html-preview-sandbox.html as a sandbox page.');
}

if (manifest.sandbox?.content_security_policy) {
  throw new Error(
    "dist/manifest.json defines sandbox CSP in sandbox.content_security_policy; Manifest V3 requires content_security_policy.sandbox.",
  );
}

if (!manifest.content_security_policy?.sandbox?.includes('sandbox allow-scripts')) {
  throw new Error('dist/manifest.json does not define content_security_policy.sandbox for sandboxed pages.');
}

await verifyHtmlPreviewSandboxInBrowser();

console.log('dist reader entry verified');

async function verifyHtmlPreviewSandboxInBrowser() {
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error('Chrome or Edge is required to verify the built HTML preview sandbox.');
  }

  const sandboxUrl = new URL('../dist/html-preview-sandbox.html', import.meta.url).href;
  const profilePath = mkdtempSync(join(tmpdir(), 'local-markdown-reader-verify-'));
  const browser = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profilePath}`,
      '--no-first-run',
      '--no-default-browser-check',
      sandboxUrl,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const browserExit = new Promise((resolveExit) => browser.once('exit', resolveExit));

  let stderr = '';
  let browserWebSocketUrl = '';
  browser.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      browserWebSocketUrl = match[1];
    }
  });

  try {
    await waitFor(() => browserWebSocketUrl, 'Chrome did not expose a DevTools endpoint.');
    const pageTarget = await findSandboxPageTarget(browserWebSocketUrl, sandboxUrl);
    const client = await connectToCdp(pageTarget.webSocketDebuggerUrl);

    try {
      await sendCdp(client, 'Runtime.enable');
      await sendCdp(client, 'Page.enable');
      await waitForPageLoad(client);
      await verifySandboxRuntime(client);
    } finally {
      client.close();
    }
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nChrome stderr:\n${stderr}`);
  } finally {
    browser.kill('SIGTERM');
    await browserExit;
    rmSync(profilePath, { recursive: true, force: true });
  }
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function findSandboxPageTarget(browserWebSocketUrl, sandboxUrl) {
  const httpBaseUrl = browserWebSocketUrlToHttpBase(browserWebSocketUrl);

  return waitFor(async () => {
    const targets = await fetchJson(`${httpBaseUrl}/json/list`);
    return targets.find((target) => target.type === 'page' && target.url === sandboxUrl && target.webSocketDebuggerUrl) ?? null;
  }, 'Chrome did not load the built HTML preview sandbox page.');
}

async function verifySandboxRuntime(client) {
  const result = await evaluateCdpExpression(client, String.raw`
    new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), 6000);
      const messages = [];
      window.__localMarkdownReaderVerifyMessages = messages;
      const preview = document.querySelector('#preview');

      window.addEventListener('message', (event) => {
        messages.push(event.data);
      });

      window.postMessage({
        type: 'local-markdown-reader:render-html-preview',
        html: '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src none"></head><body><h1 id="top">Top</h1><a href="#details" data-reader-link-id="link-1" style="display:inline-block;padding:20px;background:#eef">Details</a><select id="roleSelect"></select><script>document.getElementById("roleSelect").innerHTML="<option>管理层</option>"; window.parent.postMessage({ type: "local-markdown-reader:browser-fixture", selectText: document.getElementById("roleSelect").textContent, hasCspMeta: Boolean(document.querySelector("meta[http-equiv=Content-Security-Policy i]")) }, "*");</script><div style="height: 1200px"></div><h2 id="details">Details</h2></body></html>',
        headingIds: ['top', 'details'],
      }, '*');

      setTimeout(() => {
        clearTimeout(timeout);
        const previewRect = preview?.getBoundingClientRect();
        resolve({
          ok: true,
          messages,
          sandbox: preview?.getAttribute('sandbox'),
          previewRect: previewRect ? { x: previewRect.left, y: previewRect.top } : null,
        });
      }, 900);
    })
  `);

  if (!result.ok) {
    throw new Error(`HTML preview sandbox browser verification timed out: ${result.reason ?? 'unknown'}`);
  }

  if (result.sandbox !== 'allow-scripts allow-forms allow-popups allow-modals') {
    throw new Error(`HTML preview inner iframe has unexpected sandbox attribute: ${result.sandbox}`);
  }

  if (result.sandbox.includes('allow-same-origin')) {
    throw new Error('HTML preview inner iframe must not include allow-same-origin.');
  }

  const fixtureMessage = result.messages.find((message) => message?.type === 'local-markdown-reader:browser-fixture');

  if (!fixtureMessage?.selectText?.includes('管理层')) {
    throw new Error('HTML preview sandbox did not execute inline page scripts in Chrome.');
  }

  if (fixtureMessage.hasCspMeta) {
    throw new Error('HTML preview sandbox did not remove document CSP meta tags before rendering.');
  }

  if (!result.previewRect) {
    throw new Error('HTML preview sandbox did not render the isolated preview frame.');
  }

  await clickInBrowser(client, result.previewRect.x + 40, result.previewRect.y + 100);
  await evaluateCdpExpression(client, `window.postMessage({ type: 'local-markdown-reader:scroll-html-preview', id: 'details' }, '*')`);

  const bridgeResult = await waitFor(async () => {
    const value = await evaluateCdpExpression(client, String.raw`
      ({
        navigationSeen: window.__localMarkdownReaderVerifyMessages?.some((message) => message?.type === 'local-markdown-reader:navigate-html-link' && message.linkId === 'link-1') ?? false,
        scrollSeen: window.__localMarkdownReaderVerifyMessages?.some((message) => message?.type === 'local-markdown-reader:scroll-html-preview-target' && Number.isFinite(message.top)) ?? false,
      })
    `);
    return value.navigationSeen && value.scrollSeen ? value : null;
  }, 'HTML preview sandbox did not report bridge messages in Chrome.');

  if (!bridgeResult?.navigationSeen) {
    throw new Error('HTML preview sandbox did not route link navigation through the token bridge.');
  }

  if (!bridgeResult.scrollSeen) {
    throw new Error('HTML preview sandbox did not route heading scroll through the token bridge.');
  }
}

async function waitForPageLoad(client) {
  await new Promise((resolveLoad) => {
    const timeout = setTimeout(resolveLoad, 1000);
    client.onMessage = (message) => {
      if (message.method === 'Page.loadEventFired') {
        clearTimeout(timeout);
        resolveLoad();
      }
    };
  });
}

async function evaluateCdpExpression(client, expression, contextId) {
  const response = await sendCdp(client, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    contextId,
  });

  if (response.exceptionDetails) {
    throw new Error(`Chrome evaluation failed: ${response.exceptionDetails.text}`);
  }

  return response.result?.value;
}

async function clickInBrowser(client, x, y) {
  await sendCdp(client, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
  });
  await sendCdp(client, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });
  await sendCdp(client, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });
}

async function connectToCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 0;
  const client = {
    onMessage: null,
    close: () => socket.close(),
    send: (method, params) => {
      nextId += 1;
      const id = nextId;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
  };

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result ?? {});
      }
      return;
    }

    client.onMessage?.(message);
  });

  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });

  return client;
}

function sendCdp(client, method, params) {
  return client.send(method, params);
}

function browserWebSocketUrlToHttpBase(webSocketUrl) {
  const url = new URL(webSocketUrl);
  return `http://${url.host}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.json();
}

async function waitFor(check, message, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await check();
    if (result) {
      return result;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error(message);
}
