import type { KcxpEnvironment } from '@/shared/kcxp/types';
import type {
    TcdCallStep,
    TcdScriptConsoleSnapshot,
    TcdScriptTestResult,
    TcdStepResponse,
} from '@/shared/tcd/types';

export type ScriptTestStepStatus = 'pass' | 'fail';

export interface ScriptTestStep {
    name: string;
    status: ScriptTestStepStatus;
    message: string;
}

export interface ScriptTestResult {
    passed: boolean;
    message: string;
    steps: ScriptTestStep[];
}

export interface ScriptTestApi {
    /** 标记当前测试步骤 */
    step(name: string): void;
    /** 断言，失败则中断并标记测试失败 */
    expect(condition: boolean, message: string): void;
    /** 显式失败 */
    fail(message: string): never;
    /** 显式通过，建议作为 main 的返回值 */
    pass(message?: string): ScriptTestResult;
    /** 当前累计结果（只读） */
    readonly result: ScriptTestResult;
}

export type CaseScriptQueryFn = (
    sql: string,
    params?: Record<string, string | number>,
) => Promise<Record<string, unknown>[]>;

export type TestVariableValue =
    | string
    | number
    | boolean
    | null
    | Record<string, unknown>
    | unknown[];

export type TestVariableMap = Record<string, TestVariableValue>;

/** test.env.json 中的测试环境（KCXP + 环境变量） */
export interface TestEnvironment extends KcxpEnvironment {
    /** dev | test | uat | staging | prod */
    envType?: string;
    enabled?: boolean;
    variables?: TestVariableMap;
    dbProfileId?: string;
}

export interface TestGlobalConfig {
    variables?: TestVariableMap;
}

export interface TestSuiteHooks {
    beforeSuite?: string[];
    afterSuite?: string[];
    beforeCase?: string[];
    afterCase?: string[];
}

export interface TestRunContext {
    globalVariables?: TestVariableMap;
    environmentVariables?: TestVariableMap;
    suiteVariables?: TestVariableMap;
    caseVariables?: TestVariableMap;
    environmentId?: string;
    suiteName?: string;
}

export interface TcdRunHistoryEntry {
    id: string;
    ranAt: number;
    environmentId?: string;
    suiteName?: string;
    passedCount: number;
    failedCount: number;
    durationMs: number;
    cancelled: boolean;
    configSnapshot?: Record<string, unknown>;
    results: Array<{
        caseId: string;
        caseName: string;
        msgtype: string;
        address?: string;
        passed: boolean;
        durationMs: number;
        error?: string;
        response?: TcdStepResponse;
        callSteps?: TcdCallStep[];
        scriptTest?: TcdScriptTestResult;
        scriptConsole?: TcdScriptConsoleSnapshot;
    }>;
}

export interface TcdRunHistoryIndex {
    runs: TcdRunHistoryEntry[];
}
