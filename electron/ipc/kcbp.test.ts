import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    focusedWindow: {},
    getFocusedWindow: vi.fn(() => mock.focusedWindow),
    getAllWindows: vi.fn(() => [mock.focusedWindow]),
    showOpenDialog: vi.fn(async () => ({
        canceled: false,
        filePaths: ['C:/kcbp'],
    })),
    isKcbpCancelled: vi.fn(() => false),
    loadKcbpRuntimeConfig: vi.fn(async () => ({
        executable: '',
        workingDir: '',
        args: [],
    })),
    saveKcbpRuntimeConfig: vi.fn(async (config: unknown) => config),
    setKcbpRuntimeConfigUserDataDir: vi.fn(),
}));

vi.mock('electron', () => ({
    BrowserWindow: {
        getFocusedWindow: mock.getFocusedWindow,
        getAllWindows: mock.getAllWindows,
    },
    dialog: {
        showOpenDialog: mock.showOpenDialog,
    },
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
            mock.handlers.set(channel, handler);
        },
    },
}));

vi.mock('../services/kcbp/kcbp', () => ({
    isKcbpCancelled: mock.isKcbpCancelled,
}));

vi.mock('../services/kcbp/kcbpRuntimeConfigStore', () => ({
    loadKcbpRuntimeConfig: mock.loadKcbpRuntimeConfig,
    saveKcbpRuntimeConfig: mock.saveKcbpRuntimeConfig,
    setKcbpRuntimeConfigUserDataDir: mock.setKcbpRuntimeConfigUserDataDir,
}));

import { registerKcbpIpc } from './kcbp';

const kcbpClient = {
    call: vi.fn(async () => ({
        code: '0',
        msg: 'ok',
        data: [],
        stats: { timecost: 1, rows: 0 },
    })),
    cancel: vi.fn(async () => true),
};

const ctx = {
    kcbpClient,
    getAppRootDir: () => 'C:/data',
    getConfigDir: () => 'C:/data',
    getLegacyDataDir: () => 'C:/data',
    getApiServerUserDataDir: () => 'C:/data',
} as unknown as Parameters<typeof registerKcbpIpc>[0];

async function invoke(channel: string, ...args: unknown[]) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler({}, ...args);
}

describe('KCBP IPC handlers', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.isKcbpCancelled.mockClear();
        mock.loadKcbpRuntimeConfig.mockClear();
        mock.saveKcbpRuntimeConfig.mockClear();
        mock.setKcbpRuntimeConfigUserDataDir.mockClear();
        mock.showOpenDialog.mockClear();
        registerKcbpIpc(ctx);
    });

    it('calls and cancels the KCBP client', async () => {
        const result = await invoke('rpc:call', {
            connection: {},
            param: { msgtype: '150501' },
        });
        expect(result).toMatchObject({ code: '0' });
        expect(kcbpClient.call).toHaveBeenCalledTimes(1);

        expect(await invoke('rpc:cancel')).toBe(true);
        expect(kcbpClient.cancel).toHaveBeenCalledTimes(1);
    });

    it('loads and saves runtime config', async () => {
        await invoke('kcbpRuntime:getConfig');
        expect(mock.loadKcbpRuntimeConfig).toHaveBeenCalledTimes(1);

        const config = { executable: 'cli.exe', workingDir: 'C:/run', args: ['-a'] };
        await invoke('kcbpRuntime:saveConfig', config);
        expect(mock.saveKcbpRuntimeConfig).toHaveBeenCalledWith(config);
    });

    it('picks directories and rejects invalid request payloads', async () => {
        const picked = await invoke('kcbpRuntime:pickDirectory');
        expect(picked).toEqual({ canceled: false, path: 'C:/kcbp' });

        await expect(invoke('rpc:call', null)).rejects.toThrow();
    });
});
