import { contextBridge, ipcRenderer } from 'electron';
import { isKcbpIpcCancelledResult, KCBP_CANCELLED_MESSAGE } from '../src/shared/kcbp/cancel';
import { parseIpcError } from '../src/shared/ipc/errors';
import type { ImportFileFormat } from '../src/shared/electron/api';
import type { KcbpRequestOptions, KcbpResponseData } from '../src/shared/kcbp/types';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbScriptQueryResponse,
    DbSuggestRequest,
    DbSuggestResponse,
    DbTestConnectionResult,
} from '../src/shared/suggest/types';

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    try {
        return (await ipcRenderer.invoke(channel, ...args)) as T;
    } catch (error) {
        const payload = parseIpcError(error);
        if (payload) {
            const apiError = new Error(payload.message) as Error & { code?: string };
            apiError.code = payload.code;
            throw apiError;
        }
        throw error;
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    config: {
        readAppEnv: () => invoke<unknown>('storage:readAppEnv'),
        writeAppEnv: (data: unknown) => invoke<void>('storage:writeAppEnv', data),
        readWorkspace: () => invoke<unknown>('storage:readWorkspace'),
        writeWorkspace: (data: unknown) => invoke<void>('storage:writeWorkspace', data),
        readProjects: () => invoke<unknown>('storage:readProjects'),
        writeProjects: (data: unknown) => invoke<void>('storage:writeProjects', data),
        readCommonParams: () => invoke<unknown>('storage:readCommonParams'),
        writeCommonParams: (data: unknown) => invoke<void>('storage:writeCommonParams', data),
        readApiDebugEnvironments: () => invoke<unknown>('storage:readApiDebugEnvironments'),
        writeApiDebugEnvironments: (data: unknown) =>
            invoke<void>('storage:writeApiDebugEnvironments', data),
        readDbConnection: () => invoke<unknown>('storage:readDbConnection'),
        writeDbConnection: (data: unknown) => invoke<void>('storage:writeDbConnection', data),
        readParamSuggestRules: () => invoke<unknown>('storage:readParamSuggestRules'),
        writeParamSuggestRules: (data: unknown) =>
            invoke<void>('storage:writeParamSuggestRules', data),
        readKcbpRuntimeConfig: () => invoke<unknown>('storage:readKcbpRuntimeConfig'),
        writeKcbpRuntimeConfig: (data: unknown) =>
            invoke<void>('storage:writeKcbpRuntimeConfig', data),
        readRequestHistory: () => invoke<unknown>('storage:readRequestHistory'),
        writeRequestHistory: (data: unknown) => invoke<void>('storage:writeRequestHistory', data),
    },
    kcbp: {
        call: async (payload: KcbpRequestOptions): Promise<KcbpResponseData> => {
            const result: unknown = await invoke<unknown>('rpc:call', payload);
            if (isKcbpIpcCancelledResult(result)) {
                throw new Error(KCBP_CANCELLED_MESSAGE);
            }
            return result as KcbpResponseData;
        },
        callWithTrace: async (
            payload: KcbpRequestOptions,
            databaseConfig: DbConnectionConfig,
            options: import('../src/shared/kcbp/types').TraceExecutionOptions,
        ): Promise<KcbpResponseData> => {
            const result: unknown = await invoke<unknown>(
                'rpc:callWithTrace',
                payload,
                databaseConfig,
                options,
            );
            if (isKcbpIpcCancelledResult(result)) throw new Error(KCBP_CANCELLED_MESSAGE);
            return result as KcbpResponseData;
        },
        cancel: (): Promise<boolean> => invoke<boolean>('rpc:cancel'),
        runtime: {
            getConfig: (): Promise<import('../src/shared/kcbp/types').KcbpRuntimeConfig> =>
                invoke<import('../src/shared/kcbp/types').KcbpRuntimeConfig>(
                    'kcbpRuntime:getConfig',
                ),
            saveConfig: (
                config: import('../src/shared/kcbp/types').KcbpRuntimeConfig,
            ): Promise<import('../src/shared/kcbp/types').KcbpRuntimeConfig> =>
                invoke<import('../src/shared/kcbp/types').KcbpRuntimeConfig>(
                    'kcbpRuntime:saveConfig',
                    config,
                ),
            pickDirectory: (
                defaultPath?: string,
            ): Promise<import('../src/shared/kcbp/types').KcbpPickPathResult> =>
                invoke<import('../src/shared/kcbp/types').KcbpPickPathResult>(
                    'kcbpRuntime:pickDirectory',
                    defaultPath,
                ),
            pickFile: (
                defaultPath?: string,
            ): Promise<import('../src/shared/kcbp/types').KcbpPickPathResult> =>
                invoke<import('../src/shared/kcbp/types').KcbpPickPathResult>(
                    'kcbpRuntime:pickFile',
                    defaultPath,
                ),
        },
    },
    database: {
        testConnection: (config: DbConnectionConfig): Promise<DbTestConnectionResult> =>
            invoke('db:testConnection', config),
        suggest: (request: DbSuggestRequest): Promise<DbSuggestResponse> =>
            invoke('db:suggest', request),
        queryScript: (request: DbScriptQueryRequest): Promise<DbScriptQueryResponse> =>
            invoke('db:query', request),
        reloadSuggestConfig: (): Promise<void> => invoke('db:reloadConfig'),
    },
    importExport: {
        saveJson: (content: string, defaultFilename: string) =>
            invoke('export:saveJson', { content, defaultFilename }),
        saveCsv: (content: string, defaultFilename: string) =>
            invoke('export:saveCsv', { content, defaultFilename }),
        saveTxt: (content: string, defaultFilename: string) =>
            invoke('export:saveTxt', { content, defaultFilename }),
        saveHtml: (content: string, defaultFilename: string) =>
            invoke('export:saveHtml', { content, defaultFilename }),
        saveIni: (content: string, defaultFilename: string) =>
            invoke('export:saveIni', { content, defaultFilename }),
        openImportFile: (format: ImportFileFormat) => invoke('import:openFile', format),
        openParamFile: () => invoke('param:openFile'),
        statParamFile: (filePath: string) => invoke('param:statFile', filePath),
    },
    window: {
        minimize: () => invoke('window:minimize'),
        toggleMaximize: (): Promise<boolean> => invoke('window:toggleMaximize'),
        isMaximized: (): Promise<boolean> => invoke('window:isMaximized'),
        onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) =>
                callback(isMaximized);
            ipcRenderer.on('window:maximized-changed', handler);
            return () => ipcRenderer.removeListener('window:maximized-changed', handler);
        },
    },
    app: {
        getUserDataDir: (): Promise<string> => invoke('app:getUserDataDir'),
        onFlushStorage: (callback: () => void | Promise<void>) => {
            const handler = (_event: Electron.IpcRendererEvent, requestId: string) => {
                void Promise.resolve(callback())
                    .then(() => {
                        ipcRenderer.send('app:flush-storage-complete', requestId);
                    })
                    .catch((error: unknown) => {
                        const message = error instanceof Error ? error.message : String(error);
                        ipcRenderer.send('app:flush-storage-complete', requestId, message);
                    });
            };
            ipcRenderer.on('app:flush-storage', handler);
            return () => ipcRenderer.removeListener('app:flush-storage', handler);
        },
    },
});
