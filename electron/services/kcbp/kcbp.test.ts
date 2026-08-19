import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
    app: {
        isPackaged: false,
        getPath: vi.fn(),
    },
}));

import { KcbpClient } from './kcbp';

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
            data: [{ custid: '1' }],
            stats: { rows: 1 },
        });
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
            data: [{ custid: '1' }],
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
