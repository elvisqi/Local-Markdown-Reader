import type { FileTreeNode } from '../../shared/types';

type FileTreeProps = {
  tree: FileTreeNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
};

export function FileTree({ tree, activePath, onSelect }: FileTreeProps) {
  if (!tree.length) {
    return <p className="empty-note">没有找到 Markdown 文件。</p>;
  }

  return (
    <nav aria-label="Markdown 文件" className="file-tree">
      <TreeList nodes={tree} activePath={activePath} onSelect={onSelect} />
    </nav>
  );
}

type TreeListProps = {
  nodes: FileTreeNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
};

function TreeList({ nodes, activePath, onSelect }: TreeListProps) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.path}>
          {node.type === 'directory' ? (
            <details open>
              <summary>{node.name}</summary>
              <TreeList nodes={node.children} activePath={activePath} onSelect={onSelect} />
            </details>
          ) : (
            <button
              type="button"
              className="file-tree__file"
              aria-current={node.path === activePath ? 'page' : undefined}
              onClick={() => onSelect(node.path)}
            >
              {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
