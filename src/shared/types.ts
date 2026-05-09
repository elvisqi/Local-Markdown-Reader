export type ThemePreference = 'light' | 'dark' | 'system';
export type ReadingWidth = 'narrow' | 'comfortable' | 'wide' | 'full';
export type ReadingStyle = 'clean' | 'github' | 'paper' | 'classic';

export type ReaderSettings = {
  reading: {
    theme: ThemePreference;
    width: ReadingWidth;
    style: ReadingStyle;
    rawMode: boolean;
    showOutline: boolean;
    autoReload: boolean;
  };
  rendering: {
    syntaxHighlighting: boolean;
    mermaid: boolean;
    mathJax: boolean;
    emoji: boolean;
    customCss: string;
  };
  ui: {
    popupTheme: ThemePreference;
    iconTheme: 'default' | 'light' | 'dark';
  };
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type OutlineItem = {
  id: string;
  text: string;
  depth: number;
  children: OutlineItem[];
};

export type MarkdownLink = {
  href: string;
  text: string;
};

export type RenderDiagnostic = {
  level: 'info' | 'warning' | 'error';
  message: string;
};

export type RenderResult = {
  html: string;
  outline: OutlineItem[];
  title: string | null;
  links: MarkdownLink[];
  diagnostics: RenderDiagnostic[];
};

export type FileTreeNode =
  | {
      type: 'directory';
      name: string;
      path: string;
      children: FileTreeNode[];
    }
  | {
      type: 'file';
      name: string;
      path: string;
    };

export type MarkdownFileEntry = {
  name: string;
  path: string;
};
