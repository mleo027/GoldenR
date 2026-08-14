import { describe, expect, it, vi } from 'vitest';
import type { ScriptTestApi, ScriptTestResult } from '../types';
import { createAssertApi, createNoopAssertApi } from './createAssertApi';

function createTestApi() {
    const expectFn = vi.fn();
    return {
        expectFn,
        test: {
            expect: expectFn,
            step: vi.fn(),
            fail: vi.fn((): never => {
                throw new Error('fail');
            }),
            pass: vi.fn(
                (message = 'pass'): ScriptTestResult => ({
                    passed: true,
                    message,
                    steps: [],
                }),
            ),
            result: { passed: false, message: '', steps: [] },
        } as ScriptTestApi,
    };
}

describe('createAssertApi', () => {
    it('checks equality, response code, and SQL rows', async () => {
        const { expectFn, test } = createTestApi();
        const queryFn = vi.fn().mockResolvedValue([{ id: 1 }]);
        const assert = createAssertApi(test, queryFn);

        assert.eq(1, 1, 'same');
        assert.ok({ code: '0', message: 'ok', data: [] }, 'business');
        await assert.sqlExists('select 1', undefined, 'row exists');

        expect(expectFn).toHaveBeenCalledTimes(3);
        expect(queryFn).toHaveBeenCalledWith('select 1', undefined);
    });

    it('reconciles mapped fields and checks amount delta', () => {
        const { expectFn, test } = createTestApi();
        const assert = createAssertApi(test, vi.fn());

        assert.reconcile(
            { custid: '1', amount: '10.00' },
            { custid: '1', amount: '10.00' },
            { custid: 'custid', amount: 'amount' },
            'mismatch',
        );
        assert.amountDelta('10', '10', '0', 'delta', 2);

        expect(expectFn).toHaveBeenCalledTimes(3);
    });

    it('noop assert throws outside TCD mode', async () => {
        const assert = createNoopAssertApi();
        expect(() => assert.eq(1, 1, 'x')).toThrow('assert 仅在 TCD 模式下可用');
        await expect(assert.sqlExists('select 1', undefined, 'x')).rejects.toThrow(
            'assert 仅在 TCD 模式下可用',
        );
    });
});
