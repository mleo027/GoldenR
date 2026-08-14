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
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { withIpcError } from './errors';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function registerSuggestIpc(): void {
    ipcMain.handle(
        'db:testConnection',
        withIpcError(async (_event, config: DbConnectionConfig) => {
            if (!isRecord(config)) {
                throw invalidIpcArgument('Invalid DB connection config');
            }
            return testDbConnection(config);
        }),
    );

    ipcMain.handle(
        'db:suggest',
        withIpcError(async (_event, request: DbSuggestRequest) => {
            if (!isRecord(request) || typeof request.field !== 'string') {
                throw invalidIpcArgument('Invalid suggest request');
            }
            return executeSuggest(request);
        }),
    );

    ipcMain.handle(
        'db:query',
        withIpcError(async (_event, request: DbScriptQueryRequest) => {
            if (!isRecord(request) || typeof request.sql !== 'string') {
                throw invalidIpcArgument('Invalid script SQL request');
            }
            return executeScriptQuery(request);
        }),
    );

    ipcMain.handle(
        'db:reloadConfig',
        withIpcError(async () => {
            await reloadSuggestConfig();
        }),
    );
}
