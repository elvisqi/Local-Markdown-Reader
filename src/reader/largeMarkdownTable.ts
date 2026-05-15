export type MarkdownTablePreview = {
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
};

export function extractMarkdownTablePreview(
  source: string,
  { maxRows = 200 }: { maxRows?: number } = {},
): MarkdownTablePreview | null {
  const lines = source.split('\n');
  const headerIndex = lines.findIndex((line, index) => isTableRow(line) && isSeparatorRow(lines[index + 1] ?? ''));

  if (headerIndex < 0) {
    return null;
  }

  const headers = parseTableRow(lines[headerIndex]);
  const bodyLines = lines.slice(headerIndex + 2).filter(isTableRow);

  if (headers.length === 0 || bodyLines.length === 0) {
    return null;
  }

  const rows = bodyLines.slice(0, maxRows).map((line) => normalizeRow(parseTableRow(line), headers.length));

  return {
    headers,
    rows,
    totalRows: bodyLines.length,
    truncated: bodyLines.length > rows.length,
  };
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();

  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
}

function isSeparatorRow(line: string): boolean {
  const cells = parseTableRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const content = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutTrailingPipe = content.endsWith('|') ? content.slice(0, -1) : content;

  return splitEscapedPipes(withoutTrailingPipe).map((cell) => cell.trim());
}

function splitEscapedPipes(value: string): string[] {
  const cells: string[] = [];
  let current = '';
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      current += char;
      escaping = true;
      continue;
    }

    if (char === '|') {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);

  return cells;
}

function normalizeRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_value, index) => row[index] ?? '');
}
