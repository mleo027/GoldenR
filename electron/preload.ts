import { contextBridge, ipcRenderer } from 'electron';
import type { KcbpRequestOptions, KcbpResponseData } from './kcbp';
import { isKcbpIpcCancelledResult, KCBP_CANCELLED_MESSAGE } from '../src/shared/kcbp/cancel';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbScriptQueryResponse,
    DbSuggestRequest,
    DbSuggestResponse,
    DbTestConnectionResult,
} from '../src/shared/suggest/types';

contextBridge.exposeInMainWorld('electronAPI', {
    readJsonFile: (filePath: string, fromUserData?: boolean) =>
        ipcRenderer.invoke('readJsonFile', filePath, fromUserData),
    writeJsonFile: (filePath: string, data: unknown) =>
        ipcRenderer.invoke('writeJsonFile', filePath, data),
    callKcbp: async (payload: KcbpRequestOptions): Promise<KcbpResponseData> => {
        const result: unknown = await ipcRenderer.invoke('rpc:call', payload);
        if (isKcbpIpcCancelledResult(result)) {
            throw new Error(KCBP_CANCELLED_MESSAGE);
        }
        return result as KcbpResponseData;
    },
    cancelKcbp: (): Promise<boolean> => ipcRenderer.invoke('rpc:cancel'),
    kcbpRuntime: {
        getConfig: (): Promise<import('../src/shared/kcbp/types').KcbpRuntimeConfig> =>
            ipcRenderer.invoke('kcbpRuntime:getConfig'),
        saveConfig: (
            config: import('../src/shared/kcbp/types').KcbpRuntimeConfig,
        ): Promise<import('../src/shared/kcbp/types').KcbpRuntimeConfig> =>
            ipcRenderer.invoke('kcbpRuntime:saveConfig', config),
        pickDirectory: (
            defaultPath?: string,
        ): Promise<import('../src/shared/kcbp/types').KcbpPickPathResult> =>
            ipcRenderer.invoke('kcbpRuntime:pickDirectory', defaultPath),
        pickFile: (
            defaultPath?: string,
        ): Promise<import('../src/shared/kcbp/types').KcbpPickPathResult> =>
            ipcRenderer.invoke('kcbpRuntime:pickFile', defaultPath),
    },
    saveCsvFile: (content: string, defaultFilename: string) =>
        ipcRenderer.invoke('export:saveCsv', { content, defaultFilename }),
    saveHtmlFile: (content: string, defaultFilename: string) =>
        ipcRenderer.invoke('export:saveHtml', { content, defaultFilename }),
    openImportFile: (format: 'json' | 'ini') => ipcRenderer.invoke('import:openFile', format),
    openParamFile: () => ipcRenderer.invoke('param:openFile'),
    statParamFile: (filePath: string) => ipcRenderer.invoke('param:statFile', filePath),
    minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximizeWindow: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMaximize'),
    isWindowMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) =>
            callback(isMaximized);
        ipcRenderer.on('window:maximized-changed', handler);
        return () => ipcRenderer.removeListener('window:maximized-changed', handler);
    },
    getUserDataDir: (): Promise<string> => ipcRenderer.invoke('app:getUserDataDir'),
    onFlushStorage: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on('app:flush-storage', handler);
        return () => ipcRenderer.removeListener('app:flush-storage', handler);
    },
    flushStorage: (payloads: { filePath: string; data: unknown }[]) =>
        ipcRenderer.invoke('storage:flush', payloads),
    testDbConnection: (config: DbConnectionConfig): Promise<DbTestConnectionResult> =>
        ipcRenderer.invoke('db:testConnection', config),
    suggestParamOptions: (request: DbSuggestRequest): Promise<DbSuggestResponse> =>
        ipcRenderer.invoke('db:suggest', request),
    queryScriptSql: (request: DbScriptQueryRequest): Promise<DbScriptQueryResponse> =>
        ipcRenderer.invoke('db:query', request),
    reloadSuggestConfig: (): Promise<void> => ipcRenderer.invoke('db:reloadConfig'),
});
