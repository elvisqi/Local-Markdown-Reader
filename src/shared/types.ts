export type ColorModePreference = 'light' | 'dark' | 'system';
export type ReadingWidth = 'narrow' | 'comfortable' | 'wide' | 'full';
export type ReadingStyle = 'clean' | 'github' | 'paper' | 'classic';
export type BuiltinReaderThemeId = `builtin:${ReadingStyle}`;
export type InstalledReaderThemeId = `installed:${string}`;
export type ReaderThemeId = BuiltinReaderThemeId | InstalledReaderThemeId;
export type DocumentFileKind = 'markdown' | 'html' | 'json' | 'jsonl' | 'yaml';
export type ThemeColorScheme = ColorModePreference;

export type ReaderThemePackage = {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  minAppVersion?: string;
  colorScheme: ThemeColorScheme;
  tokens: Record<string, string>;
  css: string;
  installedAt: number;
};

export type RemoteThemeIndexEntry = {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  minAppVersion?: string;
  colorScheme: ThemeColorScheme;
  downloadUrl: string;
  sha256: string;
  previewUrl?: string;
  tags: string[];
  deprecated?: boolean;
  replacementThemeId?: string;
  compatible: boolean;
};

export type RemoteThemeIndex = {
  sourceUrl: string;
  fetchedAt: number;
  version: number;
  updatedAt?: string;
  themes: RemoteThemeIndexEntry[];
};

export type ReaderSettings = {
  reading: {
    colorMode: ColorModePreference;
    themeId: ReaderThemeId;
    width: ReadingWidth;
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
    popupColorMode: ColorModePreference;
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

export type LazyDirectoryLoadState = 'unloaded' | 'loading' | 'loaded' | 'error';

export type LazyFileTreeNode =
  | {
      id: string;
      type: 'directory';
      name: string;
      path: string;
      children: LazyFileTreeNode[];
      loadState: LazyDirectoryLoadState;
      errorMessage?: string;
    }
  | {
      id: string;
      type: 'file';
      name: string;
      path: string;
    };

export type DocumentFileEntry = {
  name: string;
  path: string;
};

export type MarkdownFileEntry = DocumentFileEntry;
