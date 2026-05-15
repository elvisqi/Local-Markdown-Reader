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
  const headerIndex = lines.findIndex((line, index) => isTableHeaderRow(line) && isSeparatorRow(lines[index + 1] ?? ''));

  if (headerIndex < 0) {
    return null;
  }

  const headers = parseTableRow(lines[headerIndex]);
  const rows: string[][] = [];
  let totalRows = 0;

  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isTableBodyRow(line)) {
      break;
    }

    totalRows += 1;
    if (rows.length < maxRows) {
      rows.push(normalizeRow(parseTableRow(line), headers.length));
    }
  }

  if (headers.length === 0 || totalRows === 0) {
    return null;
  }

  return {
    headers,
    rows,
    totalRows,
    truncated: totalRows > rows.length,
  };
}

function isTableHeaderRow(line: string): boolean {
  const trimmed = line.trim();
  const cells = parseTableRow(trimmed);

  return countUnescapedPipes(trimmed) > 0 && cells.length >= 2;
}

function isTableBodyRow(line: string): boolean {
  return countUnescapedPipes(line.trim()) > 0;
}

function isSeparatorRow(line: string): boolean {
  const cells = parseTableRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const content = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutTrailingPipe = hasUnescapedTrailingPipe(content) ? content.slice(0, -1) : content;

  return splitEscapedPipes(withoutTrailingPipe).map((cell) => cell.trim());
}

function splitEscapedPipes(value: string): string[] {
  const cells: string[] = [];
  let current = '';
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char === '|' ? '|' : `\\${char}`;
      escaping = false;
      continue;
    }

    if (char === '\\') {
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

  if (escaping) {
    cells[cells.length - 1] += '\\';
  }

  return cells;
}

function normalizeRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_value, index) => row[index] ?? '');
}

function countUnescapedPipes(value: string): number {
  let count = 0;
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '|') {
      count += 1;
    }
  }

  return count;
}

function hasUnescapedTrailingPipe(value: string): boolean {
  if (!value.endsWith('|')) {
    return false;
  }

  let backslashCount = 0;
  for (let index = value.length - 2; index >= 0 && value[index] === '\\'; index -= 1) {
    backslashCount += 1;
  }

  return backslashCount % 2 === 0;
}
