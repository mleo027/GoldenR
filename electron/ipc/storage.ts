import { ipcMain } from 'electron';
import { withIpcError } from './errors';
import type { ElectronAppContext } from './types';

export function registerStorageIpc(ctx: ElectronAppContext): void {
    const read = (callback: () => unknown) =>
        withIpcError((event: unknown) => {
            void event;
            return callback();
        });
    const write = (callback: (data: unknown) => void) =>
        withIpcError((_event: unknown, data: unknown) => callback(data));
    ipcMain.handle(
        'storage:readAppEnv',
        read(() => ctx.configRepository.readAppEnv()),
    );
    ipcMain.handle(
        'storage:writeAppEnv',
        write((data) => ctx.configRepository.writeAppEnv(data)),
    );
    ipcMain.handle(
        'storage:readWorkspace',
        read(() => ctx.configRepository.readWorkspace()),
    );
    ipcMain.handle(
        'storage:writeWorkspace',
        write((data) => ctx.configRepository.writeWorkspace(data)),
    );
    ipcMain.handle(
        'storage:readProjects',
        read(() => ctx.configRepository.readProjects()),
    );
    ipcMain.handle(
        'storage:writeProjects',
        write((data) => ctx.configRepository.writeProjects(data)),
    );
    ipcMain.handle(
        'storage:readCommonParams',
        read(() => ctx.configRepository.readCommonParams()),
    );
    ipcMain.handle(
        'storage:writeCommonParams',
        write((data) => ctx.configRepository.writeCommonParams(data)),
    );
    ipcMain.handle(
        'storage:readApiDebugEnvironments',
        read(() => ctx.configRepository.readApiDebugEnvironments()),
    );
    ipcMain.handle(
        'storage:writeApiDebugEnvironments',
        write((data) => ctx.configRepository.writeApiDebugEnvironments(data)),
    );
    ipcMain.handle(
        'storage:readDbConnection',
        read(() => ctx.configRepository.readDbConnection()),
    );
    ipcMain.handle(
        'storage:writeDbConnection',
        write((data) => ctx.configRepository.writeDbConnection(data)),
    );
    ipcMain.handle(
        'storage:readParamSuggestRules',
        read(() => ctx.configRepository.readParamSuggestRules()),
    );
    ipcMain.handle(
        'storage:writeParamSuggestRules',
        write((data) => ctx.configRepository.writeParamSuggestRules(data)),
    );
    ipcMain.handle(
        'storage:readKcbpRuntimeConfig',
        read(() => ctx.configRepository.readKcbpRuntimeConfig()),
    );
    ipcMain.handle(
        'storage:writeKcbpRuntimeConfig',
        write((data) => ctx.configRepository.writeKcbpRuntimeConfig(data)),
    );
    ipcMain.handle(
        'storage:readRequestHistory',
        read(() => ctx.configRepository.readRequestHistory()),
    );
    ipcMain.handle(
        'storage:writeRequestHistory',
        write((data) => ctx.configRepository.writeRequestHistory(data)),
    );
    ipcMain.handle(
        'app:getUserDataDir',
        withIpcError(() => ctx.getConfigDir()),
    );
}
