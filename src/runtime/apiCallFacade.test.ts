import { beforeEach, describe, expect, it, vi } from 'vitest';

const call = vi.hoisted(() => vi.fn());
const cancel = vi.hoisted(() => vi.fn());

vi.mock('@/lib/electron', () => ({
    getElectronAPI: () => ({ kcbp: { call } }),
    requireElectronAPI: () => ({
        kcbp: {
            call,
            callWithTrace: vi.fn(),
            cancel,
            runtime: {
                getConfig: vi.fn(),
                saveConfig: vi.fn(),
                pickDirectory: vi.fn(),
                pickFile: vi.fn(),
            },
        },
    }),
}));

import { apiCallRuntime } from './apiCallFacade';

describe('apiCallRuntime', () => {
    beforeEach(() => {
        call.mockReset();
        cancel.mockReset();
    });

    it.each(['KCBP', 'KGBP', 'KUAB'] as const)(
        'preserves the %s protocol discriminator',
        async (type) => {
            call.mockResolvedValue({
                code: '0',
                msg: 'ok',
                data: [],
                stats: { timecost: 0, rows: 0 },
            });
            const request = { type, connection: {}, param: {} };

            await apiCallRuntime.call(request);

            expect(call).toHaveBeenCalledWith(request);
        },
    );

    it('reports availability and delegates cancellation', async () => {
        cancel.mockResolvedValue(true);
        expect(apiCallRuntime.isAvailable()).toBe(true);
        await expect(apiCallRuntime.cancel()).resolves.toBe(true);
    });
});
