import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';
import * as recentDocument from '../reader/recentDocument';

vi.mock('../reader/recentDocument', () => ({
  clearLastDocument: vi.fn(async () => undefined),
  loadLastDocument: vi.fn(async () => null),
}));

describe('popup App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(async () => undefined),
      },
      storage: {
        sync: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
          onChanged: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          },
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows and clears the last opened document', async () => {
    const user = userEvent.setup();
    vi.mocked(recentDocument.loadLastDocument).mockResolvedValue({
      directoryHandle: { kind: 'directory', name: 'Docs' } as FileSystemDirectoryHandle,
      directoryName: 'Docs',
      path: 'huge/财务管理-事实抽取清单.md',
      updatedAt: 123,
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText('Docs/huge/财务管理-事实抽取清单.md')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '清空上次打开' }));

    expect(recentDocument.clearLastDocument).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('未记录')).toBeInTheDocument());
  });
});
