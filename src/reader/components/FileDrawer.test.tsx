import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileDrawer } from './FileDrawer';

describe('FileDrawer', () => {
  it('offers folder opening from the file drawer', async () => {
    const user = userEvent.setup();
    const onOpenFolder = vi.fn();

    render(
      <FileDrawer
        open
        tree={[]}
        activePath={null}
        onOpenFolder={onOpenFolder}
        onReloadFolder={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '打开文件夹' }));

    expect(onOpenFolder).toHaveBeenCalledOnce();
  });

  it('offers folder reloading from the file drawer', async () => {
    const user = userEvent.setup();
    const onReloadFolder = vi.fn();

    render(
      <FileDrawer
        open
        tree={[]}
        activePath={null}
        onOpenFolder={vi.fn()}
        onReloadFolder={onReloadFolder}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '重载目录' }));

    expect(onReloadFolder).toHaveBeenCalledOnce();
  });
});
