import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParamFieldRule } from '../../../src/shared/suggest/types';

const mocks = vi.hoisted(() => ({
    executeSelect: vi.fn(),
    testConnection: vi.fn(),
}));

vi.mock('./mssqlClient', () => mocks);

import { executeSuggest, reloadSuggestConfig, setSuggestAppRootDir } from './suggestRuleEngine';

let tempDir: string | undefined;

async function setupRules(rules: ParamFieldRule[]): Promise<void> {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'golden-suggest-'));
    setSuggestAppRootDir(tempDir);
    await writeFile(
        path.join(tempDir, 'db.json'),
        JSON.stringify({
            server: '127.0.0.1',
            port: 1433,
            database: 'kcbp',
            user: 'sa',
            password: 'secret',
        }),
        'utf8',
    );
    await writeFile(
        path.join(tempDir, 'param-suggest-rules.json'),
        JSON.stringify({ rules }),
        'utf8',
    );
    await reloadSuggestConfig();
}

afterEach(async () => {
    mocks.executeSelect.mockReset();
    mocks.testConnection.mockReset();
    if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
        tempDir = undefined;
    }
});

describe('suggestRuleEngine', () => {
    it('returns pending dependencies before executing SQL', async () => {
        await setupRules([]);

        const response = await executeSuggest({
            field: 'bsflag',
            contextParams: {},
            ruleOverride: {
                id: 'rule-1',
                field: 'bsflag',
                type: 'select',
                datasource: {
                    type: 'sql',
                    db: 'mssql',
                    sql: 'select value from bsflag where market = @market',
                },
            },
        });

        expect(response.pendingDeps).toEqual(['market']);
        expect(response.executedSql).toBe('select value from bsflag where market = @market');
        expect(mocks.executeSelect).not.toHaveBeenCalled();
    });

    it('strips optional placeholders that have no value and executes the query', async () => {
        await setupRules([]);
        mocks.executeSelect.mockResolvedValue({
            rows: [{ value: 'A', remark: 'Alpha' }],
        });

        const response = await executeSuggest({
            field: 'bsflag',
            contextParams: {},
            ruleOverride: {
                id: 'rule-1',
                field: 'bsflag',
                type: 'select',
                datasource: {
                    type: 'sql',
                    db: 'mssql',
                    sql: 'select value from bsflag where market = @market?',
                },
            },
        });

        expect(mocks.executeSelect).toHaveBeenCalledTimes(1);
        expect(mocks.executeSelect.mock.calls[0][0]).toMatchObject({ database: 'kcbp' });
        expect(mocks.executeSelect.mock.calls[0][1]).toBe('select value from bsflag');
        expect(response.options).toEqual([{ value: 'A', label: 'A-Alpha' }]);
        expect(response.executedSql).toBe('select value from bsflag');
    });

    it('returns validation errors with the original SQL', async () => {
        await setupRules([]);

        const response = await executeSuggest({
            field: 'bsflag',
            contextParams: {},
            ruleOverride: {
                id: 'rule-1',
                field: 'bsflag',
                type: 'select',
                datasource: {
                    type: 'sql',
                    db: 'mssql',
                    sql: 'delete from bsflag',
                },
            },
        });

        expect(response.options).toEqual([]);
        expect(response.error).toBeTruthy();
        expect(response.executedSql).toBe('delete from bsflag');
        expect(mocks.executeSelect).not.toHaveBeenCalled();
    });

    it('reports mapping failures when rows do not contain a value column', async () => {
        await setupRules([]);
        mocks.executeSelect.mockResolvedValue({
            rows: [{ code: 'A' }],
        });

        const response = await executeSuggest({
            field: 'bsflag',
            contextParams: {},
            ruleOverride: {
                id: 'rule-1',
                field: 'bsflag',
                type: 'select',
                datasource: {
                    type: 'sql',
                    db: 'mssql',
                    sql: 'select code from bsflag',
                },
            },
        });

        expect(response.options).toEqual([]);
        expect(response.error).toContain('value');
    });

    it('serves repeated queries from cache', async () => {
        await setupRules([
            {
                id: 'rule-1',
                field: 'bsflag',
                type: 'select',
                datasource: {
                    type: 'sql',
                    db: 'mssql',
                    sql: 'select value from bsflag',
                    cache: { enabled: true, ttlSeconds: 60 },
                },
            },
        ]);
        mocks.executeSelect.mockResolvedValue({
            rows: [{ value: 'A' }],
        });

        const first = await executeSuggest({
            field: 'bsflag',
            contextParams: {},
            keyword: 'a',
        });
        const second = await executeSuggest({
            field: 'bsflag',
            contextParams: {},
            keyword: 'a',
        });

        expect(first.options).toEqual([{ value: 'A', label: 'A' }]);
        expect(second.options).toEqual([{ value: 'A', label: 'A' }]);
        expect(second.fromCache).toBe(true);
        expect(mocks.executeSelect).toHaveBeenCalledTimes(1);
    });
});
