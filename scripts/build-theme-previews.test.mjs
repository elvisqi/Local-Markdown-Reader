import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildThemePreviews } from './build-theme-previews.mjs';

const generatedRoots = [];

afterEach(async () => {
  await Promise.all(generatedRoots.map((root) => rm(root, { recursive: true, force: true })));
  generatedRoots.length = 0;
});

describe('theme preview generation', () => {
  it('renders a realistic markdown sample in individual and showcase SVG previews', async () => {
    const root = await mkdtemp(join(tmpdir(), 'md-viewer-theme-previews-'));
    generatedRoots.push(root);
    await cp(resolve(process.cwd(), 'themes', 'packages'), join(root, 'themes', 'packages'), { recursive: true });

    await buildThemePreviews({ rootDir: root });

    const singlePreview = await readFile(join(root, 'themes', 'previews', 'minimal-focus.svg'), 'utf8');
    const showcasePreview = await readFile(join(root, 'themes', 'previews', 'theme-showcase-2.3.1.svg'), 'utf8');

    for (const expectedText of [
      'Heading System',
      'Task List',
      'Callout',
      'Status Table',
      '#theme',
      'const reader',
    ]) {
      expect(singlePreview).toContain(expectedText);
      expect(showcasePreview).toContain(expectedText);
    }
  });
});
