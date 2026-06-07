import { useEffect, useRef } from 'react';
import type { Content, JSONEditorPropsOptional } from 'vanilla-jsoneditor';
import { createJSONEditor, Mode } from 'vanilla-jsoneditor';

type JsonEditorViewerProps = {
  content: Content;
  mode: 'text' | 'tree' | 'table';
  theme: 'light' | 'dark';
  ariaLabel?: string;
};

export function JsonEditorViewer({ content, mode, theme, ariaLabel = 'JSON 编辑器' }: JsonEditorViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) {
      return undefined;
    }

    editorRef.current = createJSONEditor({
      target,
      props: createEditorProps(content, mode),
    });

    return () => {
      void editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    editorRef.current?.updateProps(createEditorProps(content, mode));
  }, [content, mode]);

  return (
    <div
      ref={containerRef}
      className={`json-editor-viewer${theme === 'dark' ? ' jse-theme-dark' : ''}`}
      aria-label={ariaLabel}
    />
  );
}

function createEditorProps(content: Content, mode: 'text' | 'tree' | 'table'): JSONEditorPropsOptional {
  return {
    content,
    readOnly: true,
    mode: resolveEditorMode(mode),
    mainMenuBar: true,
    navigationBar: true,
    statusBar: true,
    askToFormat: false,
  };
}

function resolveEditorMode(mode: 'text' | 'tree' | 'table'): Mode {
  if (mode === 'text') {
    return Mode.text;
  }

  return mode === 'table' ? Mode.table : Mode.tree;
}
