import type { OutlineItem } from '../../shared/types';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

type OutlinePanelProps = {
  outline: OutlineItem[];
  activeId?: string | null;
  onNavigate: (id: string) => void;
  resizeValue?: number;
  resizeMin?: number;
  resizeMax?: number;
  onResizeStart?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
};

export function OutlinePanel({
  outline,
  activeId = null,
  onNavigate,
  resizeValue,
  resizeMin,
  resizeMax,
  onResizeStart,
  onResizeKeyDown,
}: OutlinePanelProps) {
  const canResize = Boolean(onResizeStart && onResizeKeyDown);

  return (
    <aside className="outline-panel" aria-label="文档大纲">
      {canResize && (
        <div
          className="outline-panel__resize-handle"
          role="separator"
          aria-label="调整文档大纲宽度"
          aria-orientation="vertical"
          aria-valuenow={resizeValue}
          aria-valuemin={resizeMin}
          aria-valuemax={resizeMax}
          tabIndex={0}
          onPointerDown={onResizeStart}
          onKeyDown={onResizeKeyDown}
        />
      )}
      <div className="outline-panel__scroll">
        <h2>文档大纲</h2>
        {outline.length ? (
          <OutlineList outline={outline} activeId={activeId} onNavigate={onNavigate} />
        ) : (
          <p className="empty-note">当前文档没有标题。</p>
        )}
      </div>
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
