import { RECOMMENDED_THEME_PACKAGES } from '../shared/themeCatalog';
import type { ReaderSettings } from '../shared/types';
import {
  InstalledThemePackageList,
  PendingThemePackagePreview,
  ReadingSettingsForm,
  RemoteThemeList,
  ThemeCatalogList,
  ThemePackageCurrentSummary,
  ThemePackageImportControls,
  ThemePreview,
} from './ThemeSettingsSections';
import { useInstalledThemePackages } from './useInstalledThemePackages';
import './ThemeSettings.css';

type ThemeSettingsProps = {
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => Promise<void>;
};

export function ThemeSettings({ settings, onSettingsChange }: ThemeSettingsProps) {
  const {
    installedThemes,
    themeStatus,
    remoteThemeStatus,
    remoteThemeIndex,
    pendingTheme,
    selectedTheme,
    pendingExistingTheme,
    previewThemePackage,
    confirmThemeInstall,
    previewTheme,
    installCatalogTheme,
    refreshRemoteThemes,
    previewRemoteThemeEntry,
    installRemoteThemeEntry,
    applyInstalledTheme,
    removeInstalledTheme,
    cancelThemeInstall,
    exportInstalledTheme,
  } = useInstalledThemePackages({ settings, onSettingsChange });

  return (
    <>
      <section>
        <h2>阅读</h2>
        <div className="reading-settings-grid">
          <ReadingSettingsForm
            settings={settings}
            installedThemes={installedThemes}
            onSettingsChange={onSettingsChange}
          />
          <ThemePreview settings={settings} installedTheme={selectedTheme} />
        </div>
      </section>
      <section>
        <h2>主题包</h2>
        <p className="options-note">导入本地主题包后，它会出现在“阅读主题”里。</p>
        <ThemePackageImportControls onThemePackageFile={previewThemePackage} />
        <ThemeCatalogList
          themes={RECOMMENDED_THEME_PACKAGES}
          installedThemes={installedThemes}
          onPreview={previewTheme}
          onInstall={installCatalogTheme}
        />
        <RemoteThemeList
          index={remoteThemeIndex}
          installedThemes={installedThemes}
          hiddenThemeIds={RECOMMENDED_THEME_PACKAGES.map((theme) => theme.id)}
          onRefresh={refreshRemoteThemes}
          onPreview={previewRemoteThemeEntry}
          onInstall={installRemoteThemeEntry}
        />
        {selectedTheme && <ThemePackageCurrentSummary theme={selectedTheme} />}
        <InstalledThemePackageList
          installedThemes={installedThemes}
          activeThemeId={settings.reading.themeId}
          onApply={applyInstalledTheme}
          onExport={exportInstalledTheme}
          onRemove={removeInstalledTheme}
        />
        {pendingTheme && (
          <PendingThemePackagePreview
            settings={settings}
            theme={pendingTheme}
            existingTheme={pendingExistingTheme}
            onConfirm={confirmThemeInstall}
            onCancel={cancelThemeInstall}
          />
        )}
        {remoteThemeStatus && <p className="options-status">{remoteThemeStatus}</p>}
        {themeStatus && <p className="options-status">{themeStatus}</p>}
      </section>
    </>
  );
}
