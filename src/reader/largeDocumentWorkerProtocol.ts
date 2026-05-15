import type { LargeDocumentIndex, LargeDocumentLineRange, LargeDocumentSearchResult } from './largeDocumentIndex';

export type LargeDocumentWorkerRequest =
  | { id: string; type: 'buildIndex'; file: File }
  | { id: string; type: 'readLines'; file: File; index: LargeDocumentIndex; startLine: number; endLine: number }
  | { id: string; type: 'search'; file: File; index: LargeDocumentIndex; query: string; limit?: number };

export type LargeDocumentWorkerResult =
  | LargeDocumentIndex
  | LargeDocumentLineRange
  | LargeDocumentSearchResult[];

export type LargeDocumentWorkerResponse =
  | { id: string; ok: true; result: LargeDocumentWorkerResult }
  | { id: string; ok: false; error: string };
