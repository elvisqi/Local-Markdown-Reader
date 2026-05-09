import type { OutlineItem } from '../../shared/types';

type OutlinePanelProps = {
  outline: OutlineItem[];
  activeId?: string | null;
  onNavigate: (id: string) => void;
};

export function OutlinePanel({ outline, activeId = null, onNavigate }: OutlinePanelProps) {
  return (
    <aside className="outline-panel" aria-label="文档大纲">
      <h2>文档大纲</h2>
      {outline.length ? (
        <OutlineList outline={outline} activeId={activeId} onNavigate={onNavigate} />
      ) : (
        <p className="empty-note">当前文档没有标题。</p>
      )}
    </aside>
  );
}

function OutlineList({ outline, activeId, onNavigate }: OutlinePanelProps) {
  return (
    <ul>
      {outline.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={item.id === activeId ? 'is-active' : undefined}
            aria-current={item.id === activeId ? 'location' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {item.text}
          </button>
          {item.children.length > 0 && (
            <OutlineList outline={item.children} activeId={activeId} onNavigate={onNavigate} />
          )}
        </li>
      ))}
    </ul>
  );
}
