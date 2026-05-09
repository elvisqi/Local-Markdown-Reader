import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReaderToolbar } from './ReaderToolbar';

describe('ReaderToolbar', () => {
  it('renders a reading style selector and emits style changes', async () => {
    const user = userEvent.setup();
    const onStyleChange = vi.fn();

    render(
      <ReaderToolbar
        title="Document"
        theme="system"
        width="comfortable"
        style="paper"
        rawMode={false}
        onOpenFolder={vi.fn()}
        onToggleDrawer={vi.fn()}
        onThemeChange={vi.fn()}
        onWidthChange={vi.fn()}
        onStyleChange={onStyleChange}
        onRawModeChange={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('样式'), 'github');

    expect(screen.getByRole('button', { name: '文件' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开文件夹' })).toBeInTheDocument();
    expect(screen.getByLabelText('主题')).toBeInTheDocument();
    expect(screen.getByLabelText('宽度')).toBeInTheDocument();
    expect(screen.getByLabelText('原文')).toBeInTheDocument();
    expect(onStyleChange).toHaveBeenCalledWith('github');
  });
});
