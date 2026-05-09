type ReaderToolbarProps = {
  title: string;
  rawMode: boolean;
  onToggleDrawer: () => void;
  onRawModeChange: (rawMode: boolean) => void;
};

export function ReaderToolbar({
  title,
  rawMode,
  onToggleDrawer,
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
