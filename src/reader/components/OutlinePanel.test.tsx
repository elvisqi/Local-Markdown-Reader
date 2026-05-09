import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OutlinePanel } from './OutlinePanel';
import type { OutlineItem } from '../../shared/types';

describe('OutlinePanel', () => {
  it('renders nested headings and emits navigation events', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
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

    render(<OutlinePanel outline={outline} onNavigate={onNavigate} />);

    expect(screen.getByRole('button', { name: 'Intro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Install' }));

    expect(onNavigate).toHaveBeenCalledWith('install');
  });
});
