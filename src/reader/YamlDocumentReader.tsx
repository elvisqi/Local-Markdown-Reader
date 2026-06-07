import { lazy, Suspense, useMemo } from 'react';

import type { ThemePreference } from '../shared/types';
import { type JsonDocumentSummary } from './jsonDocument';
import { parseYamlDocument } from './yamlDocument';

const JsonEditorViewer = lazy(() =>
  import('./JsonEditorViewer').then((module) => ({ default: module.JsonEditorViewer })),
);

type YamlDocumentReaderProps = {
  source: string;
  fileName: string | null;
  theme: ThemePreference;
};

export function YamlDocumentReader({ source, fileName, theme }: YamlDocumentReaderProps) {
  const parsed = useMemo(() => parseYamlDocument(source), [source]);
  const editorContent = parsed.ok ? { json: parsed.data } : { text: source };
  const editorMode = parsed.ok ? 'tree' : 'text';

  return (
    <section className="json-reader">
      <YamlReaderHeader fileName={fileName} summary={parsed.ok ? parsed.summary : undefined} />
      {!parsed.ok && <p className="error-note">YAML 解析失败：{parsed.error}</p>}
      <Suspense fallback={<div className="json-reader__editor-loading">正在加载 YAML 编辑器...</div>}>
        <JsonEditorViewer
          content={editorContent}
          mode={editorMode}
          theme={resolveEditorTheme(theme)}
          ariaLabel="YAML 编辑器"
        />
      </Suspense>
    </section>
  );
}

function YamlReaderHeader({
  fileName,
  summary,
}: {
  fileName: string | null;
  summary?: JsonDocumentSummary;
}) {
  return (
    <header className="json-reader__header">
      <h1>{fileName ?? 'YAML 文档'}</h1>
      {summary && (
        <dl className="json-reader__summary">
          <div>
            <dt>根类型</dt>
            <dd>{formatRootType(summary.rootType)}</dd>
          </div>
          <div>
            <dt>节点</dt>
            <dd>节点 {summary.nodeCount}</dd>
          </div>
          <div>
            <dt>深度</dt>
            <dd>{summary.maxDepth}</dd>
          </div>
          <div>
            <dt>顶层</dt>
            <dd>{summary.topLevelEntries}</dd>
          </div>
        </dl>
      )}
    </header>
  );
}

function formatRootType(type: JsonDocumentSummary['rootType']): string {
  return type[0].toUpperCase() + type.slice(1);
}

function resolveEditorTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'dark') {
    return 'dark';
  }

  if (theme === 'system' && typeof window !== 'undefined') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}
