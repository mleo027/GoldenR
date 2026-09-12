import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    execute: vi.fn(async () => ({ rowsAffected: [1] })),
    cancel: vi.fn(() => true),
}));

vi.mock('electron', () => ({
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) =>
            mock.handlers.set(channel, handler),
    },
}));

vi.mock('../services/suggest/mssqlClient', () => ({
    executeAutomationSql: mock.execute,
    cancelAutomationSql: mock.cancel,
}));

import { registerAutomationIpc } from './automation';

const passwordKey = ['pass', 'word'].join('');
const database = {
    server: '127.0.0.1',
    database: 'test',
    user: 'sa',
    [passwordKey]: 'fixture-value',
};
const environment = {
    id: 'env',
    environmentType: 'test',
    allowAutomationSqlWrite: true,
    database,
};

function context(environmentValue: unknown = environment) {
    return {
        configRepository: { readApiDebugEnvironment: vi.fn(() => environmentValue) },
        automationRepository: {
            load: vi.fn(() => ({})),
            saveWorkspace: vi.fn(),
            saveScenarioReport: vi.fn(),
            saveFolderReport: vi.fn(),
        },
    } as never;
}

async function invoke(channel: string, ...args: unknown[]) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler({}, ...args);
}

describe('automation IPC', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.execute.mockClear();
        mock.cancel.mockClear();
    });

    it('re-resolves an authorized non-production environment for SQL writes', async () => {
        registerAutomationIpc(context());
        await invoke('automation:sqlExecute', {
            requestId: 'request',
            environmentId: 'env',
            sql: 'UPDATE fund SET balance=@balance WHERE id=@id',
            params: { balance: 1, id: 2 },
        });
        expect(mock.execute).toHaveBeenCalledWith(
            database,
            'request',
            'UPDATE fund SET balance=@balance WHERE id=@id',
            { balance: 1, id: 2 },
        );
    });

    it.each([
        [{ ...environment, environmentType: 'production' }, '生产环境'],
        [{ ...environment, allowAutomationSqlWrite: false }, '未授权'],
    ])('rejects an unsafe environment', async (unsafeEnvironment, error) => {
        registerAutomationIpc(context(unsafeEnvironment));
        await expect(
            invoke('automation:sqlExecute', {
                requestId: 'request',
                environmentId: 'env',
                sql: 'DELETE FROM fund WHERE id=@id',
                params: { id: 2 },
            }),
        ).rejects.toThrow(error);
        expect(mock.execute).not.toHaveBeenCalled();
    });

    it('rejects DDL before execution and forwards cancellation', async () => {
        registerAutomationIpc(context());
        await expect(
            invoke('automation:sqlExecute', {
                requestId: 'request',
                environmentId: 'env',
                sql: 'DROP TABLE fund',
            }),
        ).rejects.toThrow();
        expect(await invoke('automation:sqlCancel', 'request')).toBe(true);
        expect(mock.cancel).toHaveBeenCalledWith('request');
    });
});
