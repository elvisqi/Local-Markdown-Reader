import { memo, useEffect, useRef } from 'react';

import { renderMermaidBlocks } from './mermaidRenderer';

type RenderedMarkdownContentProps = {
  html: string;
  mermaidEnabled: boolean;
  className?: string;
};

function RenderedMarkdownContentComponent({ html, mermaidEnabled, className }: RenderedMarkdownContentProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contentRef.current || !mermaidEnabled) {
      return;
    }

    void renderMermaidBlocks(contentRef.current);
  }, [html, mermaidEnabled]);

  return <div ref={contentRef} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const RenderedMarkdownContent = memo(RenderedMarkdownContentComponent);
