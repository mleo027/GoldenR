import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PORTABLE_CONFIG_FILES, seedPortableConfigs } from './configSeed';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'golden-config-seed-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('seedPortableConfigs', () => {
    it('copies missing bundled configs to the portable executable directory', async () => {
        const bundledDir = await createTempDir();
        const targetDir = await createTempDir();
        await writeFile(path.join(bundledDir, 'app.json'), '{"darkMode":true}');

        const copied = await seedPortableConfigs(bundledDir, targetDir, ['app.json']);

        expect(copied).toEqual(['app.json']);
        await expect(readFile(path.join(targetDir, 'app.json'), 'utf-8')).resolves.toBe(
            '{"darkMode":true}',
        );
    });

    it('does not overwrite an existing config', async () => {
        const bundledDir = await createTempDir();
        const targetDir = await createTempDir();
        await writeFile(path.join(bundledDir, 'app.json'), '{"darkMode":true}');
        await writeFile(path.join(targetDir, 'app.json'), '{"darkMode":false}');

        const copied = await seedPortableConfigs(bundledDir, targetDir, ['app.json']);

        expect(copied).toEqual([]);
        await expect(readFile(path.join(targetDir, 'app.json'), 'utf-8')).resolves.toBe(
            '{"darkMode":false}',
        );
    });

    it('skips missing bundled files and same-directory runs', async () => {
        const bundledDir = await createTempDir();
        const targetDir = await createTempDir();

        await expect(seedPortableConfigs(bundledDir, targetDir, ['missing.json'])).resolves.toEqual(
            [],
        );
        await expect(seedPortableConfigs(bundledDir, bundledDir)).resolves.toEqual([]);
    });

    it('keeps the packaged config manifest explicit', () => {
        expect(PORTABLE_CONFIG_FILES).toEqual([
            'app.json',
            'api-debug.env.json',
            'project.json',
            'settings.json',
            'db.json',
            'param-suggest-rules.json',
            'kcbp.env.json',
        ]);
    });
});
