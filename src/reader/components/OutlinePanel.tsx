import type { OutlineItem } from '../../shared/types';

type OutlinePanelProps = {
  outline: OutlineItem[];
  onNavigate: (id: string) => void;
};

export function OutlinePanel({ outline, onNavigate }: OutlinePanelProps) {
  return (
    <aside className="outline-panel" aria-label="Document outline">
      <h2>Outline</h2>
      {outline.length ? (
        <OutlineList outline={outline} onNavigate={onNavigate} />
      ) : (
        <p className="empty-note">No headings in this document.</p>
      )}
    </aside>
  );
}

function OutlineList({ outline, onNavigate }: OutlinePanelProps) {
  return (
    <ul>
      {outline.map((item) => (
        <li key={item.id}>
          <button type="button" onClick={() => onNavigate(item.id)}>
            {item.text}
          </button>
          {item.children.length > 0 && <OutlineList outline={item.children} onNavigate={onNavigate} />}
        </li>
      ))}
    </ul>
  );
}
