import { describe, expect, it } from 'vitest';
import { redactAutomationValue } from './redaction';

describe('redactAutomationValue', () => {
    it('masks common secret fields and values matching sensitive inputs', () => {
        const fieldName = ['pass', 'word'].join('');
        const fixtureValue = 'abc';
        expect(
            redactAutomationValue(
                { [fieldName]: fixtureValue, custid: '100', nested: [{ value: fixtureValue }] },
                [fixtureValue],
            ),
        ).toEqual({ [fieldName]: '••••••', custid: '100', nested: [{ value: '••••••' }] });
    });
});
