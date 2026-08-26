import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    win: {},
    fromWebContents: vi.fn(() => mock.win),
    showOpenDialog: vi.fn(async () => ({
        canceled: false,
        filePaths: ['C:/data/import.json'],
    })),
    showSaveDialog: vi.fn(async () => ({
        canceled: false,
        filePath: 'C:/data/out.csv',
    })),
    readFile: vi.fn(async () => JSON.stringify({ cases: [] })),
    stat: vi.fn(async () => ({ size: 123, isFile: () => true })),
    writeFile: vi.fn(async () => undefined),
    decodeIniBuffer: vi.fn((buffer: Uint8Array) => Buffer.from(buffer).toString('utf8')),
}));

vi.mock('electron', () => ({
    BrowserWindow: {
        fromWebContents: mock.fromWebContents,
    },
    dialog: {
        showOpenDialog: mock.showOpenDialog,
        showSaveDialog: mock.showSaveDialog,
    },
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
            mock.handlers.set(channel, handler);
        },
    },
}));

vi.mock('node:fs/promises', () => ({
    readFile: mock.readFile,
    stat: mock.stat,
    writeFile: mock.writeFile,
}));

vi.mock('../readIniText', () => ({
    decodeIniBuffer: mock.decodeIniBuffer,
}));

import { registerImportExportIpc } from './importExport';

async function invoke(channel: string, ...args: unknown[]) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler({}, ...args);
}

describe('import/export IPC handlers', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.fromWebContents.mockClear();
        mock.showOpenDialog.mockClear();
        mock.showSaveDialog.mockClear();
        mock.readFile.mockClear();
        mock.stat.mockClear();
        mock.writeFile.mockClear();
        registerImportExportIpc();
    });

    it('opens and parses a JSON import file', async () => {
        const result = await invoke('import:openFile', 'json');
        expect(result).toMatchObject({
            opened: true,
            format: 'json',
            data: { cases: [] },
        });
        expect(mock.showOpenDialog).toHaveBeenCalledTimes(1);
    });

    it('stats a user-selected parameter file', async () => {
        const result = await invoke('param:openFile');
        expect(result).toEqual({
            opened: true,
            filePath: 'C:/data/import.json',
            size: 123,
        });
    });

    it('saves CSV and HTML exports', async () => {
        const csv = await invoke('export:saveCsv', {
            content: 'a,b',
            defaultFilename: 'out.csv',
        });
        expect(csv).toEqual({ saved: true, filePath: 'C:/data/out.csv' });
        expect(mock.writeFile).toHaveBeenCalledWith('C:/data/out.csv', 'a,b', 'utf-8');

        mock.showSaveDialog.mockResolvedValueOnce({
            canceled: false,
            filePath: 'C:/data/out.html',
        });
        const html = await invoke('export:saveHtml', {
            content: '<html></html>',
            defaultFilename: 'out',
        });
        expect(html).toEqual({ saved: true, filePath: 'C:/data/out.html' });

        mock.showSaveDialog.mockResolvedValueOnce({
            canceled: false,
            filePath: 'C:/data/out.ini',
        });
        const ini = await invoke('export:saveIni', {
            content: '[连接参数]\nIPAddress=127.0.0.1',
            defaultFilename: 'out',
        });
        expect(ini).toEqual({ saved: true, filePath: 'C:/data/out.ini' });
    });

    it('rejects invalid import formats and export payloads', async () => {
        await expect(invoke('import:openFile', 'xml')).rejects.toThrow();
        await expect(invoke('export:saveCsv', { content: 1 })).rejects.toThrow();
        await expect(invoke('export:saveIni', { content: 1 })).rejects.toThrow();
    });

    it('saves TXT exports through export:saveTxt', async () => {
        mock.showSaveDialog.mockResolvedValueOnce({
            canceled: false,
            filePath: 'C:/data/out.txt',
        });
        const txt = await invoke('export:saveTxt', {
            content: 'a  b\n1  2',
            defaultFilename: 'out',
        });
        expect(txt).toEqual({ saved: true, filePath: 'C:/data/out.txt' });
        expect(mock.writeFile).toHaveBeenCalledWith('C:/data/out.txt', 'a  b\n1  2', 'utf-8');

        mock.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: '' });
        await expect(
            invoke('export:saveTxt', { content: 'x', defaultFilename: 'out.txt' }),
        ).resolves.toEqual({ saved: false });
        await expect(invoke('export:saveTxt', { content: 1 })).rejects.toThrow();
    });

    it('reports a friendly error for malformed import JSON', async () => {
        mock.readFile.mockResolvedValueOnce('{ not json');
        const result = (await invoke('import:openFile', 'json')) as {
            opened: boolean;
            error?: string;
        };
        expect(result.opened).toBe(false);
        expect(result.error).toContain('JSON 解析失败');
    });
});
