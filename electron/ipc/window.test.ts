import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    win: {
        minimize: vi.fn(),
        isMaximized: vi.fn(() => false),
        unmaximize: vi.fn(),
        maximize: vi.fn(),
    },
    fromWebContents: vi.fn(),
}));

vi.mock('electron', () => ({
    BrowserWindow: {
        fromWebContents: mock.fromWebContents,
    },
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
            mock.handlers.set(channel, handler);
        },
    },
}));

import { registerWindowIpc } from './window';

async function invoke(channel: string, event = { sender: {} }) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler(event);
}

describe('window IPC handlers', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.fromWebContents.mockReset();
        mock.fromWebContents.mockReturnValue(mock.win);
        mock.win.minimize.mockClear();
        mock.win.isMaximized.mockClear();
        mock.win.unmaximize.mockClear();
        mock.win.maximize.mockClear();
        registerWindowIpc();
    });

    it('minimizes the sender window', async () => {
        await invoke('window:minimize');
        expect(mock.win.minimize).toHaveBeenCalledTimes(1);
    });

    it('toggles maximize state', async () => {
        mock.win.isMaximized.mockReturnValueOnce(false).mockReturnValueOnce(true);
        expect(await invoke('window:toggleMaximize')).toBe(true);
        expect(mock.win.maximize).toHaveBeenCalledTimes(1);

        mock.win.isMaximized.mockReturnValueOnce(true).mockReturnValueOnce(false);
        expect(await invoke('window:toggleMaximize')).toBe(false);
        expect(mock.win.unmaximize).toHaveBeenCalledTimes(1);
    });

    it('returns maximized state and handles missing window', async () => {
        mock.fromWebContents.mockReturnValue(undefined);
        expect(await invoke('window:isMaximized')).toBe(false);
    });
});
