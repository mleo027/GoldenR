import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigRepository } from '../../database/repositories/configRepository';
import {
    invalidateKcbpRuntimeConfigCache,
    loadKcbpRuntimeConfig,
    normalizeKcbpRuntimeConfig,
    saveKcbpRuntimeConfig,
    setKcbpRuntimeConfigRepository,
} from './kcbpRuntimeConfigStore';

function createRepository(stored: unknown = undefined) {
    const readKcbpRuntimeConfig = vi.fn(() => stored);
    const writeKcbpRuntimeConfig = vi.fn();
    return {
        readKcbpRuntimeConfig,
        writeKcbpRuntimeConfig,
        repository: {
            readKcbpRuntimeConfig,
            writeKcbpRuntimeConfig,
        } as unknown as ConfigRepository,
    };
}

afterEach(() => invalidateKcbpRuntimeConfigCache());

describe('kcbpRuntimeConfigStore', () => {
    it('falls back to defaults when no config is stored', async () => {
        const repo = createRepository();
        setKcbpRuntimeConfigRepository(repo.repository);
        await expect(loadKcbpRuntimeConfig()).resolves.toEqual({
            executable: '',
            workingDir: '',
            args: [],
        });
        expect(repo.readKcbpRuntimeConfig).toHaveBeenCalledTimes(1);
    });

    it('normalizes and caches stored values', async () => {
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
        expect(repo.readKcbpRuntimeConfig).toHaveBeenCalledTimes(1);
    });

    it('writes normalized config through the semantic repository API', async () => {
        const repo = createRepository();
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
        expect(repo.writeKcbpRuntimeConfig).toHaveBeenCalledWith({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo'],
        });
    });

    it('leaves defaults intact for partial input', () => {
        expect(normalizeKcbpRuntimeConfig({ executable: ' C:/kcbp/kcbp.exe ' })).toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: '',
            args: [],
        });
    });
});
