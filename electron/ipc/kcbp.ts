import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { KcbpRequestOptions } from '../kcbp';
import { isKcbpCancelled } from '../services/kcbp/kcbp';
import {
    loadKcbpRuntimeConfig,
    saveKcbpRuntimeConfig,
    setKcbpRuntimeConfigUserDataDir,
} from '../services/kcbp/kcbpRuntimeConfigStore';
import { KCBP_IPC_CANCELLED_RESULT } from '../../src/shared/kcbp/cancel';
import type { KcbpRuntimeConfig } from '../../src/shared/kcbp/types';
import type { ElectronAppContext } from './types';

export function registerKcbpIpc(ctx: ElectronAppContext): void {
    setKcbpRuntimeConfigUserDataDir(ctx.getApiServerUserDataDir());

    ipcMain.handle('rpc:call', async (_event, payload: KcbpRequestOptions) => {
        try {
            return await ctx.kcbpClient.call(payload);
        } catch (error) {
            if (isKcbpCancelled(error)) {
                return KCBP_IPC_CANCELLED_RESULT;
            }
            throw error;
        }
    });

    ipcMain.handle('rpc:cancel', () => {
        return ctx.kcbpClient.cancel();
    });

    ipcMain.handle('kcbpRuntime:getConfig', async () => loadKcbpRuntimeConfig());

    ipcMain.handle('kcbpRuntime:saveConfig', async (_event, config: KcbpRuntimeConfig) =>
        saveKcbpRuntimeConfig(config),
    );

    ipcMain.handle('kcbpRuntime:pickDirectory', async (_event, defaultPath?: string) => {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
            defaultPath: defaultPath || undefined,
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true as const };
        }
        return { canceled: false as const, path: result.filePaths[0] };
    });

    ipcMain.handle('kcbpRuntime:pickFile', async (_event, defaultPath?: string) => {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            defaultPath: defaultPath || undefined,
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true as const };
        }
        return { canceled: false as const, path: result.filePaths[0] };
    });
}
