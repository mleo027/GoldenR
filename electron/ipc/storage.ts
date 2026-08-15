import { ipcMain } from 'electron';
import { readJsonFileAt, writeJsonFileAt } from '../utils/jsonStorage';
import { resolveConfigPath } from '../config/configPaths';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { withIpcError } from './errors';
import type { ElectronAppContext } from './types';

const MAX_CONFIG_FLUSH_BATCH = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isConfigWriteEntry(value: unknown): value is { filePath: string; data: unknown } {
    return isRecord(value) && typeof value.filePath === 'string';
}

export function registerStorageIpc(ctx: ElectronAppContext): void {
    ipcMain.handle(
        'readJsonFile',
        withIpcError(async (_event, filePath: string, fromUserData?: boolean) => {
            if (typeof filePath !== 'string') {
                throw invalidIpcArgument('Invalid config file path');
            }
            if (fromUserData !== undefined && typeof fromUserData !== 'boolean') {
                throw invalidIpcArgument('Invalid config storage location');
            }
            const absPath = resolveConfigPath(filePath, fromUserData);
            return readJsonFileAt(absPath);
        }),
    );

    ipcMain.handle(
        'writeJsonFile',
        withIpcError(async (_event, filePath: string, data: unknown) => {
            if (typeof filePath !== 'string') {
                throw invalidIpcArgument('Invalid config file path');
            }
            const absPath = resolveConfigPath(filePath);
            await writeJsonFileAt(absPath, data);
        }),
    );

    ipcMain.handle(
        'storage:flush',
        withIpcError(async (_event, payloads: unknown) => {
            if (!Array.isArray(payloads) || payloads.length > MAX_CONFIG_FLUSH_BATCH) {
                throw invalidIpcArgument('Invalid config flush payload');
            }
            if (!payloads.every(isConfigWriteEntry)) {
                throw invalidIpcArgument('Invalid config flush entry');
            }
            for (const item of payloads) {
                const absPath = resolveConfigPath(item.filePath);
                await writeJsonFileAt(absPath, item.data);
            }
        }),
    );

    ipcMain.handle('app:getUserDataDir', () => ctx.getConfigDir());
}
