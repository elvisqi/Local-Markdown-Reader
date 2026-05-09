/// <reference types="vite/client" />

interface Window {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
}

declare function showDirectoryPicker(
  options?: { mode?: 'read' | 'readwrite' },
): Promise<FileSystemDirectoryHandle>;
