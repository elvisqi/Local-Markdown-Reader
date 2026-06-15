import { installTableFullscreen } from './tableFullscreen';

describe('installTableFullscreen', () => {
  it('adds an outside fullscreen button to each table and opens a full-viewport overlay', async () => {
    document.body.innerHTML = `
      <div id="root" class="reader-app theme-dark style-paper width-wide">
        <table><tbody><tr><td>Wide value</td></tr></tbody></table>
        <table><tbody><tr><td>Second value</td></tr></tbody></table>
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
    expect(firstActions).not.toBeNull();
    expect(firstActions?.querySelector('.table-fullscreen__row-count')).toHaveTextContent('1 行');
    expect(firstActions?.firstElementChild).toHaveClass('table-fullscreen__row-count');

    buttons[1].click();

    const dialog = document.querySelector<HTMLElement>('.table-fullscreen__overlay');
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveClass('reader-app');
    expect(dialog).toHaveClass('theme-dark');
    expect(dialog).toHaveClass('style-paper');
    expect(dialog).toHaveClass('width-wide');
    expect(dialog).toHaveTextContent('Second value');
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
            <table><tbody><tr><td>Wide value</td></tr></tbody></table>
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

    Object.defineProperty(tableRegion, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(tableRegion, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(tableRegion, 'scrollLeft', { value: 0, configurable: true });

    tableRegion.dispatchEvent(new Event('scroll'));

    expect(wrapper).toHaveClass('is-overflowing');
    expect(wrapper).toHaveClass('can-scroll-right');

    cleanup();
  });
});
