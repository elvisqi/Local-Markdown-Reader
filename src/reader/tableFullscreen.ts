const WRAPPER_CLASS = 'table-fullscreen';
const TRIGGER_CLASS = 'table-fullscreen__trigger';
const OVERLAY_CLASS = 'table-fullscreen__overlay';
const ACTIONS_CLASS = 'table-fullscreen__actions';
const TABLE_REGION_CLASS = 'table-fullscreen__table';

export function installTableFullscreen(root: ParentNode): () => void {
  const cleanups: Array<() => void> = wrapBareTables(root);

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const trigger = target.closest<HTMLButtonElement>(`.${TRIGGER_CLASS}`);
    if (!trigger || !containsNode(root, trigger)) {
      return;
    }

    const table = trigger.closest(`.${WRAPPER_CLASS}`)?.querySelector<HTMLTableElement>('table');
    if (!table) {
      return;
    }

    event.preventDefault();
    openTableOverlay(table);
  };

  root.addEventListener('click', handleClick);
  cleanups.push(() => root.removeEventListener('click', handleClick));

  return () => {
    closeTableOverlay();
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

function wrapBareTables(root: ParentNode): Array<() => void> {
  const cleanups: Array<() => void> = [];

  for (const table of Array.from(root.querySelectorAll<HTMLTableElement>('table'))) {
    if (table.closest(`.${WRAPPER_CLASS}`)) {
      continue;
    }

    const wrapper = document.createElement('div');
    wrapper.className = WRAPPER_CLASS;
    const tableRegion = document.createElement('div');
    tableRegion.className = TABLE_REGION_CLASS;

    table.before(wrapper);
    wrapper.append(tableRegion);
    tableRegion.append(table);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = TRIGGER_CLASS;
    trigger.setAttribute('aria-label', '最大化表格');
    trigger.title = '最大化表格';

    const actions = document.createElement('div');
    actions.className = ACTIONS_CLASS;
    actions.append(trigger);
    wrapper.append(actions);

    cleanups.push(() => {
      wrapper.before(table);
      wrapper.remove();
    });
  }

  return cleanups;
}

function openTableOverlay(table: HTMLTableElement) {
  closeTableOverlay();

  const overlay = document.createElement('div');
  const readerAppClasses = Array.from(table.closest<HTMLElement>('.reader-app')?.classList ?? ['reader-app']);
  overlay.className = [OVERLAY_CLASS, ...readerAppClasses].join(' ');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '最大化表格');

  const panel = document.createElement('div');
  panel.className = 'table-fullscreen__panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'table-fullscreen__toolbar';

  const title = document.createElement('span');
  title.textContent = '表格';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'table-fullscreen__close';
  closeButton.textContent = '关闭';

  const body = document.createElement('div');
  body.className = 'table-fullscreen__body';
  body.append(table.cloneNode(true));

  const close = () => closeTableOverlay();
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

  overlay.addEventListener('table-fullscreen-close', () => {
    closeButton.removeEventListener('click', close);
    document.removeEventListener('keydown', handleKeydown);
  });

  toolbar.append(title, closeButton);
  panel.append(toolbar, body);
  overlay.append(panel);
  document.body.append(overlay);
  closeButton.focus();
}

function closeTableOverlay() {
  const overlay = document.querySelector<HTMLElement>(`.${OVERLAY_CLASS}`);
  if (!overlay) {
    return;
  }

  overlay.dispatchEvent(new Event('table-fullscreen-close'));
  overlay.remove();
}

function containsNode(root: ParentNode, node: Node): boolean {
  return root instanceof Node && root.contains(node);
}
