import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('package scripts', () => {
  it('runs theme index verification in the preflight release checks', async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));

    expect(packageJson.scripts.preflight).toContain('npm run themes:verify');
    expect(packageJson.scripts.preflight).toContain('npm run themes:references:verify');
    expect(packageJson.scripts.preflight).toContain('npm run typecheck');
    expect(packageJson.scripts.preflight).toContain('npm test');
    expect(packageJson.scripts.preflight).toContain('npm run build');
    expect(packageJson.scripts.preflight).toContain('npm run verify:dist');
  });
});
