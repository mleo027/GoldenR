import { describe, expect, it } from 'vitest';
import { amountEqual, formatAmount, isValidStkCode, parseMarket } from './builtin';

describe('builtin lib', () => {
    it('formatAmount', () => {
        expect(formatAmount(1.234, 2)).toBe('1.23');
    });

    it('amountEqual with precision', () => {
        expect(amountEqual('1.001', '1.002', 2)).toBe(true);
    });

    it('isValidStkCode', () => {
        expect(isValidStkCode('600000')).toBe(true);
        expect(isValidStkCode('abc')).toBe(false);
    });

    it('parseMarket', () => {
        expect(parseMarket('600000')).toBe('1');
        expect(parseMarket('000001')).toBe('0');
    });
});
