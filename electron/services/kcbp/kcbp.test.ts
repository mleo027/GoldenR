import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
    app: {
        isPackaged: false,
        getPath: vi.fn(),
    },
}));

import { KcbpClient, normalizeResultSets } from './kcbp';

describe('normalizeResultSets', () => {
    it('normalizes structured items filling default name and dropping columns', () => {
        expect(
            normalizeResultSets([
                { name: '持仓', columns: ['fundid'], rows: [{ fundid: '6001' }] },
                { rows: [{}] },
            ]),
        ).toEqual([
            { name: '持仓', rows: [{ fundid: '6001' }] },
            { name: '', rows: [{}] },
        ]);
    });

    it('wraps flat rows into a single set', () => {
        expect(normalizeResultSets([{ custid: '1' }, { custid: '2' }])).toEqual([
            { name: '', rows: [{ custid: '1' }, { custid: '2' }] },
        ]);
    });

    it('wraps mixed structures as a single flat set', () => {
        const mixed = [{ rows: [] }, { custid: '9' }];
        expect(normalizeResultSets(mixed)).toEqual([{ name: '', rows: mixed }]);
    });

    it('returns empty array for empty data', () => {
        expect(normalizeResultSets([])).toEqual([]);
    });
});

function createClient(raw: unknown): KcbpClient {
    return new KcbpClient({
        callKCBP: () => raw,
    } as ConstructorParameters<typeof KcbpClient>[0]);
}

describe('KcbpClient response normalization', () => {
    it('keeps valid response rows in data', async () => {
        const client = createClient({
            code: '0',
            msg: 'ok',
            data: [{ custid: '1' }],
        });

        const result = await client.call({ connection: {}, param: {} });

        expect(result).toMatchObject({
            code: '0',
            msg: 'ok',
            // 平铺行被归一化为单个结果集
            data: [{ name: '', rows: [{ custid: '1' }] }],
            stats: { rows: 1 },
        });
    });

    it('counts rows across multiple result sets without flattening their shape', async () => {
        const client = createClient({
            code: '0',
            msg: 'ok',
            data: [
                { name: 'DATA', columns: ['id'], rows: [{ id: '1' }, { id: '2' }] },
                { name: 'DETAIL', columns: ['value'], rows: [{ value: 'a' }] },
            ],
        });

        const result = await client.call({ connection: {}, param: {} });

        expect(result.data).toEqual([
            { name: 'DATA', rows: [{ id: '1' }, { id: '2' }] },
            { name: 'DETAIL', rows: [{ value: 'a' }] },
        ]);
        expect(result.stats.rows).toBe(3);
    });

    it('counts empty result sets without dropping them', async () => {
        const client = createClient({
            code: '0',
            msg: 'ok',
            data: [{ name: 'EMPTY', rows: [] }],
        });

        const result = await client.call({ connection: {}, param: {} });

        expect(result.data).toEqual([{ name: 'EMPTY', rows: [] }]);
        expect(result.stats.rows).toBe(0);
    });

    it('keeps raw response envelope fields at top level with empty data', async () => {
        const client = createClient({
            code: -1001,
            msg: '调用失败',
            level: '888',
        });

        const result = await client.call({ connection: {}, param: {} });

        expect(result).toMatchObject({
            code: '-1001',
            msg: '调用失败',
            level: '888',
            data: [],
            stats: { rows: 0 },
        });
    });

    it('parses valid JSON string responses', async () => {
        const client = createClient(
            JSON.stringify({
                code: 0,
                msg: 'ok',
                data: [{ custid: '1' }],
            }),
        );

        const result = await client.call({ connection: {}, param: {} });

        expect(result).toMatchObject({
            code: '0',
            msg: 'ok',
            data: [{ name: '', rows: [{ custid: '1' }] }],
            stats: { rows: 1 },
        });
    });

    it('does not synthesize rows from non-array data', async () => {
        const client = createClient({
            code: '0',
            msg: 'ok',
            level: '888',
            data: { custid: '1' },
        });

        const result = await client.call({ connection: {}, param: {} });

        expect(result).toMatchObject({
            code: '0',
            msg: 'ok',
            level: '888',
            data: [],
            stats: { rows: 0 },
        });
    });

    it('does not synthesize rows from scalar raw values', async () => {
        const client = createClient('not a response envelope');

        const result = await client.call({ connection: {}, param: {} });

        expect(result).toMatchObject({
            code: '0',
            msg: 'Success',
            data: [],
            stats: { rows: 0 },
        });
    });
});
