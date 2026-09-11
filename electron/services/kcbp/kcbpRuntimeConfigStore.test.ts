import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigRepository } from '../../database/repositories/configRepository';
import {
    invalidateKcbpRuntimeConfigCache,
    loadKcbpRuntimeConfig,
    normalizeKcbpRuntimeConfig,
    saveKcbpRuntimeConfig,
    setKcbpRuntimeConfigRepository,
    setKcbpRuntimeConfigUserDataDir,
} from './kcbpRuntimeConfigStore';

function createRepository(stored: unknown = undefined) {
    const read = vi.fn(() => stored);
    const write = vi.fn();
    return { read, write, repository: { read, write } as unknown as ConfigRepository };
}

afterEach(() => {
    invalidateKcbpRuntimeConfigCache();
});

describe('kcbpRuntimeConfigStore', () => {
    it('falls back to defaults when the database has no stored config', async () => {
        const repo = createRepository(undefined);
        setKcbpRuntimeConfigRepository(repo.repository);

        await expect(loadKcbpRuntimeConfig()).resolves.toEqual({
            executable: '',
            workingDir: '',
            args: [],
        });
        expect(repo.read).toHaveBeenCalledWith('kcbp.env.json');
    });

    it('normalizes stored values and caches the result', async () => {
        const repo = createRepository({
            executable: '  C:/kcbp/kcbp.exe  ',
            workingDir: ' C:/kcbp ',
            args: [' --foo ', '', '  ', '--bar'],
        });
        setKcbpRuntimeConfigRepository(repo.repository);

        await expect(loadKcbpRuntimeConfig()).resolves.toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo', '--bar'],
        });
        await loadKcbpRuntimeConfig();
        expect(repo.read).toHaveBeenCalledTimes(1);
    });

    it('writes normalized config back through the repository', async () => {
        const repo = createRepository(undefined);
        setKcbpRuntimeConfigRepository(repo.repository);

        await expect(
            saveKcbpRuntimeConfig({
                executable: ' C:/kcbp/kcbp.exe ',
                workingDir: 'C:/kcbp',
                args: ['--foo'],
            }),
        ).resolves.toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo'],
        });
        expect(repo.write).toHaveBeenCalledWith('kcbp.env.json', {
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo'],
        });

        // The saved value becomes the cache, so a follow-up load skips the database.
        await expect(loadKcbpRuntimeConfig()).resolves.toMatchObject({
            executable: 'C:/kcbp/kcbp.exe',
        });
        expect(repo.read).not.toHaveBeenCalled();
    });

    it('leaves execution defaults intact for partial input', () => {
        expect(normalizeKcbpRuntimeConfig({ executable: ' C:/kcbp/kcbp.exe ' })).toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: '',
            args: [],
        });
        expect(normalizeKcbpRuntimeConfig()).toEqual({ executable: '', workingDir: '', args: [] });
    });

    it('detaches the database repository through the deprecated user-data shim', async () => {
        const repo = createRepository({ executable: 'C:/kcbp/kcbp.exe' });
        setKcbpRuntimeConfigRepository(repo.repository);
        await loadKcbpRuntimeConfig();

        setKcbpRuntimeConfigUserDataDir('C:/data');

        // Runtime configuration is database-backed, so the shim must not leave a
        // stale repository behind: saving without a database fails loudly.
        await expect(
            saveKcbpRuntimeConfig({ executable: '', workingDir: '', args: [] }),
        ).rejects.toThrow('Database has not been initialized');
    });
});
