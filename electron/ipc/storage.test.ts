import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    readJsonFileAt: vi.fn(async () => ({ value: 1 })),
    writeJsonFileAt: vi.fn(async () => undefined),
}));

vi.mock('electron', () => ({
    app: {
        isPackaged: false,
        getPath: () => process.cwd(),
    },
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
            mock.handlers.set(channel, handler);
        },
    },
}));

vi.mock('../utils/jsonStorage', () => ({
    readJsonFileAt: mock.readJsonFileAt,
    writeJsonFileAt: mock.writeJsonFileAt,
}));

import { registerStorageIpc } from './storage';

const ctx = {
    getConfigDir: () => process.cwd(),
} as never;

async function invoke(channel: string, ...args: unknown[]) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler(...args);
}

describe('storage IPC handlers', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.readJsonFileAt.mockClear();
        mock.writeJsonFileAt.mockClear();
        registerStorageIpc(ctx);
    });

    it('reads and writes allowlisted config files', async () => {
        const readResult = await invoke('readJsonFile', {}, 'project.json');
        expect(readResult).toEqual({ value: 1 });
        expect(mock.readJsonFileAt).toHaveBeenCalledTimes(1);

        await invoke('readJsonFile', {}, 'project.json', true);
        expect(mock.readJsonFileAt).toHaveBeenCalledTimes(2);

        await invoke('writeJsonFile', {}, 'project.json', { projects: [] });
        expect(mock.writeJsonFileAt).toHaveBeenCalledWith(expect.stringContaining('project.json'), {
            projects: [],
        });
    });

    it('flushes a bounded batch of write entries', async () => {
        await invoke('storage:flush', {}, [
            { filePath: 'project.json', data: { a: 1 } },
            { filePath: 'settings.json', data: { b: 2 } },
        ]);
        expect(mock.writeJsonFileAt).toHaveBeenCalledTimes(2);
    });

    it('rejects invalid paths and malformed flush payloads', async () => {
        await expect(invoke('readJsonFile', 'C:\\tmp\\project.json')).rejects.toThrow();
        await expect(invoke('storage:flush', [{}])).rejects.toThrow();
        await expect(
            invoke(
                'storage:flush',
                Array.from({ length: 65 }, () => ({})),
            ),
        ).rejects.toThrow();
    });
});
