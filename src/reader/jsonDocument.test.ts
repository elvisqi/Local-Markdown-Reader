import { parseJsonDocument, parseJsonLinesDocument, summarizeJsonValue } from './jsonDocument';

describe('jsonDocument', () => {
  it('parses JSON and summarizes its structure', () => {
    const result = parseJsonDocument(
      JSON.stringify({
        users: [{ id: 1, profile: { name: 'Ada' } }],
        meta: { total: 1 },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.summary).toMatchObject({
      rootType: 'object',
      topLevelEntries: 2,
      nodeCount: 8,
      maxDepth: 5,
    });
  });

  it('returns parse errors for invalid JSON without throwing', () => {
    const result = parseJsonDocument('{"name":');

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toMatch(/JSON|Unexpected|unterminated/i);
  });

  it('summarizes nested arrays and primitive roots', () => {
    expect(summarizeJsonValue([{ id: 1 }, { id: 2 }])).toMatchObject({
      rootType: 'array',
      topLevelEntries: 2,
      maxDepth: 3,
    });
    expect(summarizeJsonValue('ok')).toEqual({
      rootType: 'string',
      topLevelEntries: 0,
      nodeCount: 1,
      maxDepth: 1,
    });
  });

  it('parses JSONL into a JSON array and summarizes rows', () => {
    const result = parseJsonLinesDocument('{"id":1,"event":"open"}\n\n{"id":2,"event":"close"}\n');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toEqual([
      { id: 1, event: 'open' },
      { id: 2, event: 'close' },
    ]);
    expect(result.summary).toMatchObject({
      rootType: 'array',
      topLevelEntries: 2,
    });
  });

  it('returns the line number when JSONL parsing fails', () => {
    const result = parseJsonLinesDocument('{"id":1}\n{"id":');

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toMatch(/第 2 行/);
  });
});
