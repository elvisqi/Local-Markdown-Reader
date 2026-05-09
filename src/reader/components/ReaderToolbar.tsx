import type { ReadingStyle, ReadingWidth, ThemePreference } from '../../shared/types';

type ReaderToolbarProps = {
  title: string;
  theme: ThemePreference;
  width: ReadingWidth;
  style: ReadingStyle;
  rawMode: boolean;
  onOpenFolder: () => void;
  onToggleDrawer: () => void;
  onThemeChange: (theme: ThemePreference) => void;
  onWidthChange: (width: ReadingWidth) => void;
  onStyleChange: (style: ReadingStyle) => void;
  onRawModeChange: (rawMode: boolean) => void;
};

export function ReaderToolbar({
  title,
  theme,
  width,
  style,
  rawMode,
  onOpenFolder,
  onToggleDrawer,
  onThemeChange,
  onWidthChange,
  onStyleChange,
  onRawModeChange,
}: ReaderToolbarProps) {
  return (
    <header className="reader-toolbar">
      <div className="reader-toolbar__primary">
        <button type="button" onClick={onToggleDrawer}>
          文件
        </button>
        <h1>{title}</h1>
      </div>
      <div className="reader-toolbar__actions">
        <button type="button" onClick={onOpenFolder}>
          打开文件夹
        </button>
        <label>
          主题
          <select value={theme} onChange={(event) => onThemeChange(event.target.value as ThemePreference)}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <label>
          宽度
          <select value={width} onChange={(event) => onWidthChange(event.target.value as ReadingWidth)}>
            <option value="narrow">窄</option>
            <option value="comfortable">舒适</option>
            <option value="wide">宽</option>
            <option value="full">全宽</option>
          </select>
        </label>
        <label>
          样式
          <select value={style} onChange={(event) => onStyleChange(event.target.value as ReadingStyle)}>
            <option value="paper">纸张</option>
            <option value="clean">清爽文档</option>
            <option value="github">GitHub</option>
            <option value="classic">经典</option>
          </select>
        </label>
        <label>
          原文
          <input
            type="checkbox"
            checked={rawMode}
            onChange={(event) => onRawModeChange(event.target.checked)}
          />
        </label>
      </div>
    </header>
  );
}
