export type DocumentTabItem = {
  id: string;
  label: string;
  path: string;
  isPinned: boolean;
};

type DocumentTabsProps = {
  tabs: DocumentTabItem[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onPin: (tabId: string) => void;
};

export function DocumentTabs({ tabs, activeTabId, onSelect, onClose, onPin }: DocumentTabsProps) {
  if (!tabs.length) {
    return null;
  }

  return (
    <nav className="document-tabs" aria-label="打开的文档" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`document-tabs__item${active ? ' is-active' : ''}${tab.isPinned ? '' : ' is-preview'}`}
            data-pinned={tab.isPinned}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`切换到 ${tab.path}`}
              className="document-tabs__tab"
              title={tab.isPinned ? tab.path : `预览：${tab.path}（双击固定）`}
              onClick={() => onSelect(tab.id)}
              onDoubleClick={() => onPin(tab.id)}
            >
              {tab.label}
            </button>
            <button
              type="button"
              className="document-tabs__close"
              aria-label={`关闭 ${tab.path}`}
              title={`关闭 ${tab.path}`}
              onClick={() => onClose(tab.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </nav>
  );
}
