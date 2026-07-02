import { installTableFullscreen } from './tableFullscreen';

describe('installTableFullscreen', () => {
  it('adds an outside fullscreen button to each table and opens a full-viewport overlay', async () => {
    document.body.innerHTML = `
      <div id="root" class="reader-app theme-dark style-paper width-wide">
        <table><tbody><tr><td colspan="2">Wide value</td></tr></tbody></table>
        <table><tbody><tr><td>Second value</td><td>Second note</td></tr></tbody></table>
      </div>
    `;
    const root = document.getElementById('root')!;

    const cleanup = installTableFullscreen(root);
    const buttons = root.querySelectorAll<HTMLButtonElement>('.table-fullscreen__trigger');
    const wrappers = root.querySelectorAll<HTMLElement>('.table-fullscreen');

    expect(buttons).toHaveLength(2);
    expect(wrappers[0]).not.toHaveClass('is-overflowing');
    expect(wrappers[1]).not.toHaveClass('is-overflowing');
    expect(buttons[0]).toHaveAttribute('aria-label', '最大化表格');
    expect(buttons[0].textContent).toBe('');
    expect(root.querySelectorAll('.table-fullscreen__table')).toHaveLength(2);
    expect(buttons[0].closest('.table-fullscreen')?.querySelector('.table-fullscreen__table table')).not.toBeNull();
    const firstActions = buttons[0].closest('.table-fullscreen__actions');
    const firstWrapper = wrappers[0];
    const firstRowCount = firstWrapper.querySelector<HTMLElement>('.table-fullscreen__row-count');
    expect(firstActions).not.toBeNull();
    expect(firstWrapper.firstElementChild).toBe(firstRowCount);
    expect(firstActions?.querySelector('.table-fullscreen__row-count')).toBeNull();
    const firstStats = firstRowCount?.querySelectorAll('.table-fullscreen__stat-line');
    expect(firstStats?.[0]).toHaveTextContent('1 行');
    expect(firstStats?.[1]).toHaveTextContent('2 列');
    expect(firstRowCount).toHaveAttribute('title', '表格共有 1 行，2 列');
    expect(firstStats).toHaveLength(2);
    expect(firstActions?.firstElementChild).toBe(buttons[0]);

    buttons[1].click();

    const dialog = document.querySelector<HTMLElement>('.table-fullscreen__overlay');
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveClass('reader-app');
    expect(dialog).toHaveClass('theme-dark');
    expect(dialog).toHaveClass('style-paper');
    expect(dialog).toHaveClass('width-wide');
    expect(dialog).toHaveTextContent('表格（1 行 · 2 列）');
    expect(dialog).toHaveTextContent('Second value');
    expect(dialog).toHaveTextContent('Second note');
    expect(dialog).not.toHaveTextContent('Wide value');

    document.querySelector<HTMLButtonElement>('.table-fullscreen__close')!.click();

    expect(document.querySelector('.table-fullscreen__overlay')).toBeNull();

    cleanup();

    expect(root.querySelector('.table-fullscreen__trigger')).toBeNull();
  });

  it('closes the overlay with Escape', () => {
    document.body.innerHTML = '<div id="root"><table><tbody><tr><td>Cell</td></tr></tbody></table></div>';
    const root = document.getElementById('root')!;

    installTableFullscreen(root);
    root.querySelector<HTMLButtonElement>('.table-fullscreen__trigger')!.click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.querySelector('.table-fullscreen__overlay')).toBeNull();
  });

  it('marks horizontally overflowing tables with edge scroll hints', () => {
    document.body.innerHTML = '<div id="root"><table><tbody><tr><td>Wide value</td></tr></tbody></table></div>';
    const root = document.getElementById('root')!;

    const cleanup = installTableFullscreen(root);
    const wrapper = root.querySelector<HTMLElement>('.table-fullscreen')!;
    const tableRegion = root.querySelector<HTMLElement>('.table-fullscreen__table')!;
    let scrollLeft = 0;

    Object.defineProperty(tableRegion, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(tableRegion, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(tableRegion, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = value;
      },
      configurable: true,
    });

    tableRegion.dispatchEvent(new Event('scroll'));

    expect(wrapper).toHaveClass('is-overflowing');
    expect(wrapper).toHaveClass('can-scroll-right');
    expect(wrapper).not.toHaveClass('can-scroll-left');

    scrollLeft = 120;
    tableRegion.dispatchEvent(new Event('scroll'));

    expect(wrapper).toHaveClass('can-scroll-left');
    expect(wrapper).toHaveClass('can-scroll-right');

    scrollLeft = 200;
    tableRegion.dispatchEvent(new Event('scroll'));

    expect(wrapper).toHaveClass('can-scroll-left');
    expect(wrapper).not.toHaveClass('can-scroll-right');

    cleanup();
  });

  it('adds edge scroll hints to pre-wrapped markdown tables', () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="table-fullscreen">
          <div class="table-fullscreen__table">
            <table><tbody><tr><td>Wide value</td><td>Wide note</td></tr></tbody></table>
          </div>
          <div class="table-fullscreen__actions">
            <button type="button" class="table-fullscreen__trigger" aria-label="最大化表格"></button>
          </div>
        </div>
      </div>
    `;
    const root = document.getElementById('root')!;

    const cleanup = installTableFullscreen(root);
    const wrapper = root.querySelector<HTMLElement>('.table-fullscreen')!;
    const tableRegion = root.querySelector<HTMLElement>('.table-fullscreen__table')!;
    const actions = root.querySelector<HTMLElement>('.table-fullscreen__actions')!;
    const rowCount = wrapper.querySelector<HTMLElement>('.table-fullscreen__row-count');

    expect(wrapper.firstElementChild).toBe(rowCount);
    expect(actions.querySelector('.table-fullscreen__row-count')).toBeNull();
    const stats = rowCount?.querySelectorAll('.table-fullscreen__stat-line');
    expect(stats?.[0]).toHaveTextContent('1 行');
    expect(stats?.[1]).toHaveTextContent('2 列');
    expect(rowCount).toHaveAttribute('title', '表格共有 1 行，2 列');
    expect(stats).toHaveLength(2);
    expect(actions.firstElementChild).toHaveClass('table-fullscreen__trigger');

    Object.defineProperty(tableRegion, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(tableRegion, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(tableRegion, 'scrollLeft', { value: 0, configurable: true });

    tableRegion.dispatchEvent(new Event('scroll'));

    expect(wrapper).toHaveClass('is-overflowing');
    expect(wrapper).toHaveClass('can-scroll-right');

    cleanup();
  });

  it('updates existing table action stats to include column counts', () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="table-fullscreen">
          <div class="table-fullscreen__table">
            <table><tbody><tr><td>Value</td><td>Note</td></tr></tbody></table>
          </div>
          <div class="table-fullscreen__actions">
            <span class="table-fullscreen__row-count" title="表格共有 1 行">1 行</span>
            <button type="button" class="table-fullscreen__trigger" aria-label="最大化表格"></button>
          </div>
        </div>
      </div>
    `;
    const root = document.getElementById('root')!;

    const cleanup = installTableFullscreen(root);
    const wrapper = root.querySelector<HTMLElement>('.table-fullscreen')!;
    const actions = root.querySelector<HTMLElement>('.table-fullscreen__actions')!;
    const rowCount = root.querySelector<HTMLElement>('.table-fullscreen__row-count');

    expect(wrapper.firstElementChild).toBe(rowCount);
    expect(actions.querySelector('.table-fullscreen__row-count')).toBeNull();
    const stats = rowCount?.querySelectorAll('.table-fullscreen__stat-line');
    expect(stats?.[0]).toHaveTextContent('1 行');
    expect(stats?.[1]).toHaveTextContent('2 列');
    expect(rowCount).toHaveAttribute('title', '表格共有 1 行，2 列');
    expect(stats).toHaveLength(2);

    cleanup();
  });
});
