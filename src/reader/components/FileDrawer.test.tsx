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
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '打开文件夹' }));

    expect(onOpenFolder).toHaveBeenCalledOnce();
  });
});
