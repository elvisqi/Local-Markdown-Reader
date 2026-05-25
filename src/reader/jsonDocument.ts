export type JsonParseResult =
  | {
      ok: true;
      data: unknown;
      summary: JsonDocumentSummary;
    }
  | {
      ok: false;
      error: string;
    };

export type JsonDocumentSummary = {
  rootType: JsonValueType;
  nodeCount: number;
  maxDepth: number;
  topLevelEntries: number;
};

export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

const MAX_OUTLINE_ITEMS = 80;
const MAX_OUTLINE_DEPTH = 2;

export function parseJsonDocument(source: string): JsonParseResult {
  try {
    const data = JSON.parse(source) as unknown;

    return {
      ok: true,
      data,
      summary: summarizeJsonValue(data),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败。',
    };
  }
}

export function summarizeJsonValue(data: unknown): JsonDocumentSummary {
  let nodeCount = 0;
  let maxDepth = 0;

  const visit = (value: unknown, depth: number) => {
    nodeCount += 1;
    maxDepth = Math.max(maxDepth, depth);

    if (!isContainer(value)) {
      return;
    }

    for (const [, child] of getContainerEntries(value)) {
      visit(child, depth + 1);
    }
  };

  visit(data, 1);

  return {
    rootType: getJsonValueType(data),
    nodeCount,
    maxDepth,
    topLevelEntries: isContainer(data) ? getContainerEntries(data).length : 0,
  };
}

function isContainer(value: unknown): value is unknown[] | Record<string, unknown> {
  return (Array.isArray(value) || (typeof value === 'object' && value !== null));
}

function getContainerEntries(value: unknown[] | Record<string, unknown>): Array<[string, unknown]> {
  return Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
}

function getJsonValueType(value: unknown): JsonValueType {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  if (typeof value === 'string') {
    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  return 'boolean';
}
