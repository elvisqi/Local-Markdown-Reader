import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  InstalledThemePackageList,
  PendingThemePackagePreview,
  ReadingSettingsForm,
  ThemeCatalogList,
  ThemePackageImportControls,
} from './ThemeSettingsSections';
import {
  inkFocusTheme,
  installedPaperTheme,
  nightStudyTheme,
} from './testThemeFixtures';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { ReaderSettings } from '../shared/types';

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
