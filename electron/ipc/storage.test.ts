import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    read: vi.fn(async () => ({ projects: [] })),
    write: vi.fn(),
    flush: vi.fn(),
}));

vi.mock('electron', () => ({
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
            mock.handlers.set(channel, handler);
        },
    },
}));

import { registerStorageIpc } from './storage';

const ctx = {
    configRepository: {
        read: mock.read,
        write: mock.write,
        flush: mock.flush,
    },
    getConfigDir: () => 'C:/data',
} as never;

async function invoke(channel: string, ...args: unknown[]) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler(...args);
}

describe('storage IPC handlers', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.read.mockClear();
        mock.write.mockClear();
        mock.flush.mockClear();
        registerStorageIpc(ctx);
    });

    it('reads and writes allowlisted config files through the repository', async () => {
        await expect(invoke('database:read', {}, 'project.json')).resolves.toEqual({
            projects: [],
        });
        expect(mock.read).toHaveBeenCalledWith('project.json');

        await invoke('database:write', {}, 'project.json', { projects: [] });
        expect(mock.write).toHaveBeenCalledWith('project.json', { projects: [] });
    });

    it('flushes pending writes', async () => {
        await invoke('database:flush', {});
        expect(mock.flush).toHaveBeenCalledTimes(1);
    });

    it('rejects non-string and non-allowlisted file names', async () => {
        await expect(invoke('database:read', {}, 42)).rejects.toThrow();
        await expect(invoke('database:read', {}, 'service-account.json')).rejects.toThrow();
        await expect(invoke('database:write', {}, '../escape.json', {})).rejects.toThrow();
        expect(mock.read).not.toHaveBeenCalled();
        expect(mock.write).not.toHaveBeenCalled();
    });

    it('exposes the user data directory', async () => {
        await expect(invoke('app:getUserDataDir', {})).resolves.toBe('C:/data');
    });
});
