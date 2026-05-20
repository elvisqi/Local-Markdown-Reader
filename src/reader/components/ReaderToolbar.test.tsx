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
        onReload={vi.fn()}
        previousFile={null}
        nextFile={null}
        onOpenPrevious={vi.fn()}
        onOpenNext={vi.fn()}
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

  it('emits reload actions from the toolbar', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();

    render(
      <ReaderToolbar
        title="Document"
        rawMode={false}
        onToggleDrawer={vi.fn()}
        onReload={onReload}
        previousFile={null}
        nextFile={null}
        onOpenPrevious={vi.fn()}
        onOpenNext={vi.fn()}
        onRawModeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '重载' }));

    expect(onReload).toHaveBeenCalledOnce();
  });

  it('shows sibling file navigation with target filenames in tooltips', async () => {
    const user = userEvent.setup();
    const onOpenPrevious = vi.fn();
    const onOpenNext = vi.fn();

    render(
      <ReaderToolbar
        title="Document"
        rawMode={false}
        onToggleDrawer={vi.fn()}
        onReload={vi.fn()}
        previousFile={{ name: '01-intro.md', path: 'docs/01-intro.md' }}
        nextFile={{ name: '03-api.md', path: 'docs/03-api.md' }}
        onOpenPrevious={onOpenPrevious}
        onOpenNext={onOpenNext}
        onRawModeChange={vi.fn()}
      />,
    );

    const previousButton = screen.getByRole('button', { name: '上一个' });
    const nextButton = screen.getByRole('button', { name: '下一个' });

    expect(previousButton).toHaveAttribute('title', '上一个文件：01-intro.md');
    expect(nextButton).toHaveAttribute('title', '下一个文件：03-api.md');

    await user.click(previousButton);
    await user.click(nextButton);

    expect(onOpenPrevious).toHaveBeenCalledOnce();
    expect(onOpenNext).toHaveBeenCalledOnce();
  });

  it('disables sibling navigation at folder boundaries with explanatory tooltips', () => {
    render(
      <ReaderToolbar
        title="Document"
        rawMode={false}
        onToggleDrawer={vi.fn()}
        onReload={vi.fn()}
        previousFile={null}
        nextFile={null}
        onOpenPrevious={vi.fn()}
        onOpenNext={vi.fn()}
        onRawModeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '上一个' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '上一个' })).toHaveAttribute(
      'title',
      '当前已经是本文件夹第一个文档文件',
    );
    expect(screen.getByRole('button', { name: '下一个' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一个' })).toHaveAttribute(
      'title',
      '当前已经是本文件夹最后一个文档文件',
    );
  });
});
