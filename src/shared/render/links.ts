import { isReadableDocumentFile, normalizePath } from '../fileSystem';

export type ResolvedLink =
  | {
      kind: 'document';
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
  if (isAbsoluteHref(href) || href.startsWith('/')) {
    return { kind: 'external', href };
  }

  if (href.startsWith('#')) {
    return {
      kind: 'hash',
      path: currentPath,
      hash: decodeHashFragment(href.slice(1)),
    };
  }

  const [rawPath, rawHash] = href.split('#');
  const currentDir = currentPath.split('/').slice(0, -1);
  const normalized = resolvePath([...currentDir, decodePath(rawPath)]);

  if (!normalized || !isReadableDocumentFile(normalized)) {
    return { kind: 'external', href };
  }

  return {
    kind: 'document',
    path: normalized,
    hash: rawHash ? decodeHashFragment(rawHash) : null,
  };
}

function isAbsoluteHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) || /^(?:mailto|tel):/i.test(href);
}

function resolvePath(parts: string[]): string | null {
  const stack: string[] = [];

  for (const part of normalizePath(parts).split('/')) {
    if (part === '..') {
      if (!stack.length) {
        return null;
      }

      stack.pop();
    } else if (part !== '.') {
      stack.push(part);
    }
  }

  return stack.join('/');
}

function decodePath(path: string): string {
  return path
    .split('/')
    .map((part) => decodeHashFragment(part))
    .join('/');
}

function decodeHashFragment(hash: string): string {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}
