import { afterEach, describe, expect, it, vi } from 'vitest';
import { configStorage } from './configStorage';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('configStorage', () => {
    it('returns null when the Electron bridge is unavailable', async () => {
        await expect(configStorage.read('app.json')).resolves.toBeNull();
    });

    it('rethrows read failures instead of treating them as missing files', async () => {
        const read = vi.fn().mockRejectedValue(new Error('disk read failed'));
        vi.stubGlobal('window', {
            electronAPI: {
                config: {
                    read,
                    write: vi.fn(),
                },
            },
        });

        await expect(configStorage.read('app.json')).rejects.toThrow('disk read failed');
        expect(read).toHaveBeenCalledWith('app.json');
    });
});
