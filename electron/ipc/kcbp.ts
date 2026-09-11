import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { KcbpRequestOptions } from '../kcbp';
import { isKcbpCancelled } from '../services/kcbp/kcbp';
import {
    loadKcbpRuntimeConfig,
    saveKcbpRuntimeConfig,
    setKcbpRuntimeConfigRepository,
} from '../services/kcbp/kcbpRuntimeConfigStore';
import { KCBP_IPC_CANCELLED_RESULT } from '../../src/shared/kcbp/cancel';
import type { KcbpRuntimeConfig } from '../../src/shared/kcbp/types';
import type { TraceExecutionOptions } from '../../src/shared/kcbp/types';
import type { DbConnectionConfig } from '../../src/shared/suggest/types';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { withIpcError } from './errors';
import type { ElectronAppContext } from './types';

export function registerKcbpIpc(ctx: ElectronAppContext): void {
    setKcbpRuntimeConfigRepository(ctx.configRepository);

    ipcMain.handle(
        'rpc:call',
        withIpcError(async (_event, payload: KcbpRequestOptions) => {
            if (!payload || typeof payload !== 'object') {
                throw invalidIpcArgument('Invalid KCBP request payload');
            }
            try {
                return await ctx.kcbpClient.call(payload);
            } catch (error) {
                if (isKcbpCancelled(error)) {
                    return KCBP_IPC_CANCELLED_RESULT;
                }
                throw error;
            }
        }),
    );

    ipcMain.handle(
        'rpc:cancel',
        withIpcError(() => {
            return ctx.kcbpClient.cancel();
        }),
    );

    ipcMain.handle(
        'rpc:callWithTrace',
        withIpcError(
            async (
                _event,
                payload: KcbpRequestOptions,
                databaseConfig: DbConnectionConfig,
                options: TraceExecutionOptions,
            ) => {
                if (
                    !payload ||
                    typeof payload !== 'object' ||
                    !databaseConfig ||
                    typeof databaseConfig !== 'object' ||
                    !options ||
                    typeof options !== 'object'
                ) {
                    throw invalidIpcArgument('Invalid traced KCBP request');
                }
                try {
                    return await ctx.kcbpClient.callWithTrace(payload, databaseConfig, options);
                } catch (error) {
                    if (isKcbpCancelled(error)) return KCBP_IPC_CANCELLED_RESULT;
                    throw error;
                }
            },
        ),
    );

    ipcMain.handle(
        'kcbpRuntime:getConfig',
        withIpcError(async () => loadKcbpRuntimeConfig()),
    );

    ipcMain.handle(
        'kcbpRuntime:saveConfig',
        withIpcError(async (_event, config: KcbpRuntimeConfig) => {
            if (!config || typeof config !== 'object') {
                throw invalidIpcArgument('Invalid KCBP runtime config');
            }
            return saveKcbpRuntimeConfig(config);
        }),
    );

    ipcMain.handle(
        'kcbpRuntime:pickDirectory',
        withIpcError(async (_event, defaultPath?: string) => {
            if (defaultPath != null && typeof defaultPath !== 'string') {
                throw invalidIpcArgument('Invalid default directory path');
            }
            const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
            const result = await dialog.showOpenDialog(win, {
                properties: ['openDirectory'],
                defaultPath: defaultPath || undefined,
            });
            if (result.canceled || result.filePaths.length === 0) {
                return { canceled: true as const };
            }
            return { canceled: false as const, path: result.filePaths[0] };
        }),
    );

    ipcMain.handle(
        'kcbpRuntime:pickFile',
        withIpcError(async (_event, defaultPath?: string) => {
            if (defaultPath != null && typeof defaultPath !== 'string') {
                throw invalidIpcArgument('Invalid default file path');
            }
            const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
            const result = await dialog.showOpenDialog(win, {
                properties: ['openFile'],
                defaultPath: defaultPath || undefined,
            });
            if (result.canceled || result.filePaths.length === 0) {
                return { canceled: true as const };
            }
            return { canceled: false as const, path: result.filePaths[0] };
        }),
    );
}
