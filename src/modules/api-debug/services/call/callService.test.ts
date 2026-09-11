import { describe, expect, it, vi } from 'vitest';
import type { KcbpCallOutcome } from '../kcbp/types';

const executeKcbp = vi.hoisted(() => vi.fn());
const executeKgbp = vi.hoisted(() => vi.fn());
const executeKuab = vi.hoisted(() => vi.fn());

vi.mock('./executors', () => ({
    resolveApiCallExecutor: (protocol?: string) =>
        protocol === 'KGBP' ? executeKgbp : protocol === 'KUAB' ? executeKuab : executeKcbp,
}));

import { invokeApiCall } from './callService';

const outcome = {} as KcbpCallOutcome;
const tab = (protocol = 'KCBP') => ({
    address: 'host:1/150501',
    name: 'case',
    params: [],
    protocol,
    script: '',
    requestScript: '',
    responseScript: '',
    runInput: {},
});

describe('invokeApiCall dispatcher', () => {
    it.each([
        ['KCBP', executeKcbp],
        ['KGBP', executeKgbp],
        ['KUAB', executeKuab],
    ] as const)('dispatches %s to its executor', async (protocol, executor) => {
        executor.mockResolvedValueOnce(outcome);
        await invokeApiCall(tab(protocol), 'ui');
        expect(executor).toHaveBeenCalledWith(
            tab(protocol),
            'ui',
            expect.objectContaining({
                runNestedCase: expect.any(Function),
            }),
        );
    });

    it('falls back to KCBP for an unknown protocol', async () => {
        executeKcbp.mockResolvedValueOnce(outcome);
        await invokeApiCall(tab('UNKNOWN'));
        expect(executeKcbp).toHaveBeenCalled();
    });

    it('routes nested TCD cases through the dispatcher', async () => {
        executeKcbp.mockResolvedValueOnce(outcome);
        executeKgbp.mockResolvedValueOnce(outcome);
        await invokeApiCall(tab('KCBP'));
        const nested = executeKcbp.mock.calls.at(-1)?.[2].runNestedCase;
        await nested(tab('KGBP'), {});
        expect(executeKgbp).toHaveBeenCalledWith(tab('KGBP'), 'tcd', expect.any(Object));
    });
});
