import manifest from '../manifest';
import { APP_VERSION } from './version';

describe('APP_VERSION', () => {
  it('matches the extension manifest version used for compatibility checks', () => {
    expect(APP_VERSION).toBe(manifest.version);
  });
});
