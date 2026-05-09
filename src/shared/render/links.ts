import { isMarkdownFile, normalizePath } from '../fileSystem';

export type ResolvedLink =
  | {
      kind: 'markdown';
      path: string;
      hash: string | null;
    }
  | {
      kind: 'hash';
      path: string;
      hash: string;
    }
  | {
      kind: 'external';
      href: string;
    };

export function resolveMarkdownHref(href: string, currentPath: string): ResolvedLink {
  if (isAbsoluteHref(href)) {
    return { kind: 'external', href };
  }

  if (href.startsWith('#')) {
    return {
      kind: 'hash',
      path: currentPath,
      hash: decodeURIComponent(href.slice(1)),
    };
  }

  const [rawPath, rawHash] = href.split('#');
  const currentDir = currentPath.split('/').slice(0, -1);
  const normalized = resolvePath([...currentDir, rawPath]);

  if (!isMarkdownFile(normalized)) {
    return { kind: 'external', href };
  }

  return {
    kind: 'markdown',
    path: normalized,
    hash: rawHash ? decodeURIComponent(rawHash) : null,
  };
}

function isAbsoluteHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(?:mailto|tel):/i.test(href);
}

function resolvePath(parts: string[]): string {
  const stack: string[] = [];

  for (const part of normalizePath(parts).split('/')) {
    if (part === '..') {
      stack.pop();
    } else if (part !== '.') {
      stack.push(part);
    }
  }

  return stack.join('/');
}
