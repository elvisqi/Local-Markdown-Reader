import { openReaderPage } from '../shared/extension';
import { saveTemporaryMarkdownDocument } from '../shared/temporaryDocument';

vi.mock('../shared/extension', () => ({
  openReaderPage: vi.fn(async () => undefined),
}));

vi.mock('../shared/temporaryDocument', async () => {
  const actual = await vi.importActual<typeof import('../shared/temporaryDocument')>('../shared/temporaryDocument');

  return {
    ...actual,
    saveTemporaryMarkdownDocument: vi.fn(async () => 'temp-1'),
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
      onInstalled: {
        addListener: vi.fn(),
      },
    },
    action: {
      setBadgeText: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('background reader opening', () => {
  it('uses markdown source from the content page without fetching file URLs again', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { openReaderFromMessage } = await import('./index');

    await openReaderFromMessage({
      type: 'openReader',
      sourceUrl: 'file:///Users/qiyu/Desktop/temporary.md',
      source: '# Temporary',
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(saveTemporaryMarkdownDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///Users/qiyu/Desktop/temporary.md',
        name: 'temporary.md',
        source: '# Temporary',
      }),
    );
    expect(openReaderPage).toHaveBeenCalledWith('temp-1');
  });
});
