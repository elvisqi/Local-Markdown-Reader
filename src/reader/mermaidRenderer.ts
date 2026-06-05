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
const ZOOM_CONTROLS_CLASS = 'mermaid-zoom__controls';
const ZOOM_BUTTON_CLASS = 'mermaid-zoom__button';
const ZOOM_VALUE_CLASS = 'mermaid-zoom__value';
const DYNAMIC_IMPORT_RELOAD_KEY_PREFIX = 'localMarkdownReader.mermaidDynamicImportReload.';
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

type SvgSize = {
  width: number;
  height: number;
};

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

function createMermaidZoomControls(wrapper: HTMLElement, diagram: HTMLElement) {
  const controls = document.createElement('div');
  controls.className = ZOOM_CONTROLS_CLASS;

  const zoomOut = createMermaidZoomButton('out', '−', '缩小图表');
  const value = document.createElement('span');
  value.className = ZOOM_VALUE_CLASS;
  value.setAttribute('aria-live', 'polite');
  const zoomIn = createMermaidZoomButton('in', '+', '放大图表');
  const reset = createMermaidZoomButton('reset', '100%', '重置图表缩放');

  zoomOut.addEventListener('click', () => setMermaidZoom(wrapper, diagram, getMermaidZoom(wrapper) - ZOOM_STEP));
  zoomIn.addEventListener('click', () => setMermaidZoom(wrapper, diagram, getMermaidZoom(wrapper) + ZOOM_STEP));
  reset.addEventListener('click', () => {
    setMermaidZoom(wrapper, diagram, DEFAULT_ZOOM);
    setMermaidPan(wrapper, diagram, 0, 0);
  });

  controls.append(zoomOut, value, zoomIn, reset);
  return controls;
}

function createMermaidZoomButton(action: 'out' | 'in' | 'reset', text: string, label: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = ZOOM_BUTTON_CLASS;
  button.dataset.mermaidZoomAction = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.textContent = text;
  return button;
}

function setMermaidZoom(wrapper: HTMLElement, diagram: HTMLElement, zoom: number) {
  const nextZoom = normalizeMermaidZoom(zoom);
  wrapper.dataset.mermaidZoom = formatMermaidZoom(nextZoom);
  setMermaidDiagramSize(diagram, nextZoom);

  const value = wrapper.querySelector<HTMLElement>(`.${ZOOM_VALUE_CLASS}`);
  if (value) {
    value.textContent = `${Math.round(nextZoom * 100)}%`;
  }

  const zoomOut = wrapper.querySelector<HTMLButtonElement>(
    `.${ZOOM_BUTTON_CLASS}[data-mermaid-zoom-action="out"]`,
  );
  const zoomIn = wrapper.querySelector<HTMLButtonElement>(
    `.${ZOOM_BUTTON_CLASS}[data-mermaid-zoom-action="in"]`,
  );
  const reset = wrapper.querySelector<HTMLButtonElement>(
    `.${ZOOM_BUTTON_CLASS}[data-mermaid-zoom-action="reset"]`,
  );
  if (zoomOut) {
    zoomOut.disabled = nextZoom <= MIN_ZOOM;
  }
  if (zoomIn) {
    zoomIn.disabled = nextZoom >= MAX_ZOOM;
  }
  updateMermaidResetButton(wrapper, reset, nextZoom);
}

function installMermaidPan(wrapper: HTMLElement, diagram: HTMLElement) {
  const svg = diagram.querySelector<SVGElement>('svg');
  if (!svg) {
    return;
  }

  let activePointerId: number | null = null;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    activePointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startPanX = getMermaidPan(wrapper, 'x');
    startPanY = getMermaidPan(wrapper, 'y');
    svg.classList.add('is-dragging');
    svg.setPointerCapture?.(event.pointerId);
  });

  svg.addEventListener('pointermove', (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    setMermaidPan(
      wrapper,
      diagram,
      startPanX + event.clientX - startClientX,
      startPanY + event.clientY - startClientY,
    );
  });

  const stopDrag = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    activePointerId = null;
    svg.classList.remove('is-dragging');
    svg.releasePointerCapture?.(event.pointerId);
  };

  svg.addEventListener('pointerup', stopDrag);
  svg.addEventListener('pointercancel', stopDrag);
}

function getMermaidZoom(wrapper: HTMLElement | null) {
  if (!wrapper) {
    return DEFAULT_ZOOM;
  }

  const zoom = Number(wrapper.dataset.mermaidZoom);
  return Number.isFinite(zoom) ? normalizeMermaidZoom(zoom) : DEFAULT_ZOOM;
}

function normalizeMermaidZoom(zoom: number) {
  const steppedZoom = Math.round(zoom / ZOOM_STEP) * ZOOM_STEP;
  return Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, steppedZoom)).toFixed(2));
}

function formatMermaidZoom(zoom: number) {
  return String(zoom);
}

function setMermaidPan(wrapper: HTMLElement, diagram: HTMLElement, panX: number, panY: number) {
  const nextPanX = Math.round(panX);
  const nextPanY = Math.round(panY);
  wrapper.dataset.mermaidPanX = String(nextPanX);
  wrapper.dataset.mermaidPanY = String(nextPanY);

  const svg = diagram.querySelector<SVGElement>('svg');
  if (!svg) {
    return;
  }

  svg.style.transform = `translate(${nextPanX}px, ${nextPanY}px)`;
  updateMermaidResetButton(wrapper);
}

function getMermaidPan(wrapper: HTMLElement, axis: 'x' | 'y') {
  const value = axis === 'x' ? Number(wrapper.dataset.mermaidPanX) : Number(wrapper.dataset.mermaidPanY);
  return Number.isFinite(value) ? value : 0;
}

function updateMermaidResetButton(wrapper: HTMLElement, reset?: HTMLButtonElement | null, zoom = getMermaidZoom(wrapper)) {
  const resetButton = reset ?? wrapper.querySelector<HTMLButtonElement>(
    `.${ZOOM_BUTTON_CLASS}[data-mermaid-zoom-action="reset"]`,
  );
  if (!resetButton) {
    return;
  }

  resetButton.disabled = zoom === DEFAULT_ZOOM && getMermaidPan(wrapper, 'x') === 0 && getMermaidPan(wrapper, 'y') === 0;
}

function setMermaidDiagramSize(diagram: HTMLElement, zoom: number) {
  const svg = diagram.querySelector<SVGElement>('svg');
  if (!svg) {
    return;
  }

  svg.style.width = `${Math.round(zoom * 100)}%`;
  svg.style.maxWidth = 'none';
}

function getInitialMermaidZoom(diagram: HTMLElement) {
  const svg = diagram.querySelector<SVGElement>('svg');
  const svgSize = svg ? getMermaidSvgSize(svg) : null;
  const availableSize = diagram.getBoundingClientRect();

  if (!svgSize || availableSize.width <= 0 || availableSize.height <= 0) {
    return DEFAULT_ZOOM;
  }

  const heightFitZoom = (availableSize.height * svgSize.width) / (availableSize.width * svgSize.height);
  return normalizeMermaidZoom(Math.min(DEFAULT_ZOOM, heightFitZoom));
}

function getMermaidSvgSize(svg: SVGElement): SvgSize | null {
  return getMermaidSvgViewBoxSize(svg) ?? getMermaidSvgAttributeSize(svg);
}

function getMermaidSvgViewBoxSize(svg: SVGElement): SvgSize | null {
  const viewBox = svg.getAttribute('viewBox')?.trim();
  if (!viewBox) {
    return null;
  }

  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  return createMermaidSvgSize(width, height);
}

function getMermaidSvgAttributeSize(svg: SVGElement): SvgSize | null {
  const width = Number.parseFloat(svg.getAttribute('width') ?? '');
  const height = Number.parseFloat(svg.getAttribute('height') ?? '');
  return createMermaidSvgSize(width, height);
}

function createMermaidSvgSize(width: number, height: number): SvgSize | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
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
  const diagramClone = diagram.cloneNode(true) as HTMLElement;
  const overlayWrapper = document.createElement('div');
  overlayWrapper.className = WRAPPER_CLASS;
  const overlayActions = document.createElement('div');
  overlayActions.className = ACTIONS_CLASS;
  overlayActions.append(createMermaidZoomControls(overlayWrapper, diagramClone));
  overlayWrapper.append(diagramClone, overlayActions);
  body.append(overlayWrapper);

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
  setMermaidZoom(overlayWrapper, diagramClone, getInitialMermaidZoom(diagramClone));
  setMermaidPan(overlayWrapper, diagramClone, 0, 0);
  installMermaidPan(overlayWrapper, diagramClone);
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
