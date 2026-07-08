import { fileURLToPath } from 'node:url';

import {
  buildOfficialThemes,
  parseBuildOfficialThemesArgs,
} from './theme-rebuild/buildOfficialThemes.mjs';

export { buildOfficialThemes, parseBuildOfficialThemesArgs };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseBuildOfficialThemesArgs(process.argv.slice(2));
  buildOfficialThemes(options).then((result) => {
    console.log(`official themes generated: ${result.themeIds.length}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
