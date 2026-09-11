import { requireElectronAPI } from '@/lib/electron';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbScriptQueryResponse,
    DbSuggestRequest,
    DbSuggestResponse,
    DbTestConnectionResult,
} from '@/shared/suggest/types';

export interface SuggestRuntime {
    testConnection(config: DbConnectionConfig): Promise<DbTestConnectionResult>;
    suggest(request: DbSuggestRequest): Promise<DbSuggestResponse>;
    queryScript(request: DbScriptQueryRequest): Promise<DbScriptQueryResponse>;
    reloadConfig(): Promise<void>;
}

export const suggestRuntime: SuggestRuntime = {
    testConnection: (config) => requireElectronAPI().database.testConnection(config),
    suggest: (request) => requireElectronAPI().database.suggest(request),
    queryScript: (request) => requireElectronAPI().database.queryScript(request),
    reloadConfig: () => requireElectronAPI().database.reloadSuggestConfig(),
};
