import type { ScriptTestApi, ScriptTestResult, ScriptTestStep } from '../../types/scriptTest';
import type { ScriptConsoleCapture } from './scriptConsole';

export class ScriptTestFailure extends Error {
    readonly result: ScriptTestResult;

    constructor(result: ScriptTestResult) {
        super(result.message);
        this.name = 'ScriptTestFailure';
        this.result = result;
    }
}

export function isScriptTestResult(value: unknown): value is ScriptTestResult {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ScriptTestResult>;
    return (
        typeof candidate.passed === 'boolean' &&
        typeof candidate.message === 'string' &&
        Array.isArray(candidate.steps)
    );
}

export function createScriptTest(consoleCapture: ScriptConsoleCapture): ScriptTestApi {
    const steps: ScriptTestStep[] = [];
    let currentStep = '测试';
    let finished = false;
    let lastResult: ScriptTestResult = {
        passed: false,
        message: '测试未执行',
        steps: [],
    };

    const buildResult = (passed: boolean, message: string): ScriptTestResult => {
        lastResult = {
            passed,
            message,
            steps: [...steps],
        };
        return lastResult;
    };

    const recordStep = (status: ScriptTestStep['status'], message: string) => {
        steps.push({ name: currentStep, status, message });
        consoleCapture.append(status === 'pass' ? 'pass' : 'fail', `[${currentStep}] ${message}`);
    };

    return {
        step(name: string) {
            if (finished) return;
            currentStep = name.trim() || '测试';
            consoleCapture.append('step', `[${currentStep}]`);
        },

        expect(condition: boolean, message: string) {
            if (finished) return;
            if (condition) {
                recordStep('pass', message);
                return;
            }
            finished = true;
            const result = buildResult(false, message);
            recordStep('fail', message);
            throw new ScriptTestFailure(result);
        },

        fail(message: string): never {
            finished = true;
            const result = buildResult(false, message);
            recordStep('fail', message);
            throw new ScriptTestFailure(result);
        },

        pass(message = '测试通过') {
            finished = true;
            const result = buildResult(true, message);
            consoleCapture.append('pass', `[完成] ${message}`);
            return result;
        },

        get result() {
            return lastResult;
        },
    };
}
