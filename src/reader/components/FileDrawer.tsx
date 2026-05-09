import type { FileTreeNode } from '../../shared/types';
import { FileTree } from './FileTree';

type FileDrawerProps = {
  open: boolean;
  tree: FileTreeNode[];
  activePath: string | null;
  onClose: () => void;
  onSelect: (path: string) => void;
};

export function FileDrawer({ open, tree, activePath, onClose, onSelect }: FileDrawerProps) {
  return (
    <aside className={`file-drawer${open ? ' is-open' : ''}`} aria-label="文件列表">
      <div className="file-drawer__header">
        <h2>文件</h2>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      <FileTree tree={tree} activePath={activePath} onSelect={onSelect} />
    </aside>
  );
}
