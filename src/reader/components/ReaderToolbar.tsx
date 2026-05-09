type ReaderToolbarProps = {
  title: string;
  rawMode: boolean;
  onToggleDrawer: () => void;
  onReload: () => void;
  onRawModeChange: (rawMode: boolean) => void;
};

export function ReaderToolbar({
  title,
  rawMode,
  onToggleDrawer,
  onReload,
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
        <button type="button" onClick={onReload}>
          重载
        </button>
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
