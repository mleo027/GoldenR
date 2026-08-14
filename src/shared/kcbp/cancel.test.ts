import { describe, expect, it } from 'vitest';
import {
    KCBP_CANCELLED_MESSAGE,
    KCBP_IPC_CANCELLED_RESULT,
    isKcbpCancelled,
    isKcbpIpcCancelledResult,
} from './cancel';

describe('kcbp cancel helpers', () => {
    it('detects ipc cancelled marker', () => {
        expect(isKcbpIpcCancelledResult(KCBP_IPC_CANCELLED_RESULT)).toBe(true);
        expect(isKcbpIpcCancelledResult({ code: '-1', msg: 'x', data: [] })).toBe(false);
    });

    it('detects cancelled error message', () => {
        expect(isKcbpCancelled(new Error(KCBP_CANCELLED_MESSAGE))).toBe(true);
        expect(isKcbpCancelled(new Error('timeout'))).toBe(false);
    });
});
