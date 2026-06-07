import { parseDocument } from 'yaml';

import { summarizeJsonValue, type JsonDocumentSummary } from './jsonDocument';

export type YamlParseResult =
  | {
      ok: true;
      data: unknown;
      summary: JsonDocumentSummary;
    }
  | {
      ok: false;
      error: string;
    };

export function parseYamlDocument(source: string): YamlParseResult {
  try {
    const document = parseDocument(source, {
      prettyErrors: true,
      strict: true,
      uniqueKeys: true,
    });

    if (document.errors.length > 0) {
      return {
        ok: false,
        error: formatYamlError(document.errors[0]),
      };
    }

    const data = document.toJSON();

    return {
      ok: true,
      data,
      summary: summarizeJsonValue(data),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'YAML 解析失败。',
    };
  }
}

function formatYamlError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
