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
          Files
        </button>
        <h1>{title}</h1>
      </div>
      <div className="reader-toolbar__actions">
        <button type="button" onClick={onOpenFolder}>
          Open Folder
        </button>
        <label>
          Theme
          <select value={theme} onChange={(event) => onThemeChange(event.target.value as ThemePreference)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Width
          <select value={width} onChange={(event) => onWidthChange(event.target.value as ReadingWidth)}>
            <option value="narrow">Narrow</option>
            <option value="comfortable">Comfortable</option>
            <option value="wide">Wide</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label>
          Style
          <select value={style} onChange={(event) => onStyleChange(event.target.value as ReadingStyle)}>
            <option value="clean">Clean Doc</option>
            <option value="github">GitHub</option>
            <option value="paper">Paper</option>
            <option value="classic">Classic</option>
          </select>
        </label>
        <label>
          Raw
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
