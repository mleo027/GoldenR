import { afterEach, describe, expect, it, vi } from 'vitest';
import { configStorage } from './configStorage';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('configStorage', () => {
    it('returns null when the Electron bridge is unavailable', async () => {
        await expect(configStorage.readAppEnv()).resolves.toBeNull();
    });

    it('rethrows read failures instead of treating them as missing files', async () => {
        const readAppEnv = vi.fn().mockRejectedValue(new Error('database read failed'));
        vi.stubGlobal('window', {
            electronAPI: {
                config: {
                    readAppEnv,
                },
            },
        });

        await expect(configStorage.readAppEnv()).rejects.toThrow('database read failed');
        expect(readAppEnv).toHaveBeenCalledTimes(1);
    });
});
