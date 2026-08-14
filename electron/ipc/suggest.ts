import { ipcMain } from 'electron';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbSuggestRequest,
} from '../../src/shared/suggest/types';
import {
    executeScriptQuery,
    executeSuggest,
    reloadSuggestConfig,
    testDbConnection,
} from '../suggestRuleEngine';

export function registerSuggestIpc(): void {
    ipcMain.handle('db:testConnection', async (_event, config: DbConnectionConfig) => {
        return testDbConnection(config);
    });

    ipcMain.handle('db:suggest', async (_event, request: DbSuggestRequest) => {
        return executeSuggest(request);
    });

    ipcMain.handle('db:query', async (_event, request: DbScriptQueryRequest) => {
        return executeScriptQuery(request);
    });

    ipcMain.handle('db:reloadConfig', async () => {
        await reloadSuggestConfig();
    });
}
