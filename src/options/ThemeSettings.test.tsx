import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  InstalledThemePackageList,
  PendingThemePackagePreview,
  ReadingSettingsForm,
  RemoteThemeList,
  ThemeCatalogList,
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

  it('renders recommended theme install states and forwards catalog actions', async () => {
    const user = userEvent.setup();
    const previewTheme = vi.fn();
    const installTheme = vi.fn();

    render(
      <ThemeCatalogList
        themes={[inkFocusTheme, nightStudyTheme]}
        installedThemes={[inkFocusTheme, { ...nightStudyTheme, version: '0.9.0' }]}
        onPreview={previewTheme}
        onInstall={installTheme}
      />,
    );

    const catalog = screen.getByRole('list', { name: '推荐主题' });
    const inkFocusRow = within(catalog).getByText('Ink Focus').closest('li')!;
    const nightStudyRow = within(catalog).getByText('Night Study').closest('li')!;

    expect(within(inkFocusRow).getByRole('button', { name: '已安装' })).toBeDisabled();
    expect(within(nightStudyRow).getByRole('button', { name: '更新' })).toBeEnabled();

    await user.click(within(nightStudyRow).getByRole('button', { name: '预览' }));
    await user.click(within(nightStudyRow).getByRole('button', { name: '更新' }));

    expect(previewTheme).toHaveBeenCalledWith(nightStudyTheme);
    expect(installTheme).toHaveBeenCalledWith(nightStudyTheme);
  });

  it('renders remote theme install states and forwards refresh and install actions', async () => {
    const user = userEvent.setup();
    const refreshRemoteThemes = vi.fn(async () => undefined);
    const previewRemoteTheme = vi.fn(async () => undefined);
    const installRemoteTheme = vi.fn(async () => undefined);
    const remoteIndex = createRemoteThemeIndex();

    render(
      <RemoteThemeList
        index={remoteIndex}
        installedThemes={[inkFocusTheme, { ...nightStudyTheme, version: '0.9.0' }]}
        onRefresh={refreshRemoteThemes}
        onPreview={previewRemoteTheme}
        onInstall={installRemoteTheme}
      />,
    );

    await user.click(screen.getByRole('button', { name: '刷新远程主题' }));
    expect(refreshRemoteThemes).toHaveBeenCalledTimes(1);

    const remoteList = screen.getByRole('list', { name: '远程主题' });
    const inkFocusRow = within(remoteList).getByText('Ink Focus').closest('li')!;
    const nightStudyRow = within(remoteList).getByText('Night Study').closest('li')!;
    const futureRow = within(remoteList).getByText('Future Theme').closest('li')!;

    expect(within(inkFocusRow).getByRole('button', { name: '已安装' })).toBeDisabled();
    expect(within(inkFocusRow).getByText('已安装', { selector: '.theme-package-state' })).toBeInTheDocument();
    expect(within(nightStudyRow).getByRole('button', { name: '更新' })).toBeEnabled();
    expect(within(nightStudyRow).getByText('已安装旧版', { selector: '.theme-package-state' })).toBeInTheDocument();
    expect(within(futureRow).getByRole('button', { name: '不兼容' })).toBeDisabled();

    await user.click(within(nightStudyRow).getByRole('button', { name: '预览' }));
    await user.click(within(nightStudyRow).getByRole('button', { name: '更新' }));

    expect(previewRemoteTheme).toHaveBeenCalledWith(remoteIndex.themes[1]);
    expect(installRemoteTheme).toHaveBeenCalledWith(remoteIndex.themes[1]);
  });

  it('hides bundled themes from the remote list and keeps installed labels visible', () => {
    const remoteIndex = createRemoteThemeIndex();

    render(
      <RemoteThemeList
        index={remoteIndex}
        installedThemes={[nightStudyTheme]}
        hiddenThemeIds={['ink-focus']}
        onRefresh={vi.fn()}
        onPreview={vi.fn()}
        onInstall={vi.fn()}
      />,
    );

    const remoteList = screen.getByRole('list', { name: '远程主题' });
    expect(within(remoteList).queryByText('Ink Focus')).not.toBeInTheDocument();

    const nightStudyRow = within(remoteList).getByText('Night Study').closest('li')!;
    expect(within(nightStudyRow).getByText('已安装', { selector: '.theme-package-state' })).toBeInTheDocument();
    expect(within(nightStudyRow).getByRole('button', { name: '已安装' })).toBeDisabled();
  });

  it('renders remote theme preview images from the remote index', () => {
    const remoteIndex = createRemoteThemeIndex();
    remoteIndex.themes[1] = {
      ...remoteIndex.themes[1],
      previewUrl: 'https://example.com/previews/night-study.svg',
    };

    render(
      <RemoteThemeList
        index={remoteIndex}
        installedThemes={[]}
        onRefresh={vi.fn()}
        onPreview={vi.fn()}
        onInstall={vi.fn()}
      />,
    );

    const remoteList = screen.getByRole('list', { name: '远程主题' });
    const nightStudyRow = within(remoteList).getByText('Night Study').closest('li')!;
    const previewImage = within(nightStudyRow).getByRole('img', { name: 'Night Study 预览图' });

    expect(previewImage).toHaveAttribute('src', 'https://example.com/previews/night-study.svg');
    expect(previewImage).toHaveAttribute('loading', 'lazy');
  });

  it('renders installed theme package actions with the active theme disabled', async () => {
    const user = userEvent.setup();
    const applyTheme = vi.fn();
    const exportTheme = vi.fn();
    const removeTheme = vi.fn();

    render(
      <InstalledThemePackageList
        installedThemes={[installedPaperTheme, nightStudyTheme]}
        activeThemeId="installed:paper-pro"
        onApply={applyTheme}
        onExport={exportTheme}
        onRemove={removeTheme}
      />,
    );

    const installedList = screen.getByRole('list', { name: '已安装主题' });
    const paperRow = within(installedList).getByText('Paper Pro · 使用中').closest('li')!;
    const nightRow = within(installedList).getByText('Night Study').closest('li')!;

    expect(within(paperRow).getByRole('button', { name: '应用' })).toBeDisabled();

    await user.click(within(nightRow).getByRole('button', { name: '应用' }));
    await user.click(within(nightRow).getByRole('button', { name: '导出' }));
    await user.click(within(nightRow).getByRole('button', { name: '删除' }));

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

    expect(screen.getByText('Paper Pro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认更新' })).toBeInTheDocument();
    expect(screen.getByLabelText('阅读主题预览').closest('.theme-preview')).toHaveAttribute(
      'data-reader-theme-id',
      'installed:paper-pro',
    );

    await user.click(screen.getByRole('button', { name: '确认更新' }));
    await user.click(screen.getByRole('button', { name: '取消' }));

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
