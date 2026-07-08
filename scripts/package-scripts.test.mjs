import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('package scripts', () => {
  it('runs theme index verification in the preflight release checks', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));

    expect(packageJson.scripts['themes:official']).toBe('node scripts/build-official-themes.mjs');
    expect(packageJson.scripts['themes:sources:verify']).toBe('node scripts/theme-rebuild/verify-theme-sources.mjs');
    expect(packageJson.scripts['themes:reachability']).toBe('node scripts/theme-rebuild/selectorReachability.mjs');
    expect(packageJson.scripts['themes:similarity']).toBe('node scripts/theme-rebuild/run-theme-similarity.mjs');
    expect(packageJson.scripts['themes:visual:review-template']).toContain('accept-theme-visual-report.mjs --write-template');
    expect(packageJson.scripts['themes:visual:accept']).toBe('node scripts/theme-rebuild/accept-theme-visual-report.mjs');
    expect(packageJson.scripts.preflight).toContain('npm run themes:verify');
    expect(packageJson.scripts.preflight).toContain('npm run themes:references:verify');
    expect(packageJson.scripts.preflight).toContain('npm run typecheck');
    expect(packageJson.scripts.preflight).toContain('npm test');
    expect(packageJson.scripts.preflight).toContain('npm run build');
    expect(packageJson.scripts.preflight).toContain('npm run verify:dist');
  });
});
