import { describe, expect, it } from 'vitest';
import { createScriptConsole } from './scriptConsole';
import { createScriptTest, isScriptTestResult, ScriptTestFailure } from './scriptTest';

describe('createScriptTest', () => {
    it('records pass steps and returns result', () => {
        const capture = createScriptConsole();
        const test = createScriptTest(capture);

        test.step('预检');
        test.expect(true, '客户存在');
        const result = test.pass('全部通过');

        expect(isScriptTestResult(result)).toBe(true);
        expect(result.passed).toBe(true);
        expect(result.steps).toHaveLength(1);
        expect(capture.snapshot().entries.some((entry) => entry.level === 'pass')).toBe(true);
    });

    it('throws ScriptTestFailure when expect fails', () => {
        const capture = createScriptConsole();
        const test = createScriptTest(capture);

        test.step('断言');
        expect(() => test.expect(false, '条件不满足')).toThrow(ScriptTestFailure);
        expect(capture.snapshot().entries.some((entry) => entry.level === 'fail')).toBe(true);
    });
});

describe('isScriptTestResult', () => {
    it('detects test result objects', () => {
        expect(
            isScriptTestResult({
                passed: true,
                message: 'ok',
                steps: [],
            }),
        ).toBe(true);
        expect(isScriptTestResult({ passed: true })).toBe(false);
    });
});
