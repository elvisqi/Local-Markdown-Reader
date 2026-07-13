import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DocumentTabs } from './DocumentTabs';

describe('DocumentTabs', () => {
  it('renders no tab strip without documents', () => {
    const { container } = render(
      <DocumentTabs tabs={[]} activeTabId={null} onSelect={vi.fn()} onClose={vi.fn()} onPin={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('selects and closes tabs through accessible controls', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const onPin = vi.fn();

    render(
      <DocumentTabs
        tabs={[
          { id: 'readme', label: 'README.md', path: 'README.md', isPinned: true },
          { id: 'guide', label: 'guide.md', path: 'docs/guide.md', isPinned: false },
        ]}
        activeTabId="readme"
        onSelect={onSelect}
        onClose={onClose}
        onPin={onPin}
      />,
    );

    expect(screen.getByRole('tab', { name: '切换到 README.md' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '切换到 docs/guide.md' })).toHaveAttribute('aria-selected', 'false');

    await user.click(screen.getByRole('tab', { name: '切换到 docs/guide.md' }));
    await user.click(screen.getByRole('button', { name: '关闭 docs/guide.md' }));

    expect(onSelect).toHaveBeenCalledWith('guide');
    expect(onClose).toHaveBeenCalledWith('guide');
    expect(screen.getByRole('tab', { name: '切换到 docs/guide.md' }).parentElement).toHaveAttribute('data-pinned', 'false');
  });

  it('pins a preview tab when its label is double-clicked', async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();

    render(
      <DocumentTabs
        tabs={[{ id: 'guide', label: 'guide.md', path: 'docs/guide.md', isPinned: false }]}
        activeTabId="guide"
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onPin={onPin}
      />,
    );

    await user.dblClick(screen.getByRole('tab', { name: '切换到 docs/guide.md' }));

    expect(onPin).toHaveBeenCalledWith('guide');
  });
});
