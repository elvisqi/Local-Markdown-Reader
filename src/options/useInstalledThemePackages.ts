import { useEffect, useState } from 'react';

import { DEFAULT_SETTINGS } from '../shared/settings';
import {
  createInstalledReaderThemeId,
  deleteInstalledTheme,
  fetchRemoteThemeIndex,
  getInstalledThemePackageId,
  installRemoteTheme,
  installThemePackage,
  loadCachedRemoteThemeIndex,
  loadInstalledThemes,
  parseThemePackageText,
  serializeThemePackage,
  assertThemeCompatible,
  subscribeInstalledThemes,
} from '../shared/themes';
import type {
  ReaderSettings,
  ReaderThemePackage,
  RemoteThemeIndex,
  RemoteThemeIndexEntry,
} from '../shared/types';

type UseInstalledThemePackagesParams = {
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => Promise<void>;
};

export function useInstalledThemePackages({
  settings,
  onSettingsChange,
}: UseInstalledThemePackagesParams) {
  const [installedThemes, setInstalledThemes] = useState<ReaderThemePackage[]>([]);
  const [themeStatus, setThemeStatus] = useState<string | null>(null);
  const [remoteThemeStatus, setRemoteThemeStatus] = useState<string | null>(null);
  const [remoteThemeIndex, setRemoteThemeIndex] = useState<RemoteThemeIndex | null>(null);
  const [pendingTheme, setPendingTheme] = useState<ReaderThemePackage | null>(null);

  useEffect(() => {
    let active = true;
    void loadInstalledThemes().then((themes) => {
      if (active) {
        setInstalledThemes(themes);
      }
    });
    void loadCachedRemoteThemeIndex().then((index) => {
      if (active) {
        setRemoteThemeIndex(index);
      }
    });

    const unsubscribe = subscribeInstalledThemes((themes) => {
      if (active) {
        setInstalledThemes(themes);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function findInstalledTheme(themeId: string): ReaderThemePackage | undefined {
    return installedThemes.find((item) => item.id === themeId);
  }

  async function previewThemePackage(file: File | undefined) {
    if (!file) {
      return;
    }

    setThemeStatus(`正在读取主题：${file.name}`);

    try {
      const theme = parseThemePackageText(await file.text());
      assertThemeCompatible(theme);
      previewTheme(theme);
    } catch (err) {
      setPendingTheme(null);
      setThemeStatus(err instanceof Error ? err.message : '无法读取主题包。');
    }
  }

  async function confirmThemeInstall() {
    if (!pendingTheme) {
      return;
    }

    try {
      await installPreparedTheme(pendingTheme);
    } catch (err) {
      setThemeStatus(err instanceof Error ? err.message : '无法安装主题包。');
    }
  }

  function previewTheme(theme: ReaderThemePackage) {
    const existingTheme = findInstalledTheme(theme.id);
    setPendingTheme(theme);
    setThemeStatus(existingTheme
      ? `检测到已安装主题：${existingTheme.name} ${existingTheme.version}，将更新为 ${theme.version}。`
      : `主题已准备好：${theme.name}。`);
  }

  async function installPreparedTheme(theme: ReaderThemePackage) {
    const existingTheme = findInstalledTheme(theme.id);
    const themeToInstall = theme.installedAt ? theme : { ...theme, installedAt: Date.now() };
    const result = await installThemePackage(themeToInstall);
    setInstalledThemes(result.themes);
    setPendingTheme(null);
    setThemeStatus(existingTheme ? `已更新主题：${result.theme.name}。` : `已安装主题：${result.theme.name}。`);
    await onSettingsChange({
      ...settings,
      reading: { ...settings.reading, themeId: createInstalledReaderThemeId(result.theme.id) },
    });
  }

  async function installCatalogTheme(theme: ReaderThemePackage) {
    const existingTheme = findInstalledTheme(theme.id);
    if (existingTheme?.version === theme.version) {
      setThemeStatus(`主题已安装：${theme.name}。`);
      return;
    }

    if (existingTheme) {
      previewTheme(theme);
      return;
    }

    try {
      await installPreparedTheme(theme);
    } catch (err) {
      setThemeStatus(err instanceof Error ? err.message : `无法安装主题：${theme.name}。`);
    }
  }

  async function refreshRemoteThemes() {
    setRemoteThemeStatus('正在更新远程主题源...');

    try {
      const index = await fetchRemoteThemeIndex();
      setRemoteThemeIndex(index);
      setRemoteThemeStatus(`已更新远程主题源：${index.themes.length} 个主题。`);
    } catch (err) {
      setRemoteThemeStatus(err instanceof Error ? err.message : '无法更新远程主题源。');
    }
  }

  async function installRemoteThemeEntry(entry: RemoteThemeIndexEntry) {
    try {
      const result = await installRemoteTheme({ entry });
      setInstalledThemes(result.themes);
      setPendingTheme(null);
      setRemoteThemeStatus(`已安装远程主题：${result.theme.name}。`);
      await onSettingsChange({
        ...settings,
        reading: { ...settings.reading, themeId: createInstalledReaderThemeId(result.theme.id) },
      });
    } catch (err) {
      setRemoteThemeStatus(err instanceof Error ? err.message : `无法安装远程主题：${entry.name}。`);
    }
  }

  async function applyInstalledTheme(theme: ReaderThemePackage) {
    await onSettingsChange({
      ...settings,
      reading: { ...settings.reading, themeId: createInstalledReaderThemeId(theme.id) },
    });
    setThemeStatus(`已应用主题：${theme.name}。`);
  }

  async function removeInstalledTheme(theme: ReaderThemePackage) {
    try {
      const themes = await deleteInstalledTheme(theme.id);
      setInstalledThemes(themes);
      setThemeStatus(`已删除主题：${theme.name}。`);

      if (settings.reading.themeId === createInstalledReaderThemeId(theme.id)) {
        await onSettingsChange({
          ...settings,
          reading: { ...settings.reading, themeId: DEFAULT_SETTINGS.reading.themeId },
        });
      }
    } catch (err) {
      setThemeStatus(err instanceof Error ? err.message : `无法删除主题：${theme.name}。`);
    }
  }

  function cancelThemeInstall() {
    setPendingTheme(null);
    setThemeStatus(null);
  }

  function exportInstalledTheme(theme: ReaderThemePackage) {
    downloadThemePackage(theme);
    setThemeStatus(`已导出主题：${theme.name}。`);
  }

  const selectedInstalledThemeId = getInstalledThemePackageId(settings.reading.themeId);
  const selectedTheme = selectedInstalledThemeId
    ? installedThemes.find((theme) => theme.id === selectedInstalledThemeId) ?? null
    : null;
  const pendingExistingTheme = pendingTheme
    ? installedThemes.find((theme) => theme.id === pendingTheme.id) ?? null
    : null;

  return {
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
    installRemoteThemeEntry,
    applyInstalledTheme,
    removeInstalledTheme,
    cancelThemeInstall,
    exportInstalledTheme,
  };
}

function downloadThemePackage(theme: ReaderThemePackage) {
  const objectUrl = URL.createObjectURL(new Blob([serializeThemePackage(theme)], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${theme.id}.mdv-theme.json`;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
