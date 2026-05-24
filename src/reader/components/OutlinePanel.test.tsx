import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OutlinePanel } from './OutlinePanel';
import type { OutlineItem } from '../../shared/types';

describe('OutlinePanel', () => {
  it('renders nested headings and emits navigation events', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onResizeStart = vi.fn();
    const onResizeKeyDown = vi.fn();
    const outline: OutlineItem[] = [
      {
        id: 'intro',
        text: 'Intro',
        depth: 1,
        children: [
          {
            id: 'install',
            text: 'Install',
            depth: 2,
            children: [],
          },
        ],
      },
    ];

    render(
      <OutlinePanel
        outline={outline}
        activeId="install"
        onNavigate={onNavigate}
        resizeValue={260}
        resizeMin={100}
        resizeMax={420}
        onResizeStart={onResizeStart}
        onResizeKeyDown={onResizeKeyDown}
      />,
    );

    expect(screen.getByRole('button', { name: 'Intro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByText('文档大纲')).toBeInTheDocument();
    expect(screen.getByText('文档大纲').parentElement).toHaveClass('outline-panel__scroll');
    expect(screen.getByRole('separator', { name: '调整文档大纲宽度' })).toHaveAttribute('aria-valuenow', '260');
    expect(screen.getByRole('separator', { name: '调整文档大纲宽度' })).toHaveAttribute('aria-valuemin', '100');
    expect(screen.getByRole('separator', { name: '调整文档大纲宽度' })).toHaveAttribute('aria-valuemax', '420');

    await user.click(screen.getByRole('button', { name: 'Install' }));

    expect(onNavigate).toHaveBeenCalledWith('install');
  });

  it('does not render a resize separator when resize handlers are omitted', () => {
    render(<OutlinePanel outline={[]} onNavigate={vi.fn()} />);

    expect(screen.queryByRole('separator', { name: '调整文档大纲宽度' })).not.toBeInTheDocument();
    expect(screen.getByText('当前文档没有标题。')).toBeInTheDocument();
  });
});
