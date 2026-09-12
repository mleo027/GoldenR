import { describe, expect, it } from 'vitest';
import { defaultScenarioInputs, validateScenarioInputs } from './scenarioInputs';

const metadata = {
    inputs: {
        custid: { type: 'string' as const, label: '客户号', required: true },
        amount: { type: 'number' as const, label: '金额', min: 0, max: 100 },
        enabled: { type: 'boolean' as const, default: true },
        market: {
            type: 'select' as const,
            options: [{ label: '上海', value: '1' }],
        },
    },
};

describe('scenario inputs', () => {
    it('builds defaults and converts values', () => {
        expect(defaultScenarioInputs(metadata)).toEqual({
            custid: '',
            amount: '',
            enabled: true,
            market: '',
        });
        expect(
            validateScenarioInputs(metadata, {
                custid: '1001',
                amount: '12.5',
                enabled: false,
                market: '1',
            }),
        ).toEqual({ custid: '1001', amount: 12.5, enabled: false, market: '1' });
    });

    it('rejects missing, out-of-range and invalid select values', () => {
        expect(() => validateScenarioInputs(metadata, {})).toThrow('客户号为必填项');
        expect(() => validateScenarioInputs(metadata, { custid: '1', amount: 101 })).toThrow(
            '金额不能大于 100',
        );
        expect(() => validateScenarioInputs(metadata, { custid: '1', market: '2' })).toThrow(
            '不在可选范围内',
        );
    });
});
