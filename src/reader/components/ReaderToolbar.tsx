import type { MarkdownFileEntry } from '../../shared/types';

type ReaderToolbarProps = {
  title: string;
  rawMode: boolean;
  onToggleDrawer: () => void;
  onReload: () => void;
  previousFile: MarkdownFileEntry | null;
  nextFile: MarkdownFileEntry | null;
  onOpenPrevious: () => void;
  onOpenNext: () => void;
  onRawModeChange: (rawMode: boolean) => void;
};

export function ReaderToolbar({
  title,
  rawMode,
  onToggleDrawer,
  onReload,
  previousFile,
  nextFile,
  onOpenPrevious,
  onOpenNext,
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
        <button
          type="button"
          disabled={!previousFile}
          title={previousFile ? `上一个文件：${previousFile.name}` : '当前已经是本文件夹第一个 Markdown 文件'}
          onClick={onOpenPrevious}
        >
          上一个
        </button>
        <button
          type="button"
          disabled={!nextFile}
          title={nextFile ? `下一个文件：${nextFile.name}` : '当前已经是本文件夹最后一个 Markdown 文件'}
          onClick={onOpenNext}
        >
          下一个
        </button>
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
