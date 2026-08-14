import { ipcMain } from 'electron';
import { readJsonFileAt, resolveJsonPath, writeJsonFileAt } from '../utils/jsonStorage';
import type { ElectronAppContext } from './types';

export function registerStorageIpc(ctx: ElectronAppContext): void {
    ipcMain.handle('readJsonFile', async (_event, filePath: string, fromUserData = false) => {
        const absPath = resolveJsonPath(
            filePath,
            ctx.getAppRootDir,
            ctx.getLegacyDataDir,
            fromUserData,
        );
        return readJsonFileAt(absPath);
    });

    ipcMain.handle('writeJsonFile', async (_event, filePath: string, data: unknown) => {
        const absPath = resolveJsonPath(filePath, ctx.getAppRootDir, ctx.getLegacyDataDir, false);
        await writeJsonFileAt(absPath, data);
    });

    ipcMain.handle(
        'storage:flush',
        async (_event, payloads: { filePath: string; data: unknown }[]) => {
            for (const item of payloads) {
                const absPath = resolveJsonPath(
                    item.filePath,
                    ctx.getAppRootDir,
                    ctx.getLegacyDataDir,
                    false,
                );
                await writeJsonFileAt(absPath, item.data);
            }
        },
    );

    ipcMain.handle('app:getUserDataDir', () => ctx.getLegacyDataDir());
}
