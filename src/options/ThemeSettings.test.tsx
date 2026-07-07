import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  InstalledThemePackageList,
  PendingThemePackagePreview,
  ReadingSettingsForm,
  ThemePreview,
  ThemeLibraryList,
  ThemePackageImportControls,
} from './ThemeSettingsSections';
import {
  inkFocusTheme,
  installedPaperTheme,
  nightStudyTheme,
} from './testThemeFixtures';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { ReaderSettings, RemoteThemeIndex } from '../shared/types';

describe('ThemeSettings sections', () => {
  it('renders theme package import controls and forwards selected files', async () => {
    const user = userEvent.setup();
    const onThemePackageFile = vi.fn(async (_file: File | undefined) => undefined);
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    const themeFile = new File(['{}'], 'paper-pro.mdv-theme.json', { type: 'application/json' });

    render(<ThemePackageImportControls onThemePackageFile={onThemePackageFile} />);

    await user.click(screen.getByRole('button', { name: '选择主题包' }));
    expect(inputClick).toHaveBeenCalled();

    const input = screen.getByLabelText('选择主题包文件') as HTMLInputElement;
    inputClick.mockRestore();
    await user.upload(input, themeFile);

    expect(onThemePackageFile).toHaveBeenCalledWith(themeFile);
    expect(input.value).toBe('');
  });

  it('renders reading controls and forwards reading preference changes', async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn(async (_settings: ReaderSettings) => undefined);

    render(
      <ReadingSettingsForm
        settings={DEFAULT_SETTINGS}
        installedThemes={[installedPaperTheme]}
        onSettingsChange={onSettingsChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText('颜色模式'), 'dark');
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reading: expect.objectContaining({
          colorMode: 'dark',
        }),
      }),
    );

    await user.selectOptions(screen.getByLabelText('阅读宽度'), 'wide');
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reading: expect.objectContaining({
          width: 'wide',
        }),
      }),
    );

    await user.selectOptions(screen.getByLabelText('阅读主题'), 'installed:paper-pro');
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reading: expect.objectContaining({
          themeId: 'installed:paper-pro',
        }),
      }),
    );

    await user.selectOptions(screen.getByLabelText('弹窗颜色模式'), 'light');
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ui: expect.objectContaining({
          popupColorMode: 'light',
        }),
      }),
    );
  });

  it('renders a rich theme preview sample for visible theme personality checks', () => {
    render(<ThemePreview settings={DEFAULT_SETTINGS} installedTheme={installedPaperTheme} />);

    const preview = screen.getByLabelText('阅读主题预览');

    expect(within(preview).getByRole('heading', { name: '主题预览', level: 1 })).toBeInTheDocument();
    expect(preview.querySelector('.markdown-heading--h2')).not.toBeNull();
    expect(preview.querySelector('.markdown-heading--h3')).not.toBeNull();
    expect(preview.querySelector('.markdown-heading--h4')).not.toBeNull();
    expect(preview.querySelector('.callout-info')).not.toBeNull();
    expect(preview.querySelector('.callout-warning')).not.toBeNull();
    expect(preview.querySelector('.callout-success')).not.toBeNull();
    expect(preview.querySelector('.markdown-tag[data-tag="theme"]')).not.toBeNull();
    expect(preview.querySelector('.markdown-code-block .line')).not.toBeNull();
    expect(preview.querySelector('.markdown-code-block .token.keyword')).not.toBeNull();
    expect(preview.querySelector('.markdown-code-block .token.string')).not.toBeNull();
    expect(preview.querySelectorAll('.markdown-table-body .markdown-table-row')).toHaveLength(3);
    expect(preview.querySelector('.markdown-image')).not.toBeNull();
    expect(preview.querySelector('.mermaid')).not.toBeNull();
    expect(preview.querySelector('.markdown-rule')).not.toBeNull();
  });

  it('merges bundled and remote themes into one preview library', async () => {
    const user = userEvent.setup();
    const previewTheme = vi.fn();
    const installTheme = vi.fn();
    const refreshRemoteThemes = vi.fn(async () => undefined);
    const previewRemoteTheme = vi.fn(async () => undefined);
    const installRemoteTheme = vi.fn(async () => undefined);
    const remoteIndex = createRemoteThemeIndex();
    remoteIndex.themes[1] = {
      ...remoteIndex.themes[1],
      previewUrl: 'https://example.com/previews/night-study.svg',
    };

    render(
      <ThemeLibraryList
        settings={DEFAULT_SETTINGS}
        bundledThemes={[inkFocusTheme]}
        index={remoteIndex}
        installedThemes={[inkFocusTheme, { ...nightStudyTheme, version: '0.9.0' }]}
        hiddenRemoteThemeIds={['ink-focus']}
        onRefresh={refreshRemoteThemes}
        onPreviewBundled={previewTheme}
        onInstallBundled={installTheme}
        onPreviewRemote={previewRemoteTheme}
        onInstallRemote={installRemoteTheme}
      />,
    );

    await user.click(screen.getByRole('button', { name: '刷新远程主题' }));
    expect(refreshRemoteThemes).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole('list', { name: '推荐主题' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '远程主题' })).not.toBeInTheDocument();

    const themeLibrary = screen.getByRole('list', { name: '主题库' });
    const inkFocusRow = within(themeLibrary).getByText('Ink Focus').closest('li')!;
    const nightStudyRow = within(themeLibrary).getByText('Night Study').closest('li')!;
    const futureRow = within(themeLibrary).getByText('Future Theme').closest('li')!;

    expect(within(inkFocusRow).getByRole('button', { name: '已安装' })).toBeDisabled();
    expect(within(inkFocusRow).getByText('已安装', { selector: '.theme-package-state' })).toBeInTheDocument();
    expect(within(inkFocusRow).getByText('内置', { selector: '.theme-package-source' })).toBeInTheDocument();
    expect(within(inkFocusRow).getByLabelText('Ink Focus 预览')).toBeInTheDocument();
    expect(within(nightStudyRow).getByRole('button', { name: '更新' })).toBeEnabled();
    expect(within(nightStudyRow).getByText('已安装旧版', { selector: '.theme-package-state' })).toBeInTheDocument();
    expect(within(nightStudyRow).getByText('在线', { selector: '.theme-package-source' })).toBeInTheDocument();
    expect(within(nightStudyRow).getByRole('img', { name: 'Night Study 预览图' })).toHaveAttribute(
      'src',
      'https://example.com/previews/night-study.svg',
    );
    expect(within(futureRow).getByRole('button', { name: '不兼容' })).toBeDisabled();

    await user.click(within(inkFocusRow).getByRole('button', { name: '预览' }));
    await user.click(within(nightStudyRow).getByRole('button', { name: '预览' }));
    await user.click(within(nightStudyRow).getByRole('button', { name: '更新' }));

    expect(previewTheme).toHaveBeenCalledWith(inkFocusTheme);
    expect(previewRemoteTheme).toHaveBeenCalledWith(remoteIndex.themes[1]);
    expect(installRemoteTheme).toHaveBeenCalledWith(remoteIndex.themes[1]);
    expect(installTheme).not.toHaveBeenCalled();
  });

  it('renders installed theme package previews and actions with the active theme disabled', async () => {
    const user = userEvent.setup();
    const previewTheme = vi.fn();
    const applyTheme = vi.fn();
    const exportTheme = vi.fn();
    const removeTheme = vi.fn();

    render(
      <InstalledThemePackageList
        settings={DEFAULT_SETTINGS}
        installedThemes={[
          {
            ...installedPaperTheme,
            css: '.markdown-heading { color: red; }\n.markdown-table { border-collapse: collapse; }',
          },
          nightStudyTheme,
        ]}
        activeThemeId="installed:paper-pro"
        onPreview={previewTheme}
        onApply={applyTheme}
        onExport={exportTheme}
        onRemove={removeTheme}
      />,
    );

    const installedList = screen.getByRole('list', { name: '已安装主题' });
    const paperRow = within(installedList).getByText('Paper Pro · 使用中').closest('li')!;
    const nightRow = within(installedList).getByText('Night Study').closest('li')!;
    const installedPreviews = within(installedList).getAllByLabelText(/预览$/);

    expect(within(paperRow).getByRole('button', { name: '预览' })).toBeInTheDocument();
    expect(within(paperRow).getByRole('button', { name: '应用' })).toBeDisabled();
    expect(installedPreviews).toHaveLength(2);
    expect(within(paperRow).getByLabelText('Paper Pro 预览').closest('.theme-preview')).toHaveAttribute(
      'data-reader-theme-id',
      'installed:paper-pro',
    );
    expect(within(paperRow).getByText('CSS 80 B')).toBeInTheDocument();
    expect(within(paperRow).getByText('2 条规则')).toBeInTheDocument();
    expect(within(paperRow).getByText(/^指纹 [a-f0-9]{8}$/)).toBeInTheDocument();
    expect(within(nightRow).getByLabelText('Night Study 预览').closest('.theme-preview')).toHaveAttribute(
      'data-reader-theme-id',
      'installed:night-study',
    );

    await user.click(within(nightRow).getByRole('button', { name: '预览' }));
    await user.click(within(nightRow).getByRole('button', { name: '应用' }));
    await user.click(within(nightRow).getByRole('button', { name: '导出' }));
    await user.click(within(nightRow).getByRole('button', { name: '删除' }));

    expect(previewTheme).toHaveBeenCalledWith(nightStudyTheme);
    expect(applyTheme).toHaveBeenCalledWith(nightStudyTheme);
    expect(exportTheme).toHaveBeenCalledWith(nightStudyTheme);
    expect(removeTheme).toHaveBeenCalledWith(nightStudyTheme);
  });

  it('renders a pending theme preview and uses update wording when replacing a theme', async () => {
    const user = userEvent.setup();
    const confirmTheme = vi.fn();
    const cancelTheme = vi.fn();

    render(
      <PendingThemePackagePreview
        settings={DEFAULT_SETTINGS}
        theme={{ ...installedPaperTheme, version: '1.1.0' }}
        existingTheme={installedPaperTheme}
        onConfirm={confirmTheme}
        onCancel={cancelTheme}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Paper Pro 主题预览' });
    expect(within(dialog).getByRole('heading', { name: 'Paper Pro 主题预览' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '确认更新' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '关闭' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('阅读主题预览').closest('.theme-preview')).toHaveAttribute(
      'data-reader-theme-id',
      'installed:paper-pro',
    );

    await user.click(within(dialog).getByRole('button', { name: '确认更新' }));
    await user.click(within(dialog).getByRole('button', { name: '关闭' }));

    expect(confirmTheme).toHaveBeenCalledTimes(1);
    expect(cancelTheme).toHaveBeenCalledTimes(1);
  });
});

function createRemoteThemeIndex(): RemoteThemeIndex {
  return {
    sourceUrl: 'https://example.com/themes/index.json',
    fetchedAt: 123,
    version: 1,
    updatedAt: '2026-07-06T00:00:00.000Z',
    themes: [
      {
        id: 'ink-focus',
        name: 'Ink Focus',
        version: '1.0.0',
        colorScheme: 'light',
        compatible: true,
        downloadUrl: 'https://example.com/themes/ink-focus.mdv-theme.json',
        sha256: 'a'.repeat(64),
        tags: ['light'],
      },
      {
        id: 'night-study',
        name: 'Night Study',
        version: '1.0.0',
        colorScheme: 'dark',
        compatible: true,
        downloadUrl: 'https://example.com/themes/night-study.mdv-theme.json',
        sha256: 'b'.repeat(64),
        tags: ['dark'],
      },
      {
        id: 'future-theme',
        name: 'Future Theme',
        version: '1.0.0',
        colorScheme: 'system',
        compatible: false,
        minAppVersion: '9.0.0',
        downloadUrl: 'https://example.com/themes/future-theme.mdv-theme.json',
        sha256: 'c'.repeat(64),
        tags: [],
      },
    ],
  };
}
