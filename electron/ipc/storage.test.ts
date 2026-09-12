import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    readProjects: vi.fn(async () => ({ projects: [] })),
    writeProjects: vi.fn(),
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
        readProjects: mock.readProjects,
        writeProjects: mock.writeProjects,
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
        mock.readProjects.mockClear();
        mock.writeProjects.mockClear();
        registerStorageIpc(ctx);
    });

    it('reads and writes named storage domains through the repository', async () => {
        await expect(invoke('storage:readProjects', {})).resolves.toEqual({
            projects: [],
        });
        expect(mock.readProjects).toHaveBeenCalledTimes(1);

        await invoke('storage:writeProjects', {}, { projects: [] });
        expect(mock.writeProjects).toHaveBeenCalledWith({ projects: [] });
    });

    it('exposes the user data directory', async () => {
        await expect(invoke('app:getUserDataDir', {})).resolves.toBe('C:/data');
    });
});
