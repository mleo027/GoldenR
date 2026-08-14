import type { KcbpRequestOptions, KcbpResponseData } from './kcbp';
import type { KcbpPickPathResult, KcbpRuntimeConfig } from '../shared/kcbp/types';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbScriptQueryResponse,
    DbSuggestRequest,
    DbSuggestResponse,
    DbTestConnectionResult,
} from '../shared/suggest/types';

export type ImportFileFormat = 'json' | 'ini';

export type ImportFileResult =
    | { opened: false }
    | { opened: true; format: 'json'; data: unknown; filePath: string }
    | { opened: true; format: 'ini'; content: string; filePath: string };

export type ParamFileOpenResult =
    | { opened: false }
    | { opened: true; filePath: string; size: number };

export type ParamFileStatResult = { exists: true; size: number } | { exists: false; error: string };

export type SaveFileResult =
    | { saved: true; filePath: string }
    | { saved: false; filePath?: string; error?: string };

export interface ElectronAPI {
    readJsonFile: (filePath: string, fromUserData?: boolean) => Promise<unknown>;
    writeJsonFile: (filePath: string, data: unknown) => Promise<void>;
    callKcbp: (payload: KcbpRequestOptions) => Promise<KcbpResponseData>;
    cancelKcbp: () => Promise<boolean>;
    kcbpRuntime: {
        getConfig: () => Promise<KcbpRuntimeConfig>;
        saveConfig: (config: KcbpRuntimeConfig) => Promise<KcbpRuntimeConfig>;
        pickDirectory: (defaultPath?: string) => Promise<KcbpPickPathResult>;
        pickFile: (defaultPath?: string) => Promise<KcbpPickPathResult>;
    };
    saveCsvFile: (content: string, defaultFilename: string) => Promise<SaveFileResult>;
    saveHtmlFile: (content: string, defaultFilename: string) => Promise<SaveFileResult>;
    openImportFile: (format: ImportFileFormat) => Promise<ImportFileResult>;
    openParamFile: () => Promise<ParamFileOpenResult>;
    statParamFile: (filePath: string) => Promise<ParamFileStatResult>;
    minimizeWindow: () => Promise<void>;
    toggleMaximizeWindow: () => Promise<boolean>;
    isWindowMaximized: () => Promise<boolean>;
    onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
    getUserDataDir: () => Promise<string>;
    onFlushStorage: (callback: () => void) => () => void;
    flushStorage: (payloads: { filePath: string; data: unknown }[]) => Promise<void>;
    testDbConnection: (config: DbConnectionConfig) => Promise<DbTestConnectionResult>;
    suggestParamOptions: (request: DbSuggestRequest) => Promise<DbSuggestResponse>;
    queryScriptSql: (request: DbScriptQueryRequest) => Promise<DbScriptQueryResponse>;
    reloadSuggestConfig: () => Promise<void>;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export {};
