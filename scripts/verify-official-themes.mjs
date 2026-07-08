import { fileURLToPath } from 'node:url';

import {
  parseOfficialThemeVerifierArgs,
  verifyOfficialThemes,
} from './theme-rebuild/officialThemeVerifier.mjs';

export { verifyOfficialThemes };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseOfficialThemeVerifierArgs(process.argv.slice(2));
  verifyOfficialThemes(options).then((result) => {
    console.log(`official themes verified: ${result.themeCount}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
