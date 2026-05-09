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
    expect(buttons[0].closest('.table-fullscreen__actions')).not.toBeNull();

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
});
