import { describe, expect, it } from 'vitest';

import { buildSourceFingerprint } from './sourceFingerprinting.mjs';
import { assertNoRestrictedSourceCopy } from './licenseCopyGuard.mjs';

describe('licenseCopyGuard', () => {
  it('detects declaration block reuse and every-offset text window reuse', () => {
    const repeated = `.x { padding: 12px; margin: 4px; border-width: 1px; }\n${'a'.repeat(160)}`;
    const source = buildSourceFingerprint({ id: 'restricted', css: repeated });

    expect(() => assertNoRestrictedSourceCopy({
      themeId: 'copy',
      css: `.y { padding: 12px; margin: 4px; border-width: 1px; }\n${'z'}${'a'.repeat(160)}`,
      sourceFingerprints: {
        sources: {
          restricted: source,
        },
      },
      restrictedSourceIds: ['restricted'],
    })).toThrow(/restricted source/i);
  });
});
