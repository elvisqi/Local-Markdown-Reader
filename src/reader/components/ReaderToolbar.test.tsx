import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReaderToolbar } from './ReaderToolbar';

describe('ReaderToolbar', () => {
  it('keeps persistent settings out of the reader toolbar', async () => {
    const user = userEvent.setup();
    const onRawModeChange = vi.fn();

    render(
      <ReaderToolbar
        title="Document"
        rawMode={false}
        onToggleDrawer={vi.fn()}
        onRawModeChange={onRawModeChange}
      />,
    );

    expect(screen.getByRole('button', { name: '文件' })).toBeInTheDocument();
    expect(screen.getByLabelText('原文')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开文件夹' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('主题')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('宽度')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('样式')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('原文'));

    expect(onRawModeChange).toHaveBeenCalledWith(true);
  });
});
