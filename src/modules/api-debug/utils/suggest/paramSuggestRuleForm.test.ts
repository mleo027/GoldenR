import { describe, expect, it } from 'vitest';
import {
    bindingsToRecord,
    formValuesToRule,
    normalizeBindingRows,
    resolveRuleFormValues,
} from './paramSuggestRuleForm';

describe('normalizeBindingRows', () => {
    it('returns empty array for non-array values', () => {
        expect(normalizeBindingRows(undefined)).toEqual([]);
        expect(normalizeBindingRows(null)).toEqual([]);
        expect(normalizeBindingRows({ placeholder: 'custid' })).toEqual([]);
    });

    it('filters invalid rows', () => {
        expect(
            normalizeBindingRows([{ placeholder: 'custid', mode: 'auto' }, { mode: 'auto' }, null]),
        ).toEqual([{ placeholder: 'custid', mode: 'auto' }]);
    });
});

describe('bindingsToRecord', () => {
    it('handles non-array input without throwing', () => {
        expect(bindingsToRecord(undefined)).toBeUndefined();
        expect(
            bindingsToRecord({ placeholder: 'custid', mode: 'param', paramName: 'custid' }),
        ).toBe(undefined);
    });
});

describe('resolveRuleFormValues', () => {
    it('rebuilds bindings from sql when validateFields returns invalid bindings', () => {
        const resolved = resolveRuleFormValues(
            {
                field: 'operid',
                sql: 'select operid as value from t where custid = @custid',
            },
            undefined,
        );

        expect(resolved.bindings).toEqual([
            { placeholder: 'custid', mode: 'auto', optional: false },
        ]);
        expect(() => formValuesToRule(resolved)).not.toThrow();
    });
});
