import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    testDbConnection: vi.fn(async () => ({ ok: true })),
    executeSuggest: vi.fn(async () => ({ options: [] })),
    executeScriptQuery: vi.fn(async () => ({ rows: [], columns: [] })),
    reloadSuggestConfig: vi.fn(async () => undefined),
}));

vi.mock('electron', () => ({
    ipcMain: {
        handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
            mock.handlers.set(channel, handler);
        },
    },
}));

vi.mock('../suggestRuleEngine', () => ({
    testDbConnection: mock.testDbConnection,
    executeSuggest: mock.executeSuggest,
    executeScriptQuery: mock.executeScriptQuery,
    reloadSuggestConfig: mock.reloadSuggestConfig,
}));

import { registerSuggestIpc } from './suggest';

async function invoke(channel: string, ...args: unknown[]) {
    const handler = mock.handlers.get(channel);
    if (!handler) throw new Error(`Missing handler ${channel}`);
    return handler({}, ...args);
}

describe('suggest IPC handlers', () => {
    beforeEach(() => {
        mock.handlers.clear();
        mock.testDbConnection.mockClear();
        mock.executeSuggest.mockClear();
        mock.executeScriptQuery.mockClear();
        mock.reloadSuggestConfig.mockClear();
        registerSuggestIpc();
    });

    it('tests database connections and runs suggest requests', async () => {
        const connection = { server: '127.0.0.1', database: 'db', user: 'sa', password: 'x' };
        expect(await invoke('db:testConnection', connection)).toEqual({ ok: true });
        expect(mock.testDbConnection).toHaveBeenCalledWith(connection);

        await invoke('db:suggest', { field: 'bsflag', contextParams: {} });
        expect(mock.executeSuggest).toHaveBeenCalledTimes(1);
    });

    it('validates suggest and SQL payloads', async () => {
        await expect(invoke('db:suggest', {})).rejects.toThrow();
        await expect(invoke('db:query', {})).rejects.toThrow();
    });

    it('reloads suggest config', async () => {
        await invoke('db:reloadConfig');
        expect(mock.reloadSuggestConfig).toHaveBeenCalledTimes(1);
    });
});
