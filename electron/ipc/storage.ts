import { ipcMain } from 'electron';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { withIpcError } from './errors';
import type { ElectronAppContext } from './types';
import { assertConfigStorageFileName } from '../../src/shared/config/files';

export function registerStorageIpc(ctx: ElectronAppContext): void {
    ipcMain.handle(
        'database:read',
        withIpcError(async (_event, filePath: string) => {
            if (typeof filePath !== 'string') {
                throw invalidIpcArgument('Invalid config file path');
            }
            return ctx.configRepository.read(assertConfigStorageFileName(filePath));
        }),
    );
    ipcMain.handle(
        'database:write',
        withIpcError(async (_event, filePath: string, data: unknown) => {
            if (typeof filePath !== 'string') throw invalidIpcArgument('Invalid config file path');
            ctx.configRepository.write(assertConfigStorageFileName(filePath), data);
        }),
    );
    ipcMain.handle(
        'database:flush',
        withIpcError(() => ctx.configRepository.flush()),
    );

    ipcMain.handle(
        'app:getUserDataDir',
        withIpcError(() => ctx.getConfigDir()),
    );
}
