import { ipcMain } from 'electron';
import type {
    AutomationFolderRunReport,
    AutomationRunReport,
    AutomationSqlExecuteRequest,
    AutomationWorkspace,
} from '../../src/shared/automation/types';
import { validateAutomationWriteSql } from '../../src/shared/automation/sqlPolicy';
import type { DbConnectionConfig } from '../../src/shared/suggest/types';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { cancelAutomationSql, executeAutomationSql } from '../services/suggest/mssqlClient';
import { withIpcError } from './errors';
import type { ElectronAppContext } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWorkspace(value: unknown): value is AutomationWorkspace {
    return (
        isRecord(value) &&
        Array.isArray(value.projects) &&
        Array.isArray(value.folders) &&
        Array.isArray(value.scenarios)
    );
}

function hasValidSqlParams(value: unknown): boolean {
    return (
        value === undefined ||
        (isRecord(value) &&
            Object.values(value).every(
                (item) =>
                    item === null ||
                    typeof item === 'string' ||
                    typeof item === 'number' ||
                    typeof item === 'boolean',
            ))
    );
}

function resolveWritableDatabase(ctx: ElectronAppContext, environmentId: string) {
    const environment = ctx.configRepository.readApiDebugEnvironment(environmentId);
    if (!environment) throw invalidIpcArgument('自动化环境不存在');
    if (environment.environmentType === 'production') {
        throw invalidIpcArgument('生产环境禁止自动化写库');
    }
    if (environment.allowAutomationSqlWrite !== true) {
        throw invalidIpcArgument('当前环境未授权自动化写库');
    }
    const database = environment.database;
    if (!isRecord(database) || !database.server || !database.database || !database.user) {
        throw invalidIpcArgument('当前环境数据库配置不完整');
    }
    return database as unknown as DbConnectionConfig;
}

export function registerAutomationIpc(ctx: ElectronAppContext): void {
    ipcMain.handle(
        'automation:load',
        withIpcError(() => ctx.automationRepository.load()),
    );
    ipcMain.handle(
        'automation:saveWorkspace',
        withIpcError((_event, value: unknown) => {
            if (!isWorkspace(value)) throw invalidIpcArgument('Invalid automation workspace');
            ctx.automationRepository.saveWorkspace(value);
        }),
    );
    ipcMain.handle(
        'automation:saveScenarioReport',
        withIpcError((_event, value: AutomationRunReport) => {
            if (!isRecord(value) || typeof value.scenarioId !== 'string') {
                throw invalidIpcArgument('Invalid automation scenario report');
            }
            ctx.automationRepository.saveScenarioReport(value);
        }),
    );
    ipcMain.handle(
        'automation:saveFolderReport',
        withIpcError((_event, value: AutomationFolderRunReport) => {
            if (!isRecord(value) || typeof value.folderId !== 'string') {
                throw invalidIpcArgument('Invalid automation folder report');
            }
            ctx.automationRepository.saveFolderReport(value);
        }),
    );
    ipcMain.handle(
        'automation:sqlExecute',
        withIpcError(async (_event, request: AutomationSqlExecuteRequest) => {
            if (
                !isRecord(request) ||
                typeof request.requestId !== 'string' ||
                typeof request.environmentId !== 'string' ||
                typeof request.sql !== 'string' ||
                !hasValidSqlParams(request.params)
            ) {
                throw invalidIpcArgument('Invalid automation SQL request');
            }
            const validation = validateAutomationWriteSql(request.sql);
            if (!validation.ok) throw invalidIpcArgument(validation.reason);
            const database = resolveWritableDatabase(ctx, request.environmentId);
            return executeAutomationSql(
                database,
                request.requestId,
                request.sql,
                request.params ?? {},
            );
        }),
    );
    ipcMain.handle(
        'automation:sqlCancel',
        withIpcError((_event, requestId: string) => {
            if (typeof requestId !== 'string') throw invalidIpcArgument('Invalid request id');
            return cancelAutomationSql(requestId);
        }),
    );
}
