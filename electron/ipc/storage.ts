import { ipcMain } from 'electron';
import { readJsonFileAt, writeJsonFileAt } from '../utils/jsonStorage';
import { resolveConfigPath } from '../config/configPaths';
import type { ElectronAppContext } from './types';

const MAX_CONFIG_FLUSH_BATCH = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isConfigWriteEntry(value: unknown): value is { filePath: string; data: unknown } {
    return isRecord(value) && typeof value.filePath === 'string';
}

export function registerStorageIpc(ctx: ElectronAppContext): void {
    ipcMain.handle('readJsonFile', async (_event, filePath: string) => {
        if (typeof filePath !== 'string') {
            throw new Error('Invalid config file path');
        }
        const absPath = resolveConfigPath(filePath);
        return readJsonFileAt(absPath);
    });

    ipcMain.handle('writeJsonFile', async (_event, filePath: string, data: unknown) => {
        if (typeof filePath !== 'string') {
            throw new Error('Invalid config file path');
        }
        const absPath = resolveConfigPath(filePath);
        await writeJsonFileAt(absPath, data);
    });

    ipcMain.handle('storage:flush', async (_event, payloads: unknown) => {
        if (!Array.isArray(payloads) || payloads.length > MAX_CONFIG_FLUSH_BATCH) {
            throw new Error('Invalid config flush payload');
        }
        if (!payloads.every(isConfigWriteEntry)) {
            throw new Error('Invalid config flush entry');
        }
        for (const item of payloads) {
            const absPath = resolveConfigPath(item.filePath);
            await writeJsonFileAt(absPath, item.data);
        }
    });

    ipcMain.handle('app:getUserDataDir', () => ctx.getConfigDir());
}
