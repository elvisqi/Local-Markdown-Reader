import mermaid from 'mermaid';

export type MermaidRendererApi = {
  initialize: (config: Parameters<typeof mermaid.initialize>[0]) => void;
  render: typeof mermaid.render;
};

type MermaidRendererOptions = {
  reloadPage?: () => void;
  storage?: Storage | null;
};

let initialized = false;
let nextDiagramId = 1;

const WRAPPER_CLASS = 'mermaid-fullscreen';
const DIAGRAM_CLASS = 'mermaid-diagram';
const TRIGGER_CLASS = 'mermaid-fullscreen__trigger';
const OVERLAY_CLASS = 'mermaid-fullscreen__overlay';
const ACTIONS_CLASS = 'mermaid-fullscreen__actions';
const DYNAMIC_IMPORT_RELOAD_KEY_PREFIX = 'localMarkdownReader.mermaidDynamicImportReload.';

export async function renderMermaidBlocks(
  root: ParentNode,
  api: MermaidRendererApi = mermaid,
  options: MermaidRendererOptions = {},
) {
  const codeBlocks = Array.from(root.querySelectorAll<HTMLElement>('pre > code.language-mermaid'));

  if (!codeBlocks.length) {
    return;
  }

  if (!initialized) {
    api.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    });
    initialized = true;
  }

  for (const codeBlock of codeBlocks) {
    const pre = codeBlock.parentElement;

    if (!pre || pre.dataset.mermaidRendered === 'true') {
      continue;
    }

    pre.dataset.mermaidRendered = 'true';
    const result = await renderMermaidBlock(pre, codeBlock.textContent ?? '', api, options);

    if (result === 'reload') {
      return;
    }
  }
}

export function resetMermaidRendererForTests() {
  initialized = false;
  nextDiagramId = 1;
}

async function renderMermaidBlock(
  pre: HTMLElement,
  source: string,
  api: MermaidRendererApi,
  options: MermaidRendererOptions,
) {
  const diagram = document.createElement('div');
  diagram.className = DIAGRAM_CLASS;
  diagram.setAttribute('role', 'img');
  diagram.setAttribute('aria-label', 'Mermaid 图表');
  pre.before(diagram);

  try {
    const { svg } = await api.render(`mermaid-diagram-${nextDiagramId++}`, source.trim());
    diagram.innerHTML = svg;
    diagram.classList.add('is-rendered');
    wrapMermaidDiagram(diagram);
    pre.remove();
  } catch (err) {
    if (reloadOnceForDynamicImportError(err, options)) {
      delete pre.dataset.mermaidRendered;
      diagram.remove();
      return 'reload';
    }

    diagram.classList.add('has-error');
    const message = document.createElement('p');
    message.className = 'mermaid-diagram__error';
    message.textContent = `Mermaid 图表渲染失败：${err instanceof Error ? err.message : '无法解析图表'}`;
    diagram.append(message);
  }

  return 'done';
}

function reloadOnceForDynamicImportError(err: unknown, options: MermaidRendererOptions): boolean {
  const importTarget = extractDynamicImportTarget(err);

  if (!importTarget) {
    return false;
  }

  const storage = options.storage ?? getSessionStorage();
  const reloadKey = `${DYNAMIC_IMPORT_RELOAD_KEY_PREFIX}${importTarget}`;

  if (storage?.getItem(reloadKey) === 'true') {
    return false;
  }

  try {
    storage?.setItem(reloadKey, 'true');
  } catch {
    // Session storage can be unavailable in restricted extension contexts.
  }

  const reloadPage = options.reloadPage ?? (() => window.location.reload());
  reloadPage();
  return true;
}

function extractDynamicImportTarget(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/(?:Failed to fetch|error loading) dynamically imported module:\s*(\S+)/i);

  if (match?.[1]) {
    return match[1];
  }

  return message.includes('dynamically imported module') ? message : null;
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function wrapMermaidDiagram(diagram: HTMLElement) {
  const wrapper = document.createElement('div');
  wrapper.className = WRAPPER_CLASS;

  const actions = document.createElement('div');
  actions.className = ACTIONS_CLASS;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = TRIGGER_CLASS;
  trigger.setAttribute('aria-label', '最大化图表');
  trigger.title = '最大化图表';
  trigger.addEventListener('click', () => openMermaidOverlay(diagram));

  diagram.before(wrapper);
  wrapper.append(diagram);
  actions.append(trigger);
  wrapper.append(actions);
}

function openMermaidOverlay(diagram: HTMLElement) {
  closeMermaidOverlay();

  const overlay = document.createElement('div');
  const readerAppClasses = Array.from(diagram.closest<HTMLElement>('.reader-app')?.classList ?? ['reader-app']);
  overlay.className = [OVERLAY_CLASS, ...readerAppClasses].join(' ');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '最大化图表');

  const panel = document.createElement('div');
  panel.className = 'table-fullscreen__panel mermaid-fullscreen__panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'table-fullscreen__toolbar';

  const title = document.createElement('span');
  title.textContent = '图表';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'table-fullscreen__close';
  closeButton.textContent = '关闭';

  const body = document.createElement('div');
  body.className = 'table-fullscreen__body mermaid-fullscreen__body';
  body.append(diagram.cloneNode(true));
  body.querySelector(`.${TRIGGER_CLASS}`)?.remove();

  const close = () => closeMermaidOverlay();
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  closeButton.addEventListener('click', close);
  document.addEventListener('keydown', handleKeydown);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  overlay.addEventListener('mermaid-fullscreen-close', () => {
    closeButton.removeEventListener('click', close);
    document.removeEventListener('keydown', handleKeydown);
  });

  toolbar.append(title, closeButton);
  panel.append(toolbar, body);
  overlay.append(panel);
  document.body.append(overlay);
  closeButton.focus();
}

function closeMermaidOverlay() {
  const overlay = document.querySelector<HTMLElement>(`.${OVERLAY_CLASS}`);
  if (!overlay) {
    return;
  }

  overlay.dispatchEvent(new Event('mermaid-fullscreen-close'));
  overlay.remove();
}
