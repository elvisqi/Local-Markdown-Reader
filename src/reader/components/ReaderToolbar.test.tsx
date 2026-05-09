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
        style="clean"
        rawMode={false}
        onOpenFolder={vi.fn()}
        onToggleDrawer={vi.fn()}
        onThemeChange={vi.fn()}
        onWidthChange={vi.fn()}
        onStyleChange={onStyleChange}
        onRawModeChange={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Style'), 'paper');

    expect(onStyleChange).toHaveBeenCalledWith('paper');
  });
});
