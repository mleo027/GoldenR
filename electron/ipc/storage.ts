import { ipcMain } from 'electron';
import { readJsonFileAt, writeJsonFileAt } from '../utils/jsonStorage';
import { resolveConfigPath } from '../config/configPaths';
import type { ElectronAppContext } from './types';

export function registerStorageIpc(ctx: ElectronAppContext): void {
    ipcMain.handle('readJsonFile', async (_event, filePath: string) => {
        const absPath = resolveConfigPath(filePath);
        return readJsonFileAt(absPath);
    });

    ipcMain.handle('writeJsonFile', async (_event, filePath: string, data: unknown) => {
        const absPath = resolveConfigPath(filePath);
        await writeJsonFileAt(absPath, data);
    });

    ipcMain.handle(
        'storage:flush',
        async (_event, payloads: { filePath: string; data: unknown }[]) => {
            for (const item of payloads) {
                const absPath = resolveConfigPath(item.filePath);
                await writeJsonFileAt(absPath, item.data);
            }
        },
    );

    ipcMain.handle('app:getUserDataDir', () => ctx.getConfigDir());
}
