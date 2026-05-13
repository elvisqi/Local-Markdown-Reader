import type { FileTreeNode } from '../../shared/types';
import { FileTree } from './FileTree';

type FileDrawerProps = {
  open: boolean;
  tree: FileTreeNode[];
  activePath: string | null;
  onOpenFolder: () => void;
  onReloadFolder: () => void;
  onClose: () => void;
  onSelect: (path: string) => void;
};

export function FileDrawer({ open, tree, activePath, onOpenFolder, onReloadFolder, onClose, onSelect }: FileDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <aside className="file-drawer is-open" aria-label="文件列表">
      <div className="file-drawer__header">
        <h2>文件</h2>
        <div className="file-drawer__actions">
          <button type="button" onClick={onOpenFolder}>
            打开文件夹
          </button>
          <button type="button" onClick={onReloadFolder} title="重新扫描当前文件夹">
            重载目录
          </button>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      <FileTree tree={tree} activePath={activePath} onSelect={onSelect} />
    </aside>
  );
}
